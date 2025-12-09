'use client';

import { Button, Card, Stack, Text, Badge } from '@mantine/core';
import { Character, RollPrompt, RollData } from '@/types';
import { useDiceRoller } from '@/hooks/useDiceRoller';

interface DiceRollerProps {
  character: Character;
  rollPrompt: RollPrompt | null;
  onRoll: (rollData: RollData) => void;
}

export function DiceRoller({ character, rollPrompt, onRoll }: DiceRollerProps) {
  const { isLocked, canRoll, roll } = useDiceRoller(character, rollPrompt);

  const handleRoll = () => {
    const rollData = roll();
    if (rollData) {
      onRoll(rollData);
    }
  };

  const getRollTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initiative: 'Initiative',
      attack: 'Attack',
      damage: 'Damage',
      saving_throw: 'Saving Throw',
      ability_check: 'Ability Check',
      skill_check: 'Skill Check',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <Text fw={700} size="lg">
          Dice Roller
        </Text>

        {rollPrompt && rollPrompt.character_name === character.name && (
          <Card withBorder padding="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
            <Text size="sm" fw={600} c="blue" mb={4}>
              DM Requests:
            </Text>
            <Text size="sm">{rollPrompt.description}</Text>
            <Badge mt={8} variant="light" color="blue">
              {getRollTypeLabel(rollPrompt.roll_type)}
            </Badge>
          </Card>
        )}

        <Button
          onClick={handleRoll}
          disabled={!canRoll || isLocked}
          size="lg"
          fullWidth
          color="blue"
        >
          {isLocked ? 'Roll Locked (Wait for DM)' : 'Roll Dice'}
        </Button>

        {!rollPrompt && (
          <Text size="sm" c="dimmed" ta="center">
            Waiting for DM to request a roll...
          </Text>
        )}

        {!canRoll && !isLocked && rollPrompt && rollPrompt.character_name !== character.name && (
          <Text size="sm" c="dimmed" ta="center">
            Waiting for {rollPrompt.character_name} to roll...
          </Text>
        )}
      </Stack>
    </Card>
  );
}
