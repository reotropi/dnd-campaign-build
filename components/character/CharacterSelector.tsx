'use client';

import { useState } from 'react';
import { Stack, Title, Text, Button, SimpleGrid } from '@mantine/core';
import { Character } from '@/types';
import { CharacterCard } from './CharacterCard';
import { notifications } from '@mantine/notifications';

interface CharacterSelectorProps {
  availableCharacters: Character[];
  onSelect: (characterId: string) => Promise<void>;
}

export function CharacterSelector({ availableCharacters, onSelect }: CharacterSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async () => {
    if (!selectedId) return;

    try {
      setLoading(true);
      await onSelect(selectedId);
      notifications.show({
        title: 'Success',
        message: 'Character selected!',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to select character',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (availableCharacters.length === 0) {
    return (
      <div>
        <Title order={3} mb="md">
          Select Your Character
        </Title>
        <Text c="dimmed">No characters available. Wait for the host to add characters.</Text>
      </div>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={3} mb="xs">
          Select Your Character
        </Title>
        <Text c="dimmed">Choose a character from the available options below.</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {availableCharacters.map((character) => (
          <div
            key={character.id}
            onClick={() => setSelectedId(character.id)}
            style={{
              opacity: selectedId === character.id ? 1 : 0.7,
              transform: selectedId === character.id ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
              border: selectedId === character.id ? '2px solid var(--mantine-color-blue-6)' : 'none',
              borderRadius: '8px',
            }}
          >
            <CharacterCard character={character} showHP={false} />
          </div>
        ))}
      </SimpleGrid>

      <Button onClick={handleSelect} disabled={!selectedId} loading={loading} size="lg">
        Confirm Character Selection
      </Button>
    </Stack>
  );
}
