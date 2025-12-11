'use client';

import { Modal, Button, Stack, Text, Badge, Card, Group } from '@mantine/core';
import { PiDiceFive } from 'react-icons/pi';
import { Character, RollPrompt, RollData } from '@/types';
import { useDiceRoller } from '@/hooks/useDiceRoller';

interface DiceRollerModalProps {
  opened: boolean;
  onClose: () => void;
  character: Character;
  rollPrompt: RollPrompt | null;
  onRoll: (rollData: RollData) => void;
}

export function DiceRollerModal({ opened, onClose, character, rollPrompt, onRoll }: DiceRollerModalProps) {
  const { isLocked, canRoll, roll } = useDiceRoller(character, rollPrompt);

  const handleRoll = () => {
    const rollData = roll();
    if (rollData) {
      onRoll(rollData);
      // Close modal after successful roll
      setTimeout(() => onClose(), 300);
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <PiDiceFive size={24} />
          <Text fw={700} size="lg">
            Dice Roller
          </Text>
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="lg">
        {/* Roll Request Display */}
        {rollPrompt && rollPrompt.character_name === character.name ? (
          <Card withBorder padding="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
            <Text size="sm" fw={600} c="blue" mb={8}>
              DM Requests:
            </Text>
            <Text size="md" mb={8}>
              {rollPrompt.description}
            </Text>
            <Badge variant="light" color="blue" size="lg">
              {getRollTypeLabel(rollPrompt.roll_type)}
            </Badge>
          </Card>
        ) : rollPrompt && rollPrompt.character_name !== character.name ? (
          <Card withBorder padding="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="sm" c="dimmed" ta="center">
              Waiting for {rollPrompt.character_name} to roll...
            </Text>
          </Card>
        ) : (
          <Card withBorder padding="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="sm" c="dimmed" ta="center">
              Waiting for DM to request a roll...
            </Text>
          </Card>
        )}

        {/* Roll Button */}
        <Button
          onClick={handleRoll}
          disabled={!canRoll || isLocked}
          size="xl"
          fullWidth
          color="blue"
          leftSection={<PiDiceFive size={24} />}
        >
          {isLocked ? 'Roll Locked (Wait for DM)' : canRoll ? 'Roll Dice' : 'Cannot Roll Yet'}
        </Button>

        {/* Character Info */}
        <Text size="sm" c="dimmed" ta="center">
          Rolling as: <Text span fw={600}>{character.name}</Text>
        </Text>
      </Stack>
    </Modal>
  );
}
