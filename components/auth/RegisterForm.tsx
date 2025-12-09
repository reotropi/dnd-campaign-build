'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    playerName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      notifications.show({
        title: 'Error',
        message: 'Passwords do not match',
        color: 'red',
      });
      return;
    }

    if (formData.password.length < 6) {
      notifications.show({
        title: 'Error',
        message: 'Password must be at least 6 characters',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      await signUp(formData.email, formData.password, formData.playerName);
      notifications.show({
        title: 'Success',
        message: 'Account created successfully!',
        color: 'green',
      });
      router.push('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create account',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} mb="md">
        Create Account
      </Title>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Player Name"
            placeholder="Enter your player name"
            required
            value={formData.playerName}
            onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
          />
          <TextInput
            label="Email"
            placeholder="your@email.com"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <PasswordInput
            label="Password"
            placeholder="Enter password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
          <Button type="submit" fullWidth loading={loading}>
            Register
          </Button>
          <Text size="sm" ta="center">
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--mantine-color-blue-6)' }}>
              Login here
            </Link>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
