import { supabase } from './supabaseClient';
import { Commitment, ArchitectState } from '../types';
import { TemporalService } from './temporalService';

export const CommitmentService = {
  async createCommitment(data: Partial<Commitment>): Promise<Commitment> {
    const triggerType = this.classifyTrigger(data.temporal_trigger || 'next ACTIVE');
    
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
  },

  // THE VANGUARD CACHE CLEAR: Move volatile thoughts to Substrate
  async clearVanguardCache(
    userId: string,
    pendingItems: { title: string; description?: string; concern_level?: number }[]
  ): Promise<{ status: string; count: number; commitments: Commitment[] }> {
    const commitments = pendingItems.map(item => ({
      user_id: userId,
      title: item.title,
      description: item.description || 'Cleared from Vanguard cache',
      requested_by: 'MANUS_EI',
      action_owner: 'ARCHITECT',
      status: 'PROPOSED',
      temporal_trigger: 'next ACTIVE',
      temporal_trigger_type: 'STATE_BASED',
      manus_concern_level: item.concern_level || 5,
      completion_criteria: 'Architect acknowledgement and triage',
      cleared_from_cache: true,
      check_count: 0,
      last_checked: new Date().toISOString()
    }));

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
    
    const { data: all, error } = await supabase
      .from('commitments')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'eq', 'COMPLETED')
      .order('manus_concern_level', { ascending: false });

    if (error) throw error;

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
    const { data: commitment, error } = await supabase
      .from('commitments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

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

    await supabase
      .from('commitments')
      .update({
        check_count: (commitment.check_count || 0) + 1,
        last_checked: new Date().toISOString()
      })
      .eq('id', id);

    return {
      commitment,
      state,
      vanguard_advice: vanguardAdvice,
      should_mention: shouldMention
    };
  }
};
