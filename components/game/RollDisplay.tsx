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
      {roll.dice.map((dice, diceIdx) => {
        // For advantage/disadvantage on d20, show both rolls side by side
        if (hasAdvantage && dice.individual_rolls && dice.individual_rolls.length > 1) {
          return (
            <Group key={`dice-${diceIdx}`} gap={4} wrap="nowrap">
              {dice.individual_rolls.map((rollValue, rollIdx) => {
                const isSelected = rollValue === dice.result;
                return (
                  <Tooltip
                    key={`roll-${diceIdx}-${rollIdx}`}
                    label={`${dice.dice_type}: ${rollValue}${isSelected ? ' (selected)' : ''}`}
                    withArrow
                    position="top"
                  >
                    <Pill
                      size="lg"
                      style={{
                        fontWeight: 600,
                        fontSize: '16px',
                        cursor: 'help',
                        whiteSpace: 'nowrap',
                        color: 'white',
                        backgroundColor: roll.advantage_type === 'advantage'
                          ? isSelected ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-gray-5)'
                          : isSelected ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-5)',
                        opacity: isSelected ? 1 : 0.6,
                      }}
                    >
                      {rollValue}
                    </Pill>
                  </Tooltip>
                );
              })}
            </Group>
          );
        }

        // For multiple dice (e.g., 4d8), show each die individually
        if (dice.individual_rolls && dice.individual_rolls.length > 1) {
          return (
            <Group key={`dice-${diceIdx}`} gap={4} wrap="nowrap">
              {dice.individual_rolls.map((rollValue, rollIdx) => (
                <Tooltip
                  key={`roll-${diceIdx}-${rollIdx}`}
                  label={`${dice.dice_type}: ${rollValue}`}
                  withArrow
                  position="top"
                >
                  <Pill
                    size="lg"
                    style={{
                      fontWeight: 600,
                      fontSize: '16px',
                      cursor: 'help',
                      whiteSpace: 'nowrap',
                      color: 'white',
                      backgroundColor: `var(--mantine-color-${getDiceColor(dice.dice_type)}-6)`,
                    }}
                  >
                    {rollValue}
                  </Pill>
                </Tooltip>
              ))}
            </Group>
          );
        }

        // For single die (e.g., 1d20), show single pill
        return (
          <Tooltip
            key={`dice-${diceIdx}`}
            label={`${dice.dice_type}: ${dice.result}`}
            withArrow
            position="top"
          >
            <Pill
              size="lg"
              style={{
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'help',
                whiteSpace: 'nowrap',
                color: 'white',
                backgroundColor: `var(--mantine-color-${getDiceColor(dice.dice_type)}-6)`,
              }}
            >
              {dice.result}
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
              <Group gap={4} wrap="nowrap" style={{ alignItems: 'center', color: 'white' }}>
                <FaPlus size={12} color="white" />
                <span style={{ color: 'white' }}>{mod.value >= 0 ? mod.value : mod.value}</span>
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
