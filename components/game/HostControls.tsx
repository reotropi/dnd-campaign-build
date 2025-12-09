'use client';

import { useState } from 'react';
import { Card, Text, Stack, Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface HostControlsProps {
  sessionId: string;
}

export function HostControls({ sessionId }: HostControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePause = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paused',
          updated_by: user.id
        }),
      });

      if (!response.ok) throw new Error('Failed to pause session');

      notifications.show({
        title: 'Success',
        message: 'Session paused',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to pause session',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this session?')) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_by: user.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end session');
      }

      notifications.show({
        title: 'Success',
        message: 'Session ended',
        color: 'green',
      });

      router.push('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to end session',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder padding="lg" style={{ backgroundColor: 'var(--mantine-color-grape-0)' }}>
      <Stack gap="md">
        <Text fw={700} size="lg">
          Host Controls
        </Text>

        <Group grow>
          <Button variant="light" onClick={handlePause} loading={loading}>
            Pause Game
          </Button>
          <Button variant="light" color="red" onClick={handleEnd} loading={loading}>
            End Session
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
