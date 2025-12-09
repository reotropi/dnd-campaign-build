'use client';

import { useState, useEffect } from 'react';
import { Stack, Title, Text, Button, Card, Group, SimpleGrid, Modal, ActionIcon } from '@mantine/core';
import { Character } from '@/types';
import { CharacterCard } from '../character/CharacterCard';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/lib/supabase';
import { FaTrash, FaPlus } from 'react-icons/fa';

interface SessionCharacterManagerProps {
  sessionId: string;
  sessionCharacters: Character[];
  onUpdate: () => void;
}

export function SessionCharacterManager({
  sessionId,
  sessionCharacters,
  onUpdate,
}: SessionCharacterManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Fetch user's characters that aren't in this session yet
  useEffect(() => {
    const fetchAvailableCharacters = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all user's characters
        const { data: allChars, error } = await supabase
          .from('characters')
          .select('*')
          .eq('created_by', user.id)
          .is('session_id', null);

        if (error) throw error;

        // Filter out characters already in this session
        const sessionCharIds = sessionCharacters.map(c => c.id);
        const available = (allChars || []).filter(c => !sessionCharIds.includes(c.id));

        setAvailableCharacters(available);
      } catch (error) {
        console.error('Error fetching available characters:', error);
      }
    };

    if (showAddModal) {
      fetchAvailableCharacters();
    }
  }, [showAddModal, sessionCharacters]);

  const handleAddCharacter = async () => {
    if (!selectedCharacterId) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/sessions/${sessionId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacterId,
          added_by: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add character');
      }

      notifications.show({
        title: 'Success',
        message: 'Character added to session!',
        color: 'green',
      });

      setShowAddModal(false);
      setSelectedCharacterId(null);
      onUpdate();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add character',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCharacter = async (characterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `/api/sessions/${sessionId}/characters?character_id=${characterId}&removed_by=${user.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove character');
      }

      notifications.show({
        title: 'Success',
        message: 'Character removed from session',
        color: 'green',
      });

      onUpdate();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to remove character',
        color: 'red',
      });
    }
  };

  return (
    <>
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={3}>Session Characters</Title>
              <Text size="sm" c="dimmed">
                Manage which characters are available for players to choose
              </Text>
            </div>
            <Button
              leftSection={<FaPlus size={16} />}
              onClick={() => setShowAddModal(true)}
            >
              Add Character
            </Button>
          </Group>

          {sessionCharacters.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No characters added yet. Add characters from your library.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {sessionCharacters.map((character) => (
                <div key={character.id} style={{ position: 'relative' }}>
                  <CharacterCard character={character} showHP={false} />
                  <ActionIcon
                    color="red"
                    variant="filled"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                    }}
                    onClick={() => handleRemoveCharacter(character.id)}
                  >
                    <FaTrash size={16} />
                  </ActionIcon>
                </div>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Card>

      <Modal
        opened={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Character to Session"
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select a character from your library to add to this session
          </Text>

          {availableCharacters.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No characters available. Create characters first!
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {availableCharacters.map((character) => (
                <div
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  style={{
                    cursor: 'pointer',
                    opacity: selectedCharacterId === character.id ? 1 : 0.7,
                    transform: selectedCharacterId === character.id ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s',
                    border: selectedCharacterId === character.id ? '2px solid var(--mantine-color-blue-6)' : 'none',
                    borderRadius: '8px',
                  }}
                >
                  <CharacterCard character={character} showHP={false} />
                </div>
              ))}
            </SimpleGrid>
          )}

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCharacter}
              disabled={!selectedCharacterId}
              loading={loading}
            >
              Add to Session
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
