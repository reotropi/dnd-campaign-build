'use client';

import { Group, Pill, Tooltip, Text } from '@mantine/core';
import { RollData } from '@/types';
import { getDiceColor } from '@/lib/dice';
import { FaDice, FaPlus } from 'react-icons/fa';

interface RollDisplayProps {
  roll: RollData;
}

export function RollDisplay({ roll }: RollDisplayProps) {
  const hasAdvantage = roll.advantage_type === 'advantage' || roll.advantage_type === 'disadvantage';

  return (
    <Group gap="xs" mb="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <FaDice size={20} color="var(--mantine-color-blue-6)" />

      {/* Display each dice roll */}
      {roll.dice.map((dice, idx) => {
        const dieLabel = hasAdvantage && dice.individual_rolls && dice.individual_rolls.length > 1
          ? `${dice.individual_rolls[0]} | ${dice.individual_rolls[1]}`
          : dice.result.toString();

        const tooltipContent = (
          <div>
            <Text size="sm" fw={500}>
              🎲 {dice.count}× roll {dice.dice_type}
            </Text>
            <Text size="xs" c="dimmed">
              Result: {dice.result}
            </Text>
            {dice.individual_rolls && dice.individual_rolls.length > 1 && (
              <Text size="xs" c="dimmed">
                {roll.advantage_type === 'advantage'
                  ? `✨ ADVANTAGE / Rolls: ${dice.individual_rolls.join(', ')} / Selected: ${dice.result} (higher)`
                  : roll.advantage_type === 'disadvantage'
                  ? `💀 DISADVANTAGE / Rolls: ${dice.individual_rolls.join(', ')} / Selected: ${dice.result} (lower)`
                  : `Rolls: ${dice.individual_rolls.join(', ')}`
                }
              </Text>
            )}
          </div>
        );

        return (
          <Tooltip key={`dice-${idx}`} label={tooltipContent} withArrow position="top">
            <Pill
              size="lg"
              style={{
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'help',
                whiteSpace: 'nowrap',
                backgroundColor: hasAdvantage
                  ? roll.advantage_type === 'advantage'
                    ? 'var(--mantine-color-green-6)'
                    : 'var(--mantine-color-red-6)'
                  : `var(--mantine-color-${getDiceColor(dice.dice_type)}-6)`
              }}
            >
              {dieLabel}
            </Pill>
          </Tooltip>
        );
      })}

      {/* Display modifiers */}
      {roll.modifiers.map((mod, idx) => {
        const tooltipContent = (
          <div>
            <Text size="sm" fw={500}>
              ➕ {mod.source || mod.name}
            </Text>
            <Text size="sm">Value: {mod.value >= 0 ? '+' : ''}{mod.value}</Text>
          </div>
        );

        return (
          <Tooltip key={`mod-${idx}`} label={tooltipContent} withArrow position="top">
            <Pill
              size="lg"
              style={{
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'help',
                backgroundColor: mod.value >= 0 ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-red-6)',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <Group gap={4} wrap="nowrap" style={{ alignItems: 'center' }}>
                <FaPlus size={12} />
                <span>{mod.value >= 0 ? mod.value : mod.value}</span>
              </Group>
            </Pill>
          </Tooltip>
        );
      })}

      {/* Total */}
      <Text fw={700} size="lg" style={{ marginLeft: '4px' }}>
        = {roll.total}
      </Text>
    </Group>
  );
}
