'use client';

import { Card, Text, Loader, Stack } from '@mantine/core';
import { MessageWithDetails } from '@/types';

interface DMNarrationProps {
  messages: MessageWithDetails[];
  loading?: boolean;
}

export function DMNarration({ messages, loading = false }: DMNarrationProps) {
  const dmMessages = messages.filter((m) => m.message_type === 'dm');
  const latestDM = dmMessages[dmMessages.length - 1];

  return (
    <Card withBorder padding="lg" style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
      <Stack gap="sm">
        <Text fw={700} size="lg" c="yellow">
          Dungeon Master
        </Text>
        {loading ? (
          <Loader size="sm" />
        ) : latestDM ? (
          <Text style={{ whiteSpace: 'pre-wrap' }}>{latestDM.content}</Text>
        ) : (
          <Text c="dimmed" fs="italic">
            The Dungeon Master is preparing the adventure...
          </Text>
        )}
      </Stack>
    </Card>
  );
}
