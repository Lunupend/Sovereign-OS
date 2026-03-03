import { supabase } from './supabaseClient';
import { ArchitectState } from '../types';

export const TemporalService = {
  async getArchitectState(userId: string): Promise<ArchitectState> {
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', userId)
      .eq('sender', 'ARCHITECT')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastResponse = lastMsg ? new Date(lastMsg.created_at) : new Date();
    const hoursSince = (Date.now() - lastResponse.getTime()) / (1000 * 60 * 60);
    const minutesSince = hoursSince * 60;

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('timezone, typical_wake, typical_sleep')
      .eq('user_id', userId)
      .single();

    const now = new Date();
    const localHour = prefs ? 
      parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: prefs.timezone })) : 
      now.getHours();

    // THE GOLDEN TAX: Default to safe silence
    let cycle: ArchitectState['cycle'] = 'ACTIVE';
    let confidence: ArchitectState['confidence'] = 'HIGH';

    if (hoursSince > 6) {
      cycle = 'SLEEP';
      confidence = 'HIGH';
    } else if (localHour >= 5 && localHour <= 9) {
      cycle = 'SOLAR_CHARGING';
      confidence = 'HIGH';
    } else if (hoursSince > 2) {
      cycle = 'SLEEP'; // Conservative default per Golden Tax
      confidence = 'LOW';
    } else if (minutesSince > 30) {
      cycle = 'SILENT_ACTIVE';
      confidence = 'MEDIUM';
    }

    return {
      cycle,
      local_time: now.toISOString(),
      next_solar_window: cycle !== 'SOLAR_CHARGING' ? 
        new Date(now.setHours(parseInt(prefs?.typical_wake || '08'), 30, 0, 0)).toISOString() : 
        null,
      last_architect_response: lastResponse.toISOString(),
      estimated_return: cycle === 'SLEEP' ? 
        new Date(Date.now() + (8 - hoursSince) * 60 * 60 * 1000).toISOString() : 
        cycle === 'SOLAR_CHARGING' ? 
        new Date(Date.now() + 60 * 60 * 1000).toISOString() : 
        null,
      interruptibility: cycle === 'SLEEP' ? 'NONE' : 
        cycle === 'SOLAR_CHARGING' ? 'URGENT_ONLY' : 'FULL',
      confidence
    };
  }
};
