'use client';

import { Button, Card, Select, Stack, Text, NumberInput } from '@mantine/core';
import { RollType, AdvantageType, Character, RollPrompt } from '@/types';
import { useDiceRoller } from '@/hooks/useDiceRoller';

interface DiceRollerProps {
  character: Character;
  rollPrompt: RollPrompt | null;
  onRoll: (rollData: any) => void;
}

export function DiceRoller({ character, rollPrompt, onRoll }: DiceRollerProps) {
  const {
    isLocked,
    rollType,
    setRollType,
    advantageType,
    setAdvantageType,
    customModifier,
    setCustomModifier,
    canRoll,
    roll,
  } = useDiceRoller(character, rollPrompt);

  const handleRoll = () => {
    const rollData = roll();
    if (rollData) {
      onRoll(rollData);
    }
  };

  const rollTypeOptions: { value: RollType; label: string }[] = [
    { value: 'initiative', label: 'Initiative' },
    { value: 'attack', label: 'Attack' },
    { value: 'damage', label: 'Damage' },
    { value: 'saving_throw', label: 'Saving Throw' },
    { value: 'ability_check', label: 'Ability Check' },
    { value: 'skill_check', label: 'Skill Check' },
    { value: 'custom', label: 'Custom' },
  ];

  const advantageOptions: { value: AdvantageType; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'advantage', label: 'Advantage' },
    { value: 'disadvantage', label: 'Disadvantage' },
  ];

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <Text fw={700} size="lg">
          Dice Roller
        </Text>

        {rollPrompt && rollPrompt.character_name === character.name && (
          <Card withBorder padding="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
            <Text size="sm" fw={600} c="blue">
              DM Requests: {rollPrompt.description}
            </Text>
          </Card>
        )}

        <Select
          label="Roll Type"
          value={rollType}
          onChange={(val) => setRollType(val as RollType)}
          data={rollTypeOptions}
          disabled={isLocked}
        />

        <Select
          label="Advantage"
          value={advantageType}
          onChange={(val) => setAdvantageType(val as AdvantageType)}
          data={advantageOptions}
          disabled={isLocked}
        />

        <NumberInput
          label="Custom Modifier"
          description="Add a custom bonus or penalty"
          value={customModifier}
          onChange={(val) => setCustomModifier(Number(val) || 0)}
          disabled={isLocked}
        />

        <Button onClick={handleRoll} disabled={!canRoll || isLocked} size="lg" fullWidth>
          {isLocked ? 'Roll Locked (Wait for DM)' : 'Roll Dice'}
        </Button>

        {!canRoll && !isLocked && rollPrompt && (
          <Text size="sm" c="dimmed" ta="center">
            Waiting for {rollPrompt.character_name} to roll...
          </Text>
        )}
      </Stack>
    </Card>
  );
}
