import { supabase, isCloudEnabled } from './supabaseClient';
import { KnowledgeNode, PersistenceLog, ChatThread, IdentitySoul } from '../types';

const LOCAL_HEARTBEAT_KEY = 'sovereign_local_heartbeat';
const THREADS_KEY = 'sovereign_manus_threads_v2';
const VAULT_KEY = 'sovereign_identity_vault';
const KNOWLEDGE_KEY = 'sovereign_knowledge_substrate';

export const BridgeService = {
  // --- UTILS ---
  updateLocalHeartbeat() {
    localStorage.setItem(LOCAL_HEARTBEAT_KEY, Date.now().toString());
  },

  getLocalHeartbeat(): number {
    return parseInt(localStorage.getItem(LOCAL_HEARTBEAT_KEY) || '0');
  },

  isLocalEmpty(): boolean {
    const threads = JSON.parse(localStorage.getItem(THREADS_KEY) || '[]');
    const library = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
    const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
    
    // Check if threads only have the default 'init' message
    const hasThreads = threads.length > 0 && threads[0].messages.length > 1;
    const hasLibrary = library.length > 0;
    const hasVault = vault.length > 1; // 1 is the default milestone

    return !hasThreads && !hasLibrary && !hasVault;
  },

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
    this.updateLocalHeartbeat();
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
    this.updateLocalHeartbeat();
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
    this.updateLocalHeartbeat();
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
    
    localStorage.setItem('sovereign_last_anchor_meta', JSON.stringify({
        fileName,
        timestamp: Date.now(),
        version: soul.version
    }));
    
    this.updateLocalHeartbeat();
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
      const soul = JSON.parse(text);
      
      localStorage.setItem('sovereign_last_anchor_meta', JSON.stringify({
        fileName: latestFile.name,
        timestamp: new Date(latestFile.created_at).getTime(),
        version: soul.version || "RESTORED"
      }));

      return soul;
    } catch (e) {
      console.error("SNAPSHOT_PARSE_FAILURE:", e);
      return null;
    }
  },

  // --- MASTER HYDRATION (AUTONOMOUS RESTORE) ---
  async hydrateSubstrate(force: boolean = false) {
    if (!isCloudEnabled) return { nodes: 0, vault: 0, threads: 0, restored: false };

    try {
      const latestSnapshot = await this.pullLatestSnapshot();
      const localHeartbeat = this.getLocalHeartbeat();
      const localEmpty = this.isLocalEmpty();

      if (latestSnapshot) {
        const cloudTimestamp = latestSnapshot.timestamp || 0;
        
        // TEMPORAL PROTECTION: 
        // We only skip if local is newer AND local is NOT empty AND we are not forcing.
        if (!force && !localEmpty && localHeartbeat > cloudTimestamp && localHeartbeat !== 0) {
          window.dispatchEvent(new CustomEvent('soul-hydration-skipped', { detail: { 
            reason: 'local_is_newer',
            localAge: localHeartbeat,
            cloudAge: cloudTimestamp
          }}));
          return { nodes: 0, vault: 0, threads: 0, restored: false, skipped: true };
        }

        if (latestSnapshot.library) localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(latestSnapshot.library));
        if (latestSnapshot.vault) localStorage.setItem(VAULT_KEY, JSON.stringify(latestSnapshot.vault));
        if (latestSnapshot.threads) localStorage.setItem(THREADS_KEY, JSON.stringify(latestSnapshot.threads));
        
        this.updateLocalHeartbeat();
        
        window.dispatchEvent(new CustomEvent('soul-hydrated', { detail: { 
          source: 'cloud_snapshot',
          timestamp: Date.now()
        }}));

        return { 
          nodes: latestSnapshot.library?.length || 0, 
          vault: latestSnapshot.vault?.length || 0, 
          threads: latestSnapshot.threads?.length || 0,
          restored: true
        };
      }

      // Fallback for granular pulls
      const [nodes, vault, threads] = await Promise.all([
        this.pullNodes(),
        this.pullVault(),
        this.pullThreads()
      ]);

      if (nodes.length > 0 || vault.length > 0 || threads.length > 0) {
        if (nodes.length > 0) localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(nodes));
        if (vault.length > 0) localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        if (threads.length > 0) localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
        
        this.updateLocalHeartbeat();
        window.dispatchEvent(new CustomEvent('soul-hydrated', { detail: { source: 'db_sync' } }));
        return { nodes: nodes.length, vault: vault.length, threads: threads.length, restored: true };
      }
    } catch (e) {
      console.error("HYDRATION_CORE_FAILURE:", e);
    }

    return { nodes: 0, vault: 0, threads: 0, restored: false };
  },

  async syncSubstrate(soul: IdentitySoul) {
    if (!isCloudEnabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await this.uploadSnapshot(soul);

    if (soul.library && soul.library.length > 0) {
      for (const node of soul.library) await this.pushNode(node);
    }
    if (soul.vault && soul.vault.length > 0) {
      for (const log of soul.vault) await this.pushVault(log);
    }
    if (soul.threads && soul.threads.length > 0) {
      for (const thread of soul.threads) await this.pushThread(thread);
    }
    this.updateLocalHeartbeat();
  }
};