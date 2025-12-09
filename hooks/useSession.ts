'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, SessionMember, SessionMemberWithDetails } from '@/types';

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    fetchSession();

    // Subscribe to session updates
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSession(payload.new as Session);
          } else if (payload.eventType === 'DELETE') {
            setSession(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSession = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setSession(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching session:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (updates: Partial<Session>) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      // Optimistic update
      setSession((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err: any) {
      console.error('Error updating session:', err);
      throw err;
    }
  };

  return {
    session,
    loading,
    error,
    updateSession,
    refetch: fetchSession,
  };
}

export function useSessionMembers(sessionId: string | null) {
  const [members, setMembers] = useState<SessionMemberWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    fetchMembers();

    // Subscribe to member changes
    const channel = supabase
      .channel(`session_members:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_members',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Refetch members when changes occur
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchMembers = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('session_members')
        .select(`
          *,
          profile:profiles(*),
          character:characters(id, name, class, level, race, armor_class)
        `)
        .eq('session_id', sessionId);

      if (error) throw error;

      setMembers(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching session members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
  };
}
