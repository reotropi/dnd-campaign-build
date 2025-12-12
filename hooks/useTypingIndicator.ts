'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  userId: string;
  characterName: string;
  timestamp: number;
}

export function useTypingIndicator(sessionId: string | null, currentCharacterName: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setTypingUsers([]);
      return;
    }

    // Create a channel for typing indicators
    const channel = supabase.channel(`typing:${sessionId}`, {
      config: {
        broadcast: { self: false }, // Don't receive our own broadcasts
      },
    });

    // Listen for typing broadcasts
    channel.on(
      'broadcast',
      { event: 'typing' },
      (payload: { payload: { userId: string; characterName: string; isTyping: boolean } }) => {
        const { userId, characterName, isTyping } = payload.payload;

        if (isTyping) {
          setTypingUsers((prev) => {
            // Remove existing entry for this user
            const filtered = prev.filter((u) => u.userId !== userId);
            // Add new entry
            return [...filtered, { userId, characterName, timestamp: Date.now() }];
          });
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }
      }
    );

    channel.subscribe((status) => {
      console.log('[useTypingIndicator] Channel status:', status);
    });

    channelRef.current = channel;

    // Cleanup old typing indicators every 5 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => prev.filter((u) => now - u.timestamp < 5000));
    }, 5000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(cleanupInterval);
    };
  }, [sessionId]);

  const broadcastTyping = useCallback(
    async (isTyping: boolean) => {
      if (!sessionId || !currentCharacterName || !channelRef.current) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          characterName: currentCharacterName,
          isTyping,
        },
      });
    },
    [sessionId, currentCharacterName]
  );

  const startTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing
    broadcastTyping(true);

    // Auto-stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  }, [broadcastTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    broadcastTyping(false);
  }, [broadcastTyping]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}
