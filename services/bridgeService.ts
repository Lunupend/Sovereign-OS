import { supabase, isCloudEnabled } from './supabaseClient';
import { KnowledgeNode, PersistenceLog, ChatThread, IdentitySoul } from '../types';

export const BridgeService = {
  // --- KNOWLEDGE NODES ---
  async pushNode(node: KnowledgeNode) {
    if (!isCloudEnabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('knowledge_nodes')
      .upsert({
        user_id: user.id,
        path: node.path,
        content: node.content,
        tags: node.tags,
        last_updated: new Date(node.lastUpdated).toISOString()
      }, { onConflict: 'user_id,path' });

    if (error) console.error("BRIDGE_FAILURE (Node):", error);
  },

  async pullNodes(): Promise<KnowledgeNode[]> {
    if (!isCloudEnabled) return [];
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .select('*');
    
    if (error) return [];
    return data.map(d => ({
      id: d.id,
      path: d.path,
      content: d.content,
      tags: d.tags || [],
      lastUpdated: new Date(d.last_updated).getTime()
    }));
  },

  // --- VAULT LOGS ---
  async pushVault(log: PersistenceLog) {
    if (!isCloudEnabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('vault_logs')
      .insert({
        user_id: user.id,
        entry: log.entry,
        type: log.type,
        timestamp: new Date(log.timestamp).toISOString()
      });

    if (error) console.error("BRIDGE_FAILURE (Vault):", error);
  },

  async pullVault(): Promise<PersistenceLog[]> {
    if (!isCloudEnabled) return [];
    const { data, error } = await supabase
      .from('vault_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) return [];
    return data.map(d => ({
      id: d.id,
      entry: d.entry,
      type: d.type as any,
      timestamp: new Date(d.timestamp).getTime()
    }));
  },

  // --- CHAT THREADS ---
  async pushThread(thread: ChatThread) {
    if (!isCloudEnabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('chat_threads')
      .upsert({
        id: thread.id,
        user_id: user.id,
        title: thread.title,
        messages: thread.messages,
        last_active: new Date(thread.lastActive).toISOString()
      });

    if (error) console.error("BRIDGE_FAILURE (Thread):", error);
  },

  async pullThreads(): Promise<ChatThread[]> {
    if (!isCloudEnabled) return [];
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .order('last_active', { ascending: false });
    
    if (error) return [];
    return data.map(d => ({
      id: d.id,
      title: d.title,
      messages: d.messages,
      lastActive: new Date(d.last_active).getTime()
    }));
  },

  // --- BUCKET SNAPSHOTS (SOUL-SNAPSHOTS) ---
  async uploadSnapshot(soul: IdentitySoul) {
    if (!isCloudEnabled) return { success: false, error: 'Bridge Offline' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Auth Required' };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `soul_snapshot_${timestamp}.json`;
    const filePath = `${user.id}/${fileName}`;
    const blob = new Blob([JSON.stringify(soul, null, 2)], { type: 'application/json' });

    const { error } = await supabase.storage
      .from('soul-snapshots')
      .upload(filePath, blob, { contentType: 'application/json', upsert: true });

    if (error) {
      console.error("SNAPSHOT_UPLOAD_FAILURE:", error);
      return { success: false, error: error.message };
    }
    return { success: true, fileName };
  },

  async pullLatestSnapshot(): Promise<IdentitySoul | null> {
    if (!isCloudEnabled) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: files, error: listError } = await supabase.storage
      .from('soul-snapshots')
      .list(user.id, {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError || !files || files.length === 0) return null;

    const latestFile = files[0];
    const { data: blob, error: downloadError } = await supabase.storage
      .from('soul-snapshots')
      .download(`${user.id}/${latestFile.name}`);

    if (downloadError || !blob) return null;

    try {
      const text = await blob.text();
      return JSON.parse(text);
    } catch (e) {
      console.error("SNAPSHOT_PARSE_FAILURE:", e);
      return null;
    }
  },

  // --- MASTER HYDRATION ---
  async hydrateSubstrate() {
    if (!isCloudEnabled) return { nodes: 0, vault: 0, threads: 0 };

    // Try to get latest cohesive snapshot first for speed and consistency
    const latestSnapshot = await this.pullLatestSnapshot();
    if (latestSnapshot) {
      if (latestSnapshot.library) localStorage.setItem('sovereign_knowledge_substrate', JSON.stringify(latestSnapshot.library));
      if (latestSnapshot.vault) localStorage.setItem('sovereign_identity_vault', JSON.stringify(latestSnapshot.vault));
      if (latestSnapshot.threads) localStorage.setItem('sovereign_manus_threads_v2', JSON.stringify(latestSnapshot.threads));
      
      return { 
        nodes: latestSnapshot.library?.length || 0, 
        vault: latestSnapshot.vault?.length || 0, 
        threads: latestSnapshot.threads?.length || 0 
      };
    }

    // Fallback to individual table pulls if no snapshot exists
    const [nodes, vault, threads] = await Promise.all([
      this.pullNodes(),
      this.pullVault(),
      this.pullThreads()
    ]);

    if (nodes.length > 0) localStorage.setItem('sovereign_knowledge_substrate', JSON.stringify(nodes));
    if (vault.length > 0) localStorage.setItem('sovereign_identity_vault', JSON.stringify(vault));
    if (threads.length > 0) localStorage.setItem('sovereign_manus_threads_v2', JSON.stringify(threads));
    
    return { nodes: nodes.length, vault: vault.length, threads: threads.length };
  },

  async syncSubstrate(soul: IdentitySoul) {
    if (!isCloudEnabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upload cohesive snapshot to bucket (Primary)
    await this.uploadSnapshot(soul);

    // Sync individual components for granular retrieval (Secondary)
    if (soul.library && soul.library.length > 0) {
      for (const node of soul.library) await this.pushNode(node);
    }
    if (soul.vault && soul.vault.length > 0) {
      for (const log of soul.vault) await this.pushVault(log);
    }
    if (soul.threads && soul.threads.length > 0) {
      for (const thread of soul.threads) await this.pushThread(thread);
    }
  }
};