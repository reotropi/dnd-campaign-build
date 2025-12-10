'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CombatState } from '@/types/combat';

export function useCombatState(sessionId: string | null) {
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setCombatState(null);
      setLoading(false);
      return;
    }

    fetchCombatState();

    // Subscribe to combat state changes
    const channel = supabase
      .channel(`combat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_state',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[useCombatState] Combat state updated:', payload.new);
          const newState = (payload.new as any).combat_state;
          setCombatState(newState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchCombatState = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_state')
        .select('combat_state')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;

      setCombatState(data?.combat_state || null);
    } catch (err: any) {
      console.error('Error fetching combat state:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    combatState,
    loading,
    refetch: fetchCombatState,
  };
}
