'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <Notifications position="top-right" />
      <AuthProvider>
        {children}
      </AuthProvider>
    </MantineProvider>
  );
}
