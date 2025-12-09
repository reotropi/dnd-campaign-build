'use client';

import { Card, Text, Badge, Group, Stack, Progress } from '@mantine/core';
import { Character } from '@/types';

interface CharacterCardProps {
  character: Character;
  onClick?: () => void;
  showHP?: boolean;
}

export function CharacterCard({ character, onClick, showHP = false }: CharacterCardProps) {
  const hpPercentage = (character.current_hp / character.max_hp) * 100;

  const getHPColor = () => {
    if (hpPercentage > 50) return 'green';
    if (hpPercentage > 25) return 'yellow';
    return 'red';
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">
            {character.name}
          </Text>
          <Badge color="blue" variant="light">
            Lvl {character.level}
          </Badge>
        </Group>

        <Group gap="xs">
          <Badge variant="outline">{character.class}</Badge>
          {character.race && <Badge variant="outline">{character.race}</Badge>}
        </Group>

        <Group gap="md">
          <div>
            <Text size="xs" c="dimmed">
              AC
            </Text>
            <Text fw={600}>{character.armor_class}</Text>
          </div>

          {showHP && (
            <div style={{ flex: 1 }}>
              <Text size="xs" c="dimmed">
                HP
              </Text>
              <Group gap="xs">
                <Text fw={600}>
                  {character.current_hp}/{character.max_hp}
                </Text>
              </Group>
              <Progress value={hpPercentage} color={getHPColor()} size="sm" />
            </div>
          )}
        </Group>

        {character.is_assigned && (
          <Badge color="green" variant="filled" size="sm">
            Assigned
          </Badge>
        )}
      </Stack>
    </Card>
  );
}
