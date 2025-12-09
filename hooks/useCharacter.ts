'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Character } from '@/types';

export function useCharacter(characterId: string | null) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) {
      setCharacter(null);
      setLoading(false);
      return;
    }

    fetchCharacter();

    // Subscribe to character updates
    const channel = supabase
      .channel(`character:${characterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `id=eq.${characterId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCharacter(payload.new as Character);
          } else if (payload.eventType === 'DELETE') {
            setCharacter(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  const fetchCharacter = async () => {
    if (!characterId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (error) throw error;

      setCharacter(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching character:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCharacter = async (updates: Partial<Character>) => {
    if (!characterId) return;

    try {
      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', characterId);

      if (error) throw error;

      // Optimistic update
      setCharacter((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err: any) {
      console.error('Error updating character:', err);
      throw err;
    }
  };

  const updateHP = async (newHP: number) => {
    if (!character) return;

    const clampedHP = Math.max(0, Math.min(newHP, character.max_hp));
    await updateCharacter({ current_hp: clampedHP });
  };

  const updateSpellSlots = async (level: number, slots: number) => {
    if (!character) return;

    const newSlots = {
      ...character.spell_slots,
      [`level_${level}`]: slots,
    };

    await updateCharacter({ spell_slots: newSlots });
  };

  return {
    character,
    loading,
    error,
    updateCharacter,
    updateHP,
    updateSpellSlots,
    refetch: fetchCharacter,
  };
}

export function useCharacters(sessionId: string | null) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setCharacters([]);
      setLoading(false);
      return;
    }

    fetchCharacters();

    // Subscribe to character changes in this session
    const channel = supabase
      .channel(`session_characters:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCharacters((prev) => [...prev, payload.new as Character]);
          } else if (payload.eventType === 'UPDATE') {
            setCharacters((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Character) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setCharacters((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchCharacters = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('session_id', sessionId)
        .order('name');

      if (error) throw error;

      setCharacters(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching characters:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    characters,
    loading,
    error,
    refetch: fetchCharacters,
  };
}
