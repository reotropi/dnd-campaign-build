'use client';

import { useState } from 'react';
import { Stack, Title, Text, Button, Card, Group, Badge, SimpleGrid } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { Session, SessionMemberWithDetails, Character } from '@/types';
import { CharacterSelector } from '../character/CharacterSelector';
import { SessionCharacterManager } from './SessionCharacterManager';
import { supabase } from '@/lib/supabase';

interface SessionLobbyProps {
  session: Session;
  members: SessionMemberWithDetails[];
  availableCharacters: Character[];
  sessionCharacters: Character[];
  userMember: SessionMemberWithDetails | null;
  isHost: boolean;
  onCharactersUpdate: () => void;
}

export function SessionLobby({
  session,
  members,
  availableCharacters,
  sessionCharacters,
  userMember,
  isHost,
  onCharactersUpdate,
}: SessionLobbyProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const hasSelectedCharacter = userMember?.character_id !== null;
  // Non-host members need to be ready AND have a character selected
  const allPlayersReady = members.every((m) => {
    // Host doesn't need to be ready or have a character
    if (m.user_id === session.host_id) return true;
    // Other players must be ready and have a character
    return m.is_ready && m.character_id;
  });
  const canStart = isHost && allPlayersReady && members.length > 0;

  const handleSelectCharacter = async (characterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/characters/${characterId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          user_id: user.id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to select character');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleToggleReady = async () => {
    if (!userMember) return;

    try {
      const response = await fetch(`/api/sessions/${session.id}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_ready: !userMember.is_ready }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update ready status');
      }

      notifications.show({
        title: 'Success',
        message: userMember.is_ready ? 'Marked as not ready' : 'Marked as ready',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update ready status',
        color: 'red',
      });
    }
  };

  const handleStartGame = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/sessions/${session.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ started_by: user.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start game');
      }

      notifications.show({
        title: 'Success',
        message: 'Game started!',
        color: 'green',
      });

      router.push(`/game/${session.id}`);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to start game',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* Session Info */}
      <Card withBorder padding="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>{session.campaign_name}</Title>
            <Text c="dimmed">Lobby</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              Session Code
            </Text>
            <Badge size="xl" variant="filled">
              {session.session_code}
            </Badge>
          </div>
        </Group>
      </Card>

      {/* Character Management (Host Only) */}
      {isHost && (
        <SessionCharacterManager
          sessionId={session.id}
          sessionCharacters={sessionCharacters}
          onUpdate={onCharactersUpdate}
        />
      )}

      {/* Character Selection */}
      {!hasSelectedCharacter && (
        <Card withBorder padding="lg">
          <CharacterSelector availableCharacters={availableCharacters} onSelect={handleSelectCharacter} />
        </Card>
      )}

      {/* Players */}
      <Card withBorder padding="lg">
        <Title order={3} mb="md">
          Players ({members.length}/{session.max_players})
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {members.map((member) => (
            <Card key={member.id} withBorder padding="sm">
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{member.profile?.player_name || 'Unknown'}</Text>
                  {member.character && (
                    <Text size="sm" c="dimmed">
                      {member.character.name} ({member.character.class})
                    </Text>
                  )}
                </div>
                <Badge color={member.is_ready ? 'green' : 'gray'}>
                  {member.is_ready ? 'Ready' : 'Not Ready'}
                </Badge>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Card>

      {/* Actions */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          {!isHost && hasSelectedCharacter && (
            <Button onClick={handleToggleReady} variant="light">
              {userMember?.is_ready ? 'Mark as Not Ready' : 'Mark as Ready'}
            </Button>
          )}

          {isHost && (
            <>
              <Button onClick={handleStartGame} disabled={!canStart} loading={loading} size="lg">
                Start Game
              </Button>
              {!canStart && (
                <Text size="sm" c="dimmed" ta="center">
                  {!allPlayersReady
                    ? 'Waiting for all players to be ready...'
                    : 'Need at least one player to start'}
                </Text>
              )}
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
