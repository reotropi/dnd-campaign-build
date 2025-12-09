import { Container, Center } from '@mantine/core';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <Container size="xs" py="xl">
      <Center style={{ minHeight: 'calc(100vh - 200px)' }}>
        <RegisterForm />
      </Center>
    </Container>
  );
}
