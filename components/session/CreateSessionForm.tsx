'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, NumberInput, Button, Stack, Title, MultiSelect, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Character } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface CreateSessionFormProps {
  availableCharacters: Character[];
}

export function CreateSessionForm({ availableCharacters }: CreateSessionFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    campaign_name: '',
    max_players: 6,
    character_ids: [] as string[],
    dm_language: 'indonesian' as 'indonesian' | 'english',
  });

  const characterOptions = availableCharacters.map((char) => ({
    value: char.id,
    label: `${char.name} (${char.class}, Lvl ${char.level})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: user?.id,  // Pass user ID from frontend
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      notifications.show({
        title: 'Success',
        message: `Session created! Code: ${data.session_code}`,
        color: 'green',
      });

      router.push(`/sessions/${data.session.id}/lobby`);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create session',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Title order={3}>Create New Session</Title>

        <TextInput
          label="Campaign Name"
          placeholder="Enter campaign name"
          required
          value={formData.campaign_name}
          onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
        />

        <NumberInput
          label="Max Players"
          min={1}
          max={8}
          value={formData.max_players}
          onChange={(val) => setFormData({ ...formData, max_players: Number(val) || 6 })}
        />

        <Select
          label="DM Language"
          description="Choose the language for AI Dungeon Master narration"
          required
          value={formData.dm_language}
          onChange={(val) => setFormData({ ...formData, dm_language: (val as 'indonesian' | 'english') || 'indonesian' })}
          data={[
            { value: 'indonesian', label: 'Indonesian (Bahasa Indonesia)' },
            { value: 'english', label: 'English' },
          ]}
        />

        <MultiSelect
          label="Select Characters (Optional)"
          description="You can add characters later in the lobby, or select them now"
          placeholder="Pick characters (optional)"
          data={characterOptions}
          value={formData.character_ids}
          onChange={(val) => setFormData({ ...formData, character_ids: val })}
          searchable
        />

        <Button type="submit" loading={loading}>
          Create Session
        </Button>
      </Stack>
    </form>
  );
}
