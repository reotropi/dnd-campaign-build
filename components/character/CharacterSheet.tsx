'use client';

import { Card, Text, Badge, Group, Stack, Progress, Grid, Divider, Title } from '@mantine/core';
import { Character } from '@/types';
import { getAbilityModifier } from '@/lib/claude';

interface CharacterSheetProps {
  character: Character;
}

export function CharacterSheet({ character }: CharacterSheetProps) {
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

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={3}>{character.name}</Title>
            <Text size="sm" c="dimmed">
              {character.race && `${character.race} `}
              {character.class} (Level {character.level})
            </Text>
          </div>
          <Badge size="lg" variant="filled">
            AC {character.armor_class}
          </Badge>
        </Group>

        {/* HP */}
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

        <Divider />

        {/* Ability Scores */}
        <div>
          <Text size="sm" fw={600} mb="xs">
            Ability Scores
          </Text>
          <Grid>
            <Grid.Col span={4}>
              <Card withBorder p="xs" ta="center">
                <Text size="xs" c="dimmed">
                  STR
                </Text>
                <Text size="xl" fw={700}>
                  {character.strength}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatModifier(character.strength)}
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card withBorder p="xs" ta="center">
                <Text size="xs" c="dimmed">
                  DEX
                </Text>
                <Text size="xl" fw={700}>
                  {character.dexterity}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatModifier(character.dexterity)}
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card withBorder p="xs" ta="center">
                <Text size="xs" c="dimmed">
                  CON
                </Text>
                <Text size="xl" fw={700}>
                  {character.constitution}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatModifier(character.constitution)}
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card withBorder p="xs" ta="center">
                <Text size="xs" c="dimmed">
                  INT
                </Text>
                <Text size="xl" fw={700}>
                  {character.intelligence}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatModifier(character.intelligence)}
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card withBorder p="xs" ta="center">
                <Text size="xs" c="dimmed">
                  WIS
                </Text>
                <Text size="xl" fw={700}>
                  {character.wisdom}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatModifier(character.wisdom)}
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card withBorder p="xs" ta="center">
                <Text size="xs" c="dimmed">
                  CHA
                </Text>
                <Text size="xl" fw={700}>
                  {character.charisma}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatModifier(character.charisma)}
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </div>

        <Divider />

        {/* Weapons */}
        {character.weapons && character.weapons.length > 0 && (
          <>
            <div>
              <Text size="sm" fw={600} mb="xs">
                Weapons
              </Text>
              <Stack gap="xs">
                {character.weapons.map((weapon, idx) => (
                  <Card key={idx} withBorder p="xs">
                    <Group justify="space-between">
                      <Text fw={600}>{weapon.name}</Text>
                      <Badge variant="outline">
                        {weapon.damage_dice} {weapon.damage_type}
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </div>
            <Divider />
          </>
        )}

        {/* Spells */}
        {character.spells && character.spells.length > 0 && (
          <>
            <div>
              <Text size="sm" fw={600} mb="xs">
                Spells
              </Text>
              <Stack gap="xs">
                {character.spells.slice(0, 5).map((spell, idx) => (
                  <Card key={idx} withBorder p="xs">
                    <Group justify="space-between">
                      <div>
                        <Text fw={600}>{spell.name}</Text>
                        <Text size="xs" c="dimmed">
                          {spell.school} • Level {spell.level}
                        </Text>
                      </div>
                    </Group>
                  </Card>
                ))}
                {character.spells.length > 5 && (
                  <Text size="xs" c="dimmed" ta="center">
                    +{character.spells.length - 5} more spells
                  </Text>
                )}
              </Stack>
            </div>
          </>
        )}
      </Stack>
    </Card>
  );
}
