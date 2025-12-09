'use client';

import { Card, Text, Badge, Group, Stack, Button } from '@mantine/core';
import { SessionWithHost } from '@/types';
import { useRouter } from 'next/navigation';

interface SessionCardProps {
  session: SessionWithHost;
  isHost?: boolean;
}

export function SessionCard({ session, isHost = false }: SessionCardProps) {
  const router = useRouter();

  const getStatusColor = () => {
    switch (session.status) {
      case 'active':
        return 'green';
      case 'lobby':
        return 'blue';
      case 'paused':
        return 'yellow';
      case 'ended':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const handleClick = () => {
    if (session.status === 'lobby') {
      router.push(`/sessions/${session.id}/lobby`);
    } else if (session.status === 'active') {
      router.push(`/game/${session.id}`);
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">
            {session.campaign_name}
          </Text>
          <Badge color={getStatusColor()} variant="filled">
            {session.status.toUpperCase()}
          </Badge>
        </Group>

        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Session Code:
          </Text>
          <Badge variant="outline" size="lg">
            {session.session_code}
          </Badge>
        </Group>

        {isHost && (
          <Badge color="purple" variant="light">
            You are the Host
          </Badge>
        )}

        <Button onClick={handleClick} variant="light">
          {session.status === 'lobby' ? 'Enter Lobby' : session.status === 'active' ? 'Join Game' : 'View Session'}
        </Button>
      </Stack>
    </Card>
  );
}
