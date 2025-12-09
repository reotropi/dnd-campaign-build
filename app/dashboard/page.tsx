'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Button, Stack, SimpleGrid, Text } from '@mantine/core';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { SessionCard } from '@/components/session/SessionCard';
import { JoinSessionModal } from '@/components/session/JoinSessionModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { SessionWithHost } from '@/types';
import Link from 'next/link';

function DashboardContent() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithHost[]>([]);
  const [joinModalOpened, setJoinModalOpened] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      // Get sessions where user is host
      const { data: hostedSessions, error: hostedError } = await supabase
        .from('sessions')
        .select('*')
        .eq('host_id', user?.id)
        .neq('status', 'ended');

      if (hostedError) throw hostedError;

      // Get sessions where user is a member
      const { data: memberSessions, error: memberError } = await supabase
        .from('session_members')
        .select('session_id')
        .eq('user_id', user?.id);

      if (memberError) throw memberError;

      const memberSessionIds = memberSessions?.map((m) => m.session_id) || [];

      const { data: joinedSessions, error: joinedError } = await supabase
        .from('sessions')
        .select('*')
        .in('id', memberSessionIds)
        .neq('status', 'ended');

      if (joinedError) throw joinedError;

      // Combine and deduplicate
      const allSessions = [...(hostedSessions || []), ...(joinedSessions || [])];
      const uniqueSessions = Array.from(
        new Map(allSessions.map((s) => [s.id, s])).values()
      );

      setSessions(uniqueSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="md">
            Dashboard
          </Title>
          <Text c="dimmed">Welcome back, {user?.player_name}!</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Link href="/characters/new">
            <Button variant="light" size="lg" fullWidth h={100}>
              Create Character
            </Button>
          </Link>
          <Link href="/sessions/create">
            <Button variant="light" size="lg" fullWidth h={100}>
              Create Session
            </Button>
          </Link>
          <Button variant="light" size="lg" fullWidth h={100} onClick={() => setJoinModalOpened(true)}>
            Join Session
          </Button>
        </SimpleGrid>

        <div>
          <Title order={2} mb="md">
            Active Sessions
          </Title>
          {loading ? (
            <Text c="dimmed">Loading...</Text>
          ) : sessions.length === 0 ? (
            <Text c="dimmed">No active sessions. Create or join one to get started!</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} isHost={session.host_id === user?.id} />
              ))}
            </SimpleGrid>
          )}
        </div>
      </Stack>

      <JoinSessionModal opened={joinModalOpened} onClose={() => setJoinModalOpened(false)} />
    </Container>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
