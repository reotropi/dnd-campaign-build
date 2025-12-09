'use client';

import { Container, Title, Card, Textarea, TextInput, Button, Stack, Alert } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function NewCharacterContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  const handleJsonImport = async () => {
    if (!user) {
      setError('You must be logged in');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const characterJson = JSON.parse(jsonInput);

      const response = await fetch('/api/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      notifications.show({
        title: 'Success',
        message: 'Character imported successfully!',
        color: 'green',
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to import. Check your JSON format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Import Character
      </Title>

      <Card withBorder padding="lg">
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
            placeholder='Paste your character JSON here...'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            minRows={15}
            maxRows={25}
            required
            description="Paste your complete character JSON from D&D Beyond"
            styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
          />

          {error && (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          )}

          <Button
            onClick={handleJsonImport}
            loading={loading}
            disabled={!jsonInput.trim()}
            fullWidth
          >
            Import Character
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}

export default function NewCharacterPage() {
  return (
    <ProtectedRoute>
      <NewCharacterContent />
    </ProtectedRoute>
  );
}
