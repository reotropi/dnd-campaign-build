'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, TextInput, Button, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/lib/supabase';

interface JoinSessionModalProps {
  opened: boolean;
  onClose: () => void;
}

export function JoinSessionModal({ opened, onClose }: JoinSessionModalProps) {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!sessionCode.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a session code',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_code: sessionCode.toUpperCase(),
          user_id: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      notifications.show({
        title: 'Success',
        message: 'Joined session!',
        color: 'green',
      });

      onClose();
      router.push(`/sessions/${data.session.id}/lobby`);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to join session',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Join Session">
      <Stack gap="md">
        <TextInput
          label="Session Code"
          placeholder="ABC-123"
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
          maxLength={7}
        />
        <Button onClick={handleJoin} loading={loading} fullWidth>
          Join Session
        </Button>
      </Stack>
    </Modal>
  );
}
