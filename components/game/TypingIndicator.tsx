'use client';

import { Group, Text, Loader } from '@mantine/core';

interface TypingIndicatorProps {
  characterNames: string[];
}

export function TypingIndicator({ characterNames }: TypingIndicatorProps) {
  if (characterNames.length === 0) return null;

  const displayText =
    characterNames.length === 1
      ? `${characterNames[0]} is typing...`
      : characterNames.length === 2
      ? `${characterNames[0]} and ${characterNames[1]} are typing...`
      : `${characterNames[0]} and ${characterNames.length - 1} others are typing...`;

  return (
    <Group gap="xs" mb="sm" style={{ padding: '8px 12px' }}>
      <Loader size="xs" type="dots" />
      <Text size="sm" c="dimmed" fs="italic">
        {displayText}
      </Text>
    </Group>
  );
}
