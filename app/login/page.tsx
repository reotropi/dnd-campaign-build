import { Container, Center } from '@mantine/core';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Container size="xs" py="xl">
      <Center style={{ minHeight: 'calc(100vh - 200px)' }}>
        <LoginForm />
      </Center>
    </Container>
  );
}
