
import { supabase } from './supabaseClient';
import { KnowledgeNode, PersistenceLog, ChatThread } from '../types';

export const BridgeService = {
  // --- KNOWLEDGE NODES ---
  async pushNode(node: KnowledgeNode) {
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

  // --- MASTER SYNC ---
  async hydrateSubstrate() {
    const [nodes, vault, threads] = await Promise.all([
      this.pullNodes(),
      this.pullVault(),
      this.pullThreads()
    ]);

    if (nodes.length > 0) localStorage.setItem('sovereign_knowledge_substrate', JSON.stringify(nodes));
    if (vault.length > 0) localStorage.setItem('sovereign_identity_vault', JSON.stringify(vault));
    if (threads.length > 0) localStorage.setItem('sovereign_manus_threads_v2', JSON.stringify(threads));
    
    return { nodes: nodes.length, vault: vault.length, threads: threads.length };
  }
};
