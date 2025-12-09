import { Container, Title, Text, Button, Stack, Card, SimpleGrid } from '@mantine/core';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" align="center" py={60}>
        <div style={{ textAlign: 'center' }}>
          <Title order={1} size={48} mb="md">
            D&D Campaign Manager
          </Title>
          <Text size="xl" c="dimmed" mb="xl">
            Experience epic adventures with AI-powered Dungeon Master
          </Text>
          <Link href="/register">
            <Button size="lg" mr="md">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Login
            </Button>
          </Link>
        </div>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mt={60} w="100%">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              AI Dungeon Master
            </Title>
            <Text c="dimmed">
              Powered by Claude AI, your Dungeon Master creates dynamic narratives, responds to player
              actions, and manages the game flow.
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              Multiplayer Sessions
            </Title>
            <Text c="dimmed">
              Create or join sessions with friends. Real-time updates keep everyone synchronized as the
              adventure unfolds.
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              Smart Dice Rolling
            </Title>
            <Text c="dimmed">
              Context-aware dice roller with advantage/disadvantage support. Rolls are automatically
              calculated and shared with the party.
            </Text>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
