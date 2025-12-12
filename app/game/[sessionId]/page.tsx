'use client';

import { useEffect, useState } from 'react';
import { Container, Grid, Loader, Center, Stack, ActionIcon, Group, Text } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { PiList } from 'react-icons/pi';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CharacterPanel } from '@/components/game/CharacterPanel';
import { DiceRoller } from '@/components/game/DiceRoller';
import { ChatBox } from '@/components/game/ChatBox';
import { PartyMembers } from '@/components/game/PartyMembers';
import { HostControls } from '@/components/game/HostControls';
import { OOCChat } from '@/components/game/OOCChat';
import { CombatTracker } from '@/components/game/CombatTracker';
import { GameDrawer } from '@/components/game/GameDrawer';
import { OOCChatModal } from '@/components/game/OOCChatModal';
import { DiceRollerModal } from '@/components/game/DiceRollerModal';
import { MobileActionButtons } from '@/components/game/MobileActionButtons';
import { useAuth } from '@/hooks/useAuth';
import { useSession, useSessionMembers } from '@/hooks/useSession';
import { useSessionCharacter } from '@/hooks/useSessionCharacter';
import { useGameChat } from '@/hooks/useGameChat';
import { useCombatState } from '@/hooks/useCombatState';
import { RollData, RollPrompt } from '@/types';
import { notifications } from '@mantine/notifications';

function GameContent() {
  const params = useParams();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;

  const { session } = useSession(sessionId);
  const { members } = useSessionMembers(sessionId);
  const userMember = members.find((m) => m.user_id === user?.id);
  const { character } = useSessionCharacter(sessionId, userMember?.character_id || null);
  const { messages, sendMessage, sendDMMessage, sendOOCMessage, loading: messagesLoading } = useGameChat(sessionId);
  const { combatState } = useCombatState(sessionId);

  const [rollPrompt, setRollPrompt] = useState<RollPrompt | null>(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [pendingRoll, setPendingRoll] = useState<RollData | null>(null);

  // Mobile UI state
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [oocModalOpened, { open: openOOCModal, close: closeOOCModal }] = useDisclosure(false);
  const [diceModalOpened, { open: openDiceModal, close: closeDiceModal }] = useDisclosure(false);
  const [lastReadOOCCount, setLastReadOOCCount] = useState(0);

  const isHost = session?.host_id === user?.id;

  // Calculate unread OOC messages
  const oocMessages = messages.filter((m) => m.message_type === 'ooc');
  const unreadOOCCount = Math.max(0, oocMessages.length - lastReadOOCCount);

  // Mark OOC as read when modal opens
  useEffect(() => {
    if (oocModalOpened) {
      setLastReadOOCCount(oocMessages.length);
    }
  }, [oocModalOpened, oocMessages.length]);

  // Check if last message has roll prompt data
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Check if last message is from DM and has roll_data (which contains roll prompts)
      if (lastMessage.message_type === 'dm' && lastMessage.roll_data) {
        const rollData = lastMessage.roll_data as any;

        // If roll_data has a rollPrompts field (we'll need to modify the API to store this)
        if (rollData.rollPrompt) {
          setRollPrompt(rollData.rollPrompt);
        }
      }
    }
  }, [messages]);

  // Trigger initial DM narration when game starts (ONLY HOST)
  useEffect(() => {
    const sendInitialDMMessage = async () => {
      // Only send if:
      // 1. No messages exist yet
      // 2. Messages have finished loading
      // 3. We haven't sent it already
      // 4. User is the host (to prevent duplicate messages from multiple clients)
      if (messages.length === 0 && !messagesLoading && !initialMessageSent && session && user && isHost) {
        setInitialMessageSent(true);
        setDmLoading(true);

        try {
          const response = await fetch('/api/claude-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              user_id: user.id,
              user_message: null, // No user message, just start the adventure
              roll_data: null,
              sender_name: null,
              character_name: null,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to get DM response');
          }

          // Send initial DM message with roll prompt if present
          const firstRollPrompt = data.rollPrompts && data.rollPrompts.length > 0 ? data.rollPrompts[0] : null;
          await sendDMMessage(data.content, firstRollPrompt);

          // Update roll prompts if DM asks for rolls
          if (firstRollPrompt) {
            setRollPrompt(firstRollPrompt);
          }
        } catch (error: any) {
          console.error('Failed to send initial DM message:', error);
        } finally {
          setDmLoading(false);
        }
      }
    };

    sendInitialDMMessage();
  }, [messages, messagesLoading, initialMessageSent, session, user, sessionId, sendDMMessage, isHost]);

  // Handle player messages and get DM response
  const handleSendMessage = async (content: string, rollData?: RollData) => {
    try {
      // Send player message
      await sendMessage(content, rollData);

      // If this is an initiative roll and combat is active, update combat state
      if (rollData?.roll_type === 'initiative' && combatState?.active && character?.id) {
        try {
          await fetch('/api/combat/initiative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              initiatives: [{
                id: character.id,
                initiative: rollData.total,
                type: 'player',
              }],
            }),
          });
        } catch (err) {
          console.error('Error updating initiative:', err);
        }
      }

      // Get DM response
      setDmLoading(true);
      const response = await fetch('/api/claude-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: user?.id,
          user_message: content,
          roll_data: rollData,
          sender_name: userMember?.profile?.player_name || user?.email,
          character_name: character?.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get DM response');
      }

      // Send DM response as message with roll prompt if present
      const firstRollPrompt = data.rollPrompts && data.rollPrompts.length > 0 ? data.rollPrompts[0] : null;
      await sendDMMessage(data.content, firstRollPrompt);

      // Update roll prompts if DM asks for rolls, otherwise clear it
      if (firstRollPrompt) {
        setRollPrompt(firstRollPrompt); // Set first prompt
      } else {
        setRollPrompt(null); // Clear roll prompt if DM doesn't need more rolls
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to get DM response',
        color: 'red',
      });
    } finally {
      setDmLoading(false);
    }
  };

  const handleRoll = (rollData: RollData) => {
    setPendingRoll(rollData);
  };

  const handleClearRoll = () => {
    setPendingRoll(null);
  };

  if (!character) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  // Check if we can roll (for mobile dice button)
  const canRollDice = rollPrompt?.character_name === character?.name;

  return (
    <>
      {/* Mobile Drawer for Game Info */}
      {isMobile && character && (
        <GameDrawer
          opened={drawerOpened}
          onClose={closeDrawer}
          character={character}
          members={members}
          combatState={combatState}
          isHost={isHost}
          sessionId={sessionId}
        />
      )}

      {/* Mobile OOC Chat Modal */}
      {isMobile && (
        <OOCChatModal
          opened={oocModalOpened}
          onClose={closeOOCModal}
          messages={messages}
          onSendMessage={sendOOCMessage}
          unreadCount={unreadOOCCount}
        />
      )}

      {/* Mobile Dice Roller Modal */}
      {isMobile && character && (
        <DiceRollerModal
          opened={diceModalOpened}
          onClose={closeDiceModal}
          character={character}
          rollPrompt={rollPrompt}
          onRoll={handleRoll}
        />
      )}

      <Container size="xl" py="md" pb={isMobile ? 80 : 'md'}>
        {/* Mobile Header with Menu Button */}
        {isMobile && (
          <Group justify="space-between" mb="md" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
            <ActionIcon size="lg" variant="light" onClick={openDrawer}>
              <PiList size={24} />
            </ActionIcon>
            <Text fw={700} size="lg">
              {character?.name || 'D&D Game'}
            </Text>
            <div style={{ width: 40 }} /> {/* Spacer for centering */}
          </Group>
        )}

        {isMobile ? (
          /* Mobile Layout - Chat Only */
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={dmLoading}
            pendingRoll={pendingRoll}
            onClearRoll={handleClearRoll}
            sessionId={sessionId}
            currentCharacterName={character?.name || null}
          />
        ) : (
          /* Desktop Layout - Original Grid */
          <Grid gutter="md">
            {/* Left Column - Character & Dice */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Stack gap="md">
                <CharacterPanel character={character} />
                <DiceRoller character={character} rollPrompt={rollPrompt} onRoll={handleRoll} />
                {isHost && <HostControls sessionId={sessionId} />}
              </Stack>
            </Grid.Col>

            {/* Middle Column - Chat */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <ChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                loading={dmLoading}
                pendingRoll={pendingRoll}
                onClearRoll={handleClearRoll}
                sessionId={sessionId}
                currentCharacterName={character?.name || null}
              />
            </Grid.Col>

            {/* Right Column - Party & OOC Chat */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Stack gap="md">
                {combatState && <CombatTracker combatState={combatState} />}
                <PartyMembers members={members} />
                <OOCChat messages={messages} onSendMessage={sendOOCMessage} />
              </Stack>
            </Grid.Col>
          </Grid>
        )}
      </Container>

      {/* Mobile Bottom Action Buttons */}
      {isMobile && (
        <MobileActionButtons
          onOpenOOC={openOOCModal}
          onOpenDice={openDiceModal}
          oocUnreadCount={unreadOOCCount}
          diceEnabled={canRollDice}
        />
      )}
    </>
  );
}

export default function GamePage() {
  return (
    <ProtectedRoute>
      <GameContent />
    </ProtectedRoute>
  );
}
