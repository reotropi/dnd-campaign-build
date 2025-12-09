'use client';

import { Group, Button, Text, Container } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', padding: '1rem 0' }}>
      <Container size="xl">
        <Group justify="space-between">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Text size="xl" fw={700} c="blue">
              D&D Campaign Manager
            </Text>
          </Link>

          <Group gap="md">
            {user ? (
              <>
                <Text size="sm">Welcome, {user.player_name}</Text>
                <Link href="/dashboard">
                  <Button variant="subtle">Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="subtle">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </Group>
        </Group>
      </Container>
    </div>
  );
}
