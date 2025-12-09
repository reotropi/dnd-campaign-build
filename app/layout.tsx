import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from '@/components/providers/Providers';
import { Navbar } from '@/components/layout/Navbar';

export const metadata = {
  title: 'D&D Campaign Manager',
  description: 'Multiplayer D&D Campaign Manager with AI Dungeon Master',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
