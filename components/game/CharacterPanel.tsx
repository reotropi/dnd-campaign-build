'use client';

import { Card, Text, Progress, Group, Stack, Button, NumberInput } from '@mantine/core';
import { useState } from 'react';
import { Character } from '@/types';
import { getAbilityModifier } from '@/lib/claude';

interface CharacterPanelProps {
  character: Character;
  onUpdateHP: (newHP: number) => void;
}

export function CharacterPanel({ character, onUpdateHP }: CharacterPanelProps) {
  const [hpAdjust, setHpAdjust] = useState(0);

  const hpPercentage = (character.current_hp / character.max_hp) * 100;

  const getHPColor = () => {
    if (hpPercentage > 50) return 'green';
    if (hpPercentage > 25) return 'yellow';
    return 'red';
  };

  const handleHPChange = (delta: number) => {
    const newHP = Math.max(0, Math.min(character.current_hp + delta, character.max_hp));
    onUpdateHP(newHP);
    setHpAdjust(0);
  };

  const formatModifier = (score: number) => {
    const mod = getAbilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <div>
          <Text fw={700} size="xl">
            {character.name}
          </Text>
          <Text size="sm" c="dimmed">
            {character.class} • Level {character.level}
          </Text>
        </div>

        {/* HP Management */}
        <div>
          <Group justify="space-between" mb={5}>
            <Text size="sm" fw={600}>
              Hit Points
            </Text>
            <Text size="sm" fw={600}>
              {character.current_hp}/{character.max_hp}
            </Text>
          </Group>
          <Progress value={hpPercentage} color={getHPColor()} size="xl" mb="xs" />

          <Group gap="xs">
            <NumberInput
              placeholder="±HP"
              value={hpAdjust}
              onChange={(val) => setHpAdjust(Number(val) || 0)}
              size="xs"
              style={{ flex: 1 }}
            />
            <Button size="xs" variant="light" color="green" onClick={() => handleHPChange(hpAdjust)}>
              Heal
            </Button>
            <Button size="xs" variant="light" color="red" onClick={() => handleHPChange(-Math.abs(hpAdjust))}>
              Damage
            </Button>
          </Group>
        </div>

        {/* Quick Stats */}
        <Group grow>
          <div>
            <Text size="xs" c="dimmed" ta="center">
              AC
            </Text>
            <Text fw={700} ta="center" size="lg">
              {character.armor_class}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" ta="center">
              Initiative
            </Text>
            <Text fw={700} ta="center" size="lg">
              {formatModifier(character.dexterity)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" ta="center">
              Proficiency
            </Text>
            <Text fw={700} ta="center" size="lg">
              +{character.proficiency_bonus}
            </Text>
          </div>
        </Group>

        {/* Ability Modifiers */}
        <div>
          <Text size="sm" fw={600} mb="xs">
            Ability Modifiers
          </Text>
          <Group gap="xs">
            <Card withBorder p="xs" style={{ flex: 1, textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                STR
              </Text>
              <Text fw={700}>{formatModifier(character.strength)}</Text>
            </Card>
            <Card withBorder p="xs" style={{ flex: 1, textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                DEX
              </Text>
              <Text fw={700}>{formatModifier(character.dexterity)}</Text>
            </Card>
            <Card withBorder p="xs" style={{ flex: 1, textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                CON
              </Text>
              <Text fw={700}>{formatModifier(character.constitution)}</Text>
            </Card>
          </Group>
          <Group gap="xs" mt="xs">
            <Card withBorder p="xs" style={{ flex: 1, textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                INT
              </Text>
              <Text fw={700}>{formatModifier(character.intelligence)}</Text>
            </Card>
            <Card withBorder p="xs" style={{ flex: 1, textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                WIS
              </Text>
              <Text fw={700}>{formatModifier(character.wisdom)}</Text>
            </Card>
            <Card withBorder p="xs" style={{ flex: 1, textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                CHA
              </Text>
              <Text fw={700}>{formatModifier(character.charisma)}</Text>
            </Card>
          </Group>
        </div>
      </Stack>
    </Card>
  );
}
