'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Textarea, TextInput, Container, Title, Paper, Stack, Alert } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function ImportCharacterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleImport = async () => {
    if (!user) {
      setError('You must be logged in to import characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      // Parse JSON
      const characterJson = JSON.parse(jsonInput);

      // Call API
      const response = await fetch('/api/characters/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterJson,
          sessionId: sessionId.trim() || null,
          createdBy: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import character');
      }

      setSuccess(true);
      setJsonInput('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to import character. Please check your JSON format.');
    } finally {
      setLoading(false);
    }
  };

  const exampleJson = `{
  "character_name": "Hank",
  "class": "Ranger",
  "level": 1,
  "hp_current": 14,
  "hp_max": 14,
  "ac": 14,
  "initiative": 4,
  "proficiency": 2,
  "race": "Human",
  "background": "Outlander",
  "alignment": "Neutral Good",
  "stats": {
    "strength": 12,
    "dexterity": 14,
    "constitution": 14,
    "intelligence": 10,
    "wisdom": 13,
    "charisma": 10
  },
  "skills": {
    "athletics": 3,
    "perception": 3,
    "stealth": 4,
    "survival": 3
  },
  "weapons": [
    {
      "name": "Longbow",
      "damage_dice": "1d8",
      "damage_type": "piercing",
      "attack_bonus": 4
    }
  ],
  "spells": [],
  "spell_slots_max": { "1": 3 },
  "spell_slots_current": { "1": 3 },
  "equipment": [
    { "name": "Studded Leather Armor", "quantity": 1 }
  ],
  "notes": "Human Ranger"
}`;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1}>Import Character from JSON</Title>

        <Paper shadow="sm" p="md" withBorder>
          <Stack gap="md">
            <TextInput
              label="Session ID (Optional)"
              placeholder="Leave empty to add to session later"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              description="Optional: Add character to a specific session, or leave empty to assign later"
            />

            <Textarea
              label="Character JSON"
              placeholder={exampleJson}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              minRows={15}
              maxRows={25}
              required
              description="Paste your character JSON here"
              styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
            />

            {error && (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            )}

            {success && (
              <Alert color="green" title="Success!">
                Character imported successfully! Redirecting to dashboard...
              </Alert>
            )}

            <Button
              onClick={handleImport}
              loading={loading}
              disabled={!jsonInput.trim()}
              fullWidth
            >
              Import Character
            </Button>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={3} mb="sm">Example JSON Format</Title>
          <pre style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {exampleJson}
          </pre>
        </Paper>
      </Stack>
    </Container>
  );
}
