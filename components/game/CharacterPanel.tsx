'use client';

import { Card, Text, Progress, Group, Stack, Badge, Accordion } from '@mantine/core';
import { Character } from '@/types';
import { getAbilityModifier } from '@/lib/claude';

interface CharacterPanelProps {
  character: Character;
}

export function CharacterPanel({ character }: CharacterPanelProps) {

  const hpPercentage = (character.current_hp / character.max_hp) * 100;

  const getHPColor = () => {
    if (hpPercentage > 50) return 'green';
    if (hpPercentage > 25) return 'yellow';
    return 'red';
  };

  const formatModifier = (score: number) => {
    const mod = getAbilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Get spell slots array
  const spellSlots = character.spell_slots
    ? Object.entries(character.spell_slots)
        .filter(([_, count]) => count && count > 0)
        .map(([level, count]) => ({
          level: parseInt(level.replace('level_', '')),
          count: count as number,
        }))
    : [];

  // Get top 5 inventory items
  const topInventory = character.inventory?.slice(0, 5) || [];

  // Get proficient skills (non-zero bonuses)
  const proficientSkills = character.skills
    ? Object.entries(character.skills)
        .filter(([_, bonus]) => bonus && bonus > 0)
        .map(([skill, bonus]) => ({
          name: skill.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          bonus: bonus as number,
        }))
    : [];

  // Get spells grouped by level
  const spellsByLevel = character.spells
    ? character.spells.reduce((acc, spell) => {
        const level = spell.level === 0 ? 'Cantrips' : `Level ${spell.level}`;
        if (!acc[level]) acc[level] = [];
        acc[level].push(spell);
        return acc;
      }, {} as Record<string, typeof character.spells>)
    : {};

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

        {/* HP (Auto-updated by DM) */}
        <div>
          <Group justify="space-between" mb={5}>
            <Text size="sm" fw={600}>
              Hit Points
            </Text>
            <Text size="sm" fw={600}>
              {character.current_hp}/{character.max_hp}
            </Text>
          </Group>
          <Progress value={hpPercentage} color={getHPColor()} size="xl" />
        </div>

        {/* Spell Slots */}
        {spellSlots.length > 0 && (
          <div>
            <Text size="sm" fw={600} mb="xs">
              Spell Slots
            </Text>
            <Group gap="xs">
              {spellSlots.map(({ level, count }) => (
                <Badge key={level} size="lg" variant="filled" color={count > 0 ? 'blue' : 'gray'}>
                  L{level}: {count}
                </Badge>
              ))}
            </Group>
          </div>
        )}

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

        {/* Collapsible Sections */}
        <Accordion variant="separated" multiple>
          {/* Skills Accordion */}
          {proficientSkills.length > 0 && (
            <Accordion.Item value="skills">
              <Accordion.Control>
                <Text size="sm" fw={600}>
                  Skills ({proficientSkills.length})
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Group gap="xs">
                  {proficientSkills.map(({ name, bonus }) => (
                    <Badge key={name} variant="light" color="teal">
                      {name} {bonus >= 0 ? `+${bonus}` : bonus}
                    </Badge>
                  ))}
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* Spells Accordion */}
          {Object.keys(spellsByLevel).length > 0 && (
            <Accordion.Item value="spells">
              <Accordion.Control>
                <Text size="sm" fw={600}>
                  Spells ({character.spells.length})
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap={8}>
                  {Object.entries(spellsByLevel)
                    .sort(([a], [b]) => {
                      if (a === 'Cantrips') return -1;
                      if (b === 'Cantrips') return 1;
                      return parseInt(a.replace('Level ', '')) - parseInt(b.replace('Level ', ''));
                    })
                    .map(([level, spells]) => (
                      <div key={level}>
                        <Text size="xs" fw={600} c="dimmed" mb={4}>
                          {level}
                        </Text>
                        <Stack gap={2}>
                          {spells.map((spell, idx) => (
                            <Text key={idx} size="xs">
                              • {spell.name}
                            </Text>
                          ))}
                        </Stack>
                      </div>
                    ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* Inventory Accordion */}
          {topInventory.length > 0 && (
            <Accordion.Item value="inventory">
              <Accordion.Control>
                <Text size="sm" fw={600}>
                  Inventory {character.inventory && character.inventory.length > 5 && `(${character.inventory.length})`}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap={4}>
                  {topInventory.map((item, idx) => (
                    <Text key={idx} size="xs">
                      • {item.name} {item.quantity > 1 && `(×${item.quantity})`}
                    </Text>
                  ))}
                  {character.inventory && character.inventory.length > 5 && (
                    <Text size="xs" c="dimmed">
                      +{character.inventory.length - 5} more items
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* Ability Modifiers Accordion */}
          <Accordion.Item value="abilities">
            <Accordion.Control>
              <Text size="sm" fw={600}>
                Ability Modifiers
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
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
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Card>
  );
}
