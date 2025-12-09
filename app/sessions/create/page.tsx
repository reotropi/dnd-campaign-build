'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Card } from '@mantine/core';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CreateSessionForm } from '@/components/session/CreateSessionForm';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Character } from '@/types';

function CreateSessionContent() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCharacters();
    }
  }, [user]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('created_by', user?.id)
        .is('session_id', null) // Characters in the library (not assigned to any session yet)
        .order('name');

      if (error) throw error;

      setCharacters(data || []);
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xl">
        Create Session
      </Title>
      <Card withBorder padding="lg">
        {loading ? 'Loading characters...' : <CreateSessionForm availableCharacters={characters} />}
      </Card>
    </Container>
  );
}

export default function CreateSessionPage() {
  return (
    <ProtectedRoute>
      <CreateSessionContent />
    </ProtectedRoute>
  );
}
