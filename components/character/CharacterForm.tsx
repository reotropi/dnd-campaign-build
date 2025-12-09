'use client';

import { useState } from 'react';
import { TextInput, NumberInput, Button, Stack, Textarea, Grid, Tabs } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CharacterImportData } from '@/types';

interface CharacterFormProps {
  onSubmit: (character: CharacterImportData) => void;
  loading?: boolean;
}

export function CharacterForm({ onSubmit, loading = false }: CharacterFormProps) {
  const [activeTab, setActiveTab] = useState<string | null>('manual');
  const [jsonInput, setJsonInput] = useState('');
  const [formData, setFormData] = useState<CharacterImportData>({
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
    max_hp: 10,
    armor_class: 10,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    proficiency_bonus: 2,
    skills: {},
    weapons: [],
    spells: [],
    spell_slots: {},
    features: [],
    inventory: [],
    notes: '',
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleJSONImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      onSubmit(parsed);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Invalid JSON format',
        color: 'red',
      });
    }
  };

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tabs.List>
        <Tabs.Tab value="manual">Manual Entry</Tabs.Tab>
        <Tabs.Tab value="json">JSON Import</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="manual" pt="md">
        <form onSubmit={handleManualSubmit}>
          <Stack gap="md">
            <TextInput
              label="Character Name"
              placeholder="Enter character name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Class"
                  placeholder="Fighter, Wizard, etc."
                  required
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Level"
                  min={1}
                  max={20}
                  required
                  value={formData.level}
                  onChange={(val) => setFormData({ ...formData, level: Number(val) || 1 })}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Race"
                  placeholder="Human, Elf, etc."
                  value={formData.race}
                  onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Background"
                  placeholder="Soldier, Noble, etc."
                  value={formData.background}
                  onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Max HP"
                  min={1}
                  required
                  value={formData.max_hp}
                  onChange={(val) => setFormData({ ...formData, max_hp: Number(val) || 10 })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Armor Class"
                  min={1}
                  required
                  value={formData.armor_class}
                  onChange={(val) => setFormData({ ...formData, armor_class: Number(val) || 10 })}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Strength"
                  min={1}
                  max={30}
                  value={formData.strength}
                  onChange={(val) => setFormData({ ...formData, strength: Number(val) || 10 })}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Dexterity"
                  min={1}
                  max={30}
                  value={formData.dexterity}
                  onChange={(val) => setFormData({ ...formData, dexterity: Number(val) || 10 })}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Constitution"
                  min={1}
                  max={30}
                  value={formData.constitution}
                  onChange={(val) => setFormData({ ...formData, constitution: Number(val) || 10 })}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Intelligence"
                  min={1}
                  max={30}
                  value={formData.intelligence}
                  onChange={(val) => setFormData({ ...formData, intelligence: Number(val) || 10 })}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Wisdom"
                  min={1}
                  max={30}
                  value={formData.wisdom}
                  onChange={(val) => setFormData({ ...formData, wisdom: Number(val) || 10 })}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Charisma"
                  min={1}
                  max={30}
                  value={formData.charisma}
                  onChange={(val) => setFormData({ ...formData, charisma: Number(val) || 10 })}
                />
              </Grid.Col>
            </Grid>

            <NumberInput
              label="Proficiency Bonus"
              min={2}
              max={6}
              value={formData.proficiency_bonus}
              onChange={(val) => setFormData({ ...formData, proficiency_bonus: Number(val) || 2 })}
            />

            <Textarea
              label="Notes"
              placeholder="Additional character notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

            <Button type="submit" loading={loading}>
              Create Character
            </Button>
          </Stack>
        </form>
      </Tabs.Panel>

      <Tabs.Panel value="json" pt="md">
        <Stack gap="md">
          <Textarea
            label="Character JSON"
            description="Paste character data in JSON format. See documentation for schema."
            placeholder='{"name": "Aida", "class": "Fighter", ...}'
            rows={15}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            styles={{ input: { fontFamily: 'monospace' } }}
          />
          <Button onClick={handleJSONImport} loading={loading}>
            Import Character
          </Button>
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}
