'use client';

import { Drawer, Stack, Title, Divider } from '@mantine/core';
import { CharacterPanel } from './CharacterPanel';
import { PartyMembers } from './PartyMembers';
import { CombatTracker } from './CombatTracker';
import { HostControls } from './HostControls';
import { Character, SessionMember, CombatState } from '@/types';

interface GameDrawerProps {
  opened: boolean;
  onClose: () => void;
  character: Character;
  members: SessionMember[];
  combatState: CombatState | null;
  isHost: boolean;
  sessionId: string;
}

export function GameDrawer({
  opened,
  onClose,
  character,
  members,
  combatState,
  isHost,
  sessionId
}: GameDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Game Info</Title>}
      position="left"
      size="md"
      styles={{
        body: { padding: 0 },
        header: { paddingBottom: 12 },
      }}
    >
      <Stack gap="md" p="md">
        {/* Character Status */}
        <CharacterPanel character={character} />

        <Divider />

        {/* Combat Tracker (if active) */}
        {combatState && (
          <>
            <CombatTracker combatState={combatState} />
            <Divider />
          </>
        )}

        {/* Party Members */}
        <PartyMembers members={members} />

        {/* Host Controls (if host) */}
        {isHost && (
          <>
            <Divider />
            <HostControls sessionId={sessionId} />
          </>
        )}
      </Stack>
    </Drawer>
  );
}
