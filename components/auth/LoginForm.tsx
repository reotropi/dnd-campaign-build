'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await signIn(formData.email, formData.password);
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully!',
        color: 'green',
      });
      router.push('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to log in',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} mb="md">
        Login
      </Title>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
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
          <Button type="submit" fullWidth loading={loading}>
            Login
          </Button>
          <Text size="sm" ta="center">
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--mantine-color-blue-6)' }}>
              Register here
            </Link>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
