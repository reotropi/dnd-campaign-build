'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message, MessageWithDetails, RollData } from '@/types';

export function useGameChat(sessionId: string | null) {
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    // Subscribe to new messages
    console.log('[useGameChat] Setting up real-time subscription for session:', sessionId);
    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('[useGameChat] Received real-time message:', payload.new);
          // Fetch the full message with relations
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              profile:profiles(id, player_name),
              character:characters(id, name, class, level, race, armor_class)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[useGameChat] Error fetching message details:', error);
          }

          if (data) {
            console.log('[useGameChat] Adding message to state:', data);
            setMessages((prev) => [...prev, data as MessageWithDetails]);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useGameChat] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchMessages = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      console.log('[useGameChat] Fetching messages for session:', sessionId);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profile:profiles(id, player_name),
          character:characters(id, name, class, level, race, armor_class)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[useGameChat] Error fetching messages:', error);
        throw error;
      }

      console.log('[useGameChat] Fetched messages:', data);
      setMessages(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(
    async (content: string, rollData?: RollData) => {
      if (!sessionId) return;

      try {
        console.log('[useGameChat] Sending user message:', content);
        // Get current user and their character
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get user's character for this session
        const { data: member } = await supabase
          .from('session_members')
          .select('character_id')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single();

        const messageType = rollData ? 'roll' : 'chat';

        const { data, error } = await supabase.from('messages').insert({
          session_id: sessionId,
          user_id: user.id,
          character_id: member?.character_id || null,
          message_type: messageType,
          content,
          roll_data: rollData || null,
        }).select();

        if (error) {
          console.error('[useGameChat] Error inserting user message:', error);
          throw error;
        }

        console.log('[useGameChat] User message inserted:', data);
      } catch (err: any) {
        console.error('Error sending message:', err);
        throw err;
      }
    },
    [sessionId]
  );

  const sendDMMessage = useCallback(
    async (content: string) => {
      if (!sessionId) return;

      try {
        console.log('[useGameChat] Sending DM message:', content);
        // Use API route with admin client to bypass RLS
        const response = await fetch('/api/messages/dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            content,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[useGameChat] DM message API error:', data);
          throw new Error(data.error || 'Failed to send DM message');
        }

        console.log('[useGameChat] DM message sent successfully:', data);
      } catch (err: any) {
        console.error('Error sending DM message:', err);
        throw err;
      }
    },
    [sessionId]
  );

  const sendOOCMessage = useCallback(
    async (content: string) => {
      if (!sessionId) return;

      try {
        console.log('[useGameChat] Sending OOC message:', content);
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase.from('messages').insert({
          session_id: sessionId,
          user_id: user.id,
          character_id: null, // OOC messages don't have a character
          message_type: 'ooc',
          content,
          roll_data: null,
        }).select();

        if (error) {
          console.error('[useGameChat] Error inserting OOC message:', error);
          throw error;
        }

        console.log('[useGameChat] OOC message inserted:', data);
      } catch (err: any) {
        console.error('Error sending OOC message:', err);
        throw err;
      }
    },
    [sessionId]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendDMMessage,
    sendOOCMessage,
    refetch: fetchMessages,
  };
}
