'use client';

import { Card, Stack, Text, Group, Badge, Progress, Divider, ThemeIcon } from '@mantine/core';
import { PiSword, PiHeart, PiShield, PiSkull } from 'react-icons/pi';
import { CombatState } from '@/types/combat';

interface CombatTrackerProps {
  combatState: CombatState | null;
}

export function CombatTracker({ combatState }: CombatTrackerProps) {
  if (!combatState || !combatState.active) {
    return null;
  }

  const currentTurn = combatState.initiative_order[combatState.turn_index];

  return (
    <Card withBorder padding="lg" style={{ position: 'sticky', top: 20 }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon variant="light" color="red" size="lg">
              <PiSword size={20} />
            </ThemeIcon>
            <Text fw={700} size="lg">
              Combat Active
            </Text>
          </Group>
          <Badge size="lg" color="red" variant="filled">
            Round {combatState.round}
          </Badge>
        </Group>

        <Divider />

        {/* Current Turn Indicator */}
        <Card withBorder padding="sm" style={{ backgroundColor: 'var(--mantine-color-yellow-0)' }}>
          <Group gap="xs">
            <Text fw={600} size="sm">
              Current Turn:
            </Text>
            <Text fw={700} size="sm" c="yellow.9">
              {currentTurn.name}
            </Text>
            <Badge size="xs" color={currentTurn.type === 'player' ? 'blue' : 'red'}>
              {currentTurn.type === 'player' ? 'Player' : 'Enemy'}
            </Badge>
          </Group>
        </Card>

        {/* Initiative Order */}
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed">
            Initiative Order:
          </Text>
          {combatState.initiative_order.map((participant, index) => {
            const isCurrentTurn = index === combatState.turn_index;
            const combatant =
              participant.type === 'player'
                ? combatState.combatants.players.find(p => p.character_id === participant.id)
                : combatState.combatants.enemies.find(e => e.id === participant.id);

            if (!combatant) return null;

            const isDead =
              participant.type === 'enemy' &&
              'is_alive' in combatant &&
              !combatant.is_alive;

            return (
              <Card
                key={participant.id}
                withBorder
                padding="xs"
                style={{
                  backgroundColor: isCurrentTurn
                    ? 'var(--mantine-color-yellow-1)'
                    : isDead
                    ? 'var(--mantine-color-gray-1)'
                    : 'transparent',
                  opacity: isDead ? 0.5 : 1,
                }}
              >
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Badge size="xs" color="gray">
                        {participant.initiative}
                      </Badge>
                      <Text
                        fw={isCurrentTurn ? 700 : 500}
                        size="sm"
                        style={{ textDecoration: isDead ? 'line-through' : 'none' }}
                      >
                        {participant.name}
                      </Text>
                      {isDead && (
                        <ThemeIcon size="xs" color="gray" variant="transparent">
                          <PiSkull size={14} />
                        </ThemeIcon>
                      )}
                    </Group>
                    <Group gap={4}>
                      <ThemeIcon size="xs" color="gray" variant="transparent">
                        <PiShield size={14} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed">
                        AC {combatant.ac}
                      </Text>
                    </Group>
                  </Group>

                  {/* HP Bar */}
                  {!isDead && (
                    <Group gap={4} grow>
                      <Progress
                        value={(combatant.current_hp / combatant.max_hp) * 100}
                        color={
                          combatant.current_hp / combatant.max_hp > 0.5
                            ? 'green'
                            : combatant.current_hp / combatant.max_hp > 0.25
                            ? 'yellow'
                            : 'red'
                        }
                        size="sm"
                      />
                      <Group gap={4} style={{ flexGrow: 0, flexShrink: 0 }}>
                        <ThemeIcon size="xs" color="red" variant="transparent">
                          <PiHeart size={14} />
                        </ThemeIcon>
                        <Text size="xs" fw={500}>
                          {combatant.current_hp}/{combatant.max_hp}
                        </Text>
                      </Group>
                    </Group>
                  )}

                  {/* Conditions */}
                  {combatant.conditions && combatant.conditions.length > 0 && (
                    <Group gap={4}>
                      {combatant.conditions.map((condition, idx) => (
                        <Badge key={idx} size="xs" color="orange" variant="dot">
                          {condition}
                        </Badge>
                      ))}
                    </Group>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
