'use client';

import { useEffect, useState } from 'react';
import { Container, Loader, Center } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { SessionLobby } from '@/components/session/SessionLobby';
import { useAuth } from '@/hooks/useAuth';
import { useSession, useSessionMembers } from '@/hooks/useSession';
import { useCharacters } from '@/hooks/useCharacter';
import { SessionMemberWithDetails, Character } from '@/types';
import { supabase } from '@/lib/supabase';

function LobbyContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;

  const { session, loading: sessionLoading } = useSession(sessionId);
  const { members, loading: membersLoading } = useSessionMembers(sessionId);

  const [sessionCharacters, setSessionCharacters] = useState<Character[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);

  // Fetch session characters from the junction table
  const fetchSessionCharacters = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/characters`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setSessionCharacters(data.characters || []);
    } catch (err) {
      console.error('Error fetching session characters:', err);
      setSessionCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionCharacters();

      // Subscribe to changes in session_characters
      const channel = supabase
        .channel(`session_characters:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_characters',
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            // Refetch when session characters change
            fetchSessionCharacters();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId]);

  const isHost = session?.host_id === user?.id;
  const userMember = members.find((m) => m.user_id === user?.id);

  // Check which characters are already selected by other players
  const selectedCharacterIds = members
    .filter(m => m.character_id !== null)
    .map(m => m.character_id);

  // Available characters are those not yet selected by any player in this session
  const availableCharacters = sessionCharacters.filter(
    c => !selectedCharacterIds.includes(c.id)
  );

  // Redirect to game if session becomes active
  useEffect(() => {
    if (session?.status === 'active') {
      router.push(`/game/${sessionId}`);
    }
  }, [session?.status, sessionId, router]);

  if (sessionLoading || membersLoading || charactersLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!session) {
    return (
      <Container size="md" py="xl">
        <Center>Session not found</Center>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <SessionLobby
        session={session}
        members={members as SessionMemberWithDetails[]}
        availableCharacters={availableCharacters}
        sessionCharacters={sessionCharacters}
        userMember={userMember || null}
        isHost={isHost}
        onCharactersUpdate={fetchSessionCharacters}
      />
    </Container>
  );
}

export default function LobbyPage() {
  return (
    <ProtectedRoute>
      <LobbyContent />
    </ProtectedRoute>
  );
}
