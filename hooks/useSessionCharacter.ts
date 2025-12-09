'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Character } from '@/types';

/**
 * Hook to fetch character with session-specific state (HP, spell slots)
 * This allows the same character to be in multiple sessions with different stats
 */
export function useSessionCharacter(sessionId: string | null, characterId: string | null) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !characterId) {
      setCharacter(null);
      setLoading(false);
      return;
    }

    fetchSessionCharacter();

    // Subscribe to session_characters updates for realtime HP/spell slot changes
    const channel = supabase
      .channel(`session_character:${sessionId}:${characterId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_characters',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          // Refetch to get the merged character data
          await fetchSessionCharacter();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, characterId]);

  const fetchSessionCharacter = async () => {
    if (!sessionId || !characterId) return;

    try {
      setLoading(true);

      // Fetch from session_characters junction table with character data
      const { data: sessionChar, error } = await supabase
        .from('session_characters')
        .select(`
          id,
          current_hp,
          current_spell_slots,
          character:characters (*)
        `)
        .eq('session_id', sessionId)
        .eq('character_id', characterId)
        .single();

      if (error) throw error;

      if (sessionChar && (sessionChar as any).character) {
        const charData = (sessionChar as any).character;
        // Merge session-specific state with character data
        const mergedCharacter: Character = {
          ...charData,
          // Override with session-specific state if available
          current_hp: (sessionChar as any).current_hp !== null
            ? (sessionChar as any).current_hp
            : charData.current_hp,
          spell_slots: Object.keys((sessionChar as any).current_spell_slots || {}).length > 0
            ? (sessionChar as any).current_spell_slots
            : charData.spell_slots,
        };
        setCharacter(mergedCharacter);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching session character:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    character,
    loading,
    error,
    refetch: fetchSessionCharacter,
  };
}
