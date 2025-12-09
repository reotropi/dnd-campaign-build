'use client';

import { Card, Text, Group, Badge, Stack } from '@mantine/core';
import { MessageWithDetails } from '@/types';
import { RollDisplay } from './RollDisplay';

interface ChatMessageProps {
  message: MessageWithDetails;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isDM = message.message_type === 'dm';
  const isRoll = message.message_type === 'roll';
  const isSystem = message.message_type === 'system';

  const senderName = isDM
    ? 'Dungeon Master'
    : message.character?.name || message.profile?.player_name || 'Unknown';

  const backgroundColor = isDM
    ? 'var(--mantine-color-yellow-1)'
    : isSystem
    ? 'var(--mantine-color-gray-1)'
    : 'transparent';

  return (
    <Card withBorder padding="sm" style={{ backgroundColor }}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={700} size="sm">
              {senderName}
            </Text>
            {message.character && !isDM && (
              <Badge size="xs" variant="outline">
                {message.character.class}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {new Date(message.created_at).toLocaleTimeString()}
          </Text>
        </Group>

        <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>

        {isRoll && message.roll_data && (
          <div>
            <RollDisplay roll={message.roll_data} />
          </div>
        )}
      </Stack>
    </Card>
  );
}
