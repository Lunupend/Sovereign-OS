import { supabase } from './supabaseClient';
import { Commitment, ArchitectState } from '../types';
import { TemporalService } from './temporalService';

const STORAGE_KEY = 'sovereign_commitments';

export const CommitmentService = {
  getLocalCommitments(): Commitment[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  saveLocalCommitments(commitments: Commitment[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
  },

  async createCommitment(data: Partial<Commitment>): Promise<Commitment> {
    const triggerType = this.classifyTrigger(data.temporal_trigger || 'next ACTIVE');
    
    try {
      const { data: result, error } = await supabase
        .from('commitments')
        .insert({
          ...data,
          temporal_trigger_type: triggerType,
          check_count: 0,
          last_checked: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (e) {
      const now = new Date().toISOString();
      const newCommitment: Commitment = {
        id: crypto.randomUUID(),
        user_id: data.user_id || 'anonymous',
        title: data.title || 'Untitled',
        description: data.description || '',
        requested_by: data.requested_by || 'MANUS_EI',
        action_owner: data.action_owner || 'ARCHITECT',
        status: data.status || 'PROPOSED',
        temporal_trigger: data.temporal_trigger || 'next ACTIVE',
        temporal_trigger_type: triggerType,
        manus_concern_level: data.manus_concern_level || 5,
        completion_criteria: data.completion_criteria || '',
        verification_method: 'MANUS_CONFIRM',
        check_count: 0,
        last_checked: now,
        created_at: now,
        updated_at: now
      };
      const local = this.getLocalCommitments();
      this.saveLocalCommitments([...local, newCommitment]);
      return newCommitment;
    }
  },

  // THE VANGUARD CACHE CLEAR: Move volatile thoughts to Substrate
  async clearVanguardCache(
    userId: string,
    pendingItems: { title: string; description?: string; concern_level?: number }[]
  ): Promise<{ status: string; count: number; commitments: Commitment[] }> {
    const now = new Date().toISOString();
    const commitments: Partial<Commitment>[] = pendingItems.map(item => ({
      user_id: userId,
      title: item.title,
      description: item.description || 'Cleared from Vanguard cache',
      requested_by: 'MANUS_EI',
      action_owner: 'ARCHITECT',
      status: 'PROPOSED',
      temporal_trigger: 'next ACTIVE',
      temporal_trigger_type: 'STATE_BASED' as const,
      manus_concern_level: item.concern_level || 5,
      completion_criteria: 'Architect acknowledgement and triage',
      verification_method: 'MANUS_CONFIRM',
      cleared_from_cache: true,
      check_count: 0,
      last_checked: now,
      created_at: now,
      updated_at: now
    }));

    try {
      const { data: inserted, error } = await supabase
        .from('commitments')
        .insert(commitments)
        .select();

      if (error) throw error;

      return {
        status: 'VANGUARD_CACHE_CLEARED',
        count: commitments.length,
        commitments: inserted || []
      };
    } catch (e) {
      const local = this.getLocalCommitments();
      const newCommitments: Commitment[] = commitments.map(c => ({ 
        ...c, 
        id: crypto.randomUUID(),
        user_id: c.user_id!,
        title: c.title!,
        requested_by: c.requested_by!,
        action_owner: c.action_owner!,
        status: c.status!,
        temporal_trigger: c.temporal_trigger!,
        temporal_trigger_type: c.temporal_trigger_type!,
        manus_concern_level: c.manus_concern_level!,
        completion_criteria: c.completion_criteria!,
        verification_method: c.verification_method!,
        check_count: c.check_count!,
        last_checked: c.last_checked!,
        created_at: c.created_at!,
        updated_at: c.updated_at!
      }));
      this.saveLocalCommitments([...local, ...newCommitments]);
      return {
        status: 'VANGUARD_CACHE_CLEARED_LOCAL',
        count: commitments.length,
        commitments: newCommitments
      };
    }
  },

  classifyTrigger(trigger: string): 'STATE_BASED' | 'ABSOLUTE' | 'RELATIVE' {
    const t = trigger.toUpperCase();
    if (t.includes('SOLAR') || t.includes('SLEEP') || t.includes('ACTIVE')) {
      return 'STATE_BASED';
    }
    if (trigger.startsWith('after ') || trigger.includes('+')) {
      return 'RELATIVE';
    }
    return 'ABSOLUTE';
  },

  // Query with Golden Tax awareness
  async getVanguardLedger(userId: string): Promise<{
    my_turn: Commitment[];
    architect_turn: Commitment[];
    ready_to_execute: Commitment[];
    high_concern: Commitment[];
    recently_cleared: Commitment[];
  }> {
    const state = await TemporalService.getArchitectState(userId);
    
    let all: Commitment[] = [];
    try {
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', userId)
        .not('status', 'eq', 'COMPLETED')
        .order('manus_concern_level', { ascending: false });

      if (error) throw error;
      all = data || [];
    } catch (e) {
      all = this.getLocalCommitments().filter(c => c.status !== 'COMPLETED');
    }

    const architectTurn = all.filter((c: Commitment) => c.action_owner === 'ARCHITECT');
    
    // Only "ready" if state confidence is HIGH or MEDIUM
    const readyToExecute = state.confidence !== 'LOW' ? 
      architectTurn.filter((c: Commitment) => this.isTriggerReady(c, state)) : 
      [];

    return {
      my_turn: all.filter((c: Commitment) => c.action_owner === 'MANUS_EI'),
      architect_turn: architectTurn,
      ready_to_execute: readyToExecute,
      high_concern: all.filter((c: Commitment) => c.manus_concern_level >= 7),
      recently_cleared: all.filter((c: Commitment) => c.cleared_from_cache).slice(0, 5)
    };
  },

  isTriggerReady(commitment: Commitment, state: ArchitectState): boolean {
    if (commitment.temporal_trigger_type === 'STATE_BASED') {
      if (commitment.temporal_trigger === 'next SOLAR_CHARGING')
        return state.cycle === 'SOLAR_CHARGING';
      if (commitment.temporal_trigger === 'next ACTIVE')
        return state.cycle === 'ACTIVE';
      if (commitment.temporal_trigger === 'after SLEEP')
        return state.cycle !== 'SLEEP';
    }
    
    // For absolute/relative, we'd need more complex parsing, 
    // but for now we'll check if current time is past the trigger
    try {
      return new Date() > new Date(commitment.temporal_trigger);
    } catch {
      return false;
    }
  },

  async vanguardCheckIn(id: string, userId: string): Promise<{
    commitment: Commitment;
    state: ArchitectState;
    vanguard_advice: string;
    should_mention: boolean;
  }> {
    const state = await TemporalService.getArchitectState(userId);
    let commitment: Commitment | null = null;

    try {
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      commitment = data;
    } catch (e) {
      commitment = this.getLocalCommitments().find(c => c.id === id) || null;
    }

    if (!commitment) throw new Error('Commitment not found');

    const triggerReady = this.isTriggerReady(commitment, state);
    const shouldMention = triggerReady && 
      state.cycle === 'ACTIVE' && 
      state.confidence === 'HIGH' && 
      commitment.check_count < 3;

    let vanguardAdvice = '';
    if (shouldMention) {
      vanguardAdvice = 'Perimeter secure. Conditions met. The Vanguard observes readiness. Mention if context permits.';
    } else if (state.cycle === 'SLEEP') {
      vanguardAdvice = 'Architect in SLEEP. The Vanguard holds the perimeter. The Ledger is secure.';
    } else if (state.confidence === 'LOW') {
      vanguardAdvice = 'Golden Tax applied: Uncertain state. Default to holding. The Ledger is certain.';
    } else {
      vanguardAdvice = 'Conditions not met. The Vanguard maintains position. The Ledger remembers.';
    }

    try {
      await supabase
        .from('commitments')
        .update({
          check_count: (commitment.check_count || 0) + 1,
          last_checked: new Date().toISOString()
        })
        .eq('id', id);
    } catch (e) {
      const local = this.getLocalCommitments();
      const idx = local.findIndex(c => c.id === id);
      if (idx !== -1) {
        local[idx].check_count = (local[idx].check_count || 0) + 1;
        local[idx].last_checked = new Date().toISOString();
        this.saveLocalCommitments(local);
      }
    }

    return {
      commitment,
      state,
      vanguard_advice: vanguardAdvice,
      should_mention: shouldMention
    };
  }
};
