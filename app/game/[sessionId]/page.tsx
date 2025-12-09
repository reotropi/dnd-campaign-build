'use client';

import { useEffect, useState } from 'react';
import { Container, Grid, Loader, Center, Stack } from '@mantine/core';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CharacterPanel } from '@/components/game/CharacterPanel';
import { DiceRoller } from '@/components/game/DiceRoller';
import { ChatBox } from '@/components/game/ChatBox';
import { PartyMembers } from '@/components/game/PartyMembers';
import { HostControls } from '@/components/game/HostControls';
import { OOCChat } from '@/components/game/OOCChat';
import { useAuth } from '@/hooks/useAuth';
import { useSession, useSessionMembers } from '@/hooks/useSession';
import { useCharacter } from '@/hooks/useCharacter';
import { useGameChat } from '@/hooks/useGameChat';
import { RollData, RollPrompt } from '@/types';
import { notifications } from '@mantine/notifications';

function GameContent() {
  const params = useParams();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;

  const { session } = useSession(sessionId);
  const { members } = useSessionMembers(sessionId);
  const userMember = members.find((m) => m.user_id === user?.id);
  const { character, updateHP } = useCharacter(userMember?.character_id || null);
  const { messages, sendMessage, sendDMMessage, sendOOCMessage, loading: messagesLoading } = useGameChat(sessionId);

  const [rollPrompt, setRollPrompt] = useState<RollPrompt | null>(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);

  const isHost = session?.host_id === user?.id;

  // Trigger initial DM narration when game starts
  useEffect(() => {
    const sendInitialDMMessage = async () => {
      // Only send if no messages exist yet, we haven't sent it, and messages have finished loading
      if (messages.length === 0 && !messagesLoading && !initialMessageSent && session && user) {
        setInitialMessageSent(true);
        setDmLoading(true);

        try {
          const response = await fetch('/api/claude', {
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

          // Send initial DM message
          await sendDMMessage(data.content);

          // Update roll prompts if DM asks for rolls
          if (data.rollPrompts && data.rollPrompts.length > 0) {
            setRollPrompt(data.rollPrompts[0]); // Set first prompt
          }
        } catch (error: any) {
          console.error('Failed to send initial DM message:', error);
        } finally {
          setDmLoading(false);
        }
      }
    };

    sendInitialDMMessage();
  }, [messages, messagesLoading, initialMessageSent, session, user, sessionId, sendDMMessage]);

  // Handle player messages and get DM response
  const handleSendMessage = async (content: string, rollData?: RollData) => {
    try {
      // Send player message
      await sendMessage(content, rollData);

      // Get DM response
      setDmLoading(true);
      const response = await fetch('/api/claude', {
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

      // Send DM response as message
      await sendDMMessage(data.content);

      // Update roll prompts if DM asks for rolls, otherwise clear it
      if (data.rollPrompts && data.rollPrompts.length > 0) {
        setRollPrompt(data.rollPrompts[0]); // Set first prompt
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

  const handleRoll = async (rollData: RollData) => {
    const rollDescription = `${character?.name} rolled ${rollData.total} for ${rollData.roll_type}`;
    await handleSendMessage(rollDescription, rollData);
  };

  if (!character) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="md">
      <Grid gutter="md">
        {/* Left Column - Character & Dice */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Stack gap="md">
            <CharacterPanel character={character} onUpdateHP={updateHP} />
            <DiceRoller character={character} rollPrompt={rollPrompt} onRoll={handleRoll} />
            {isHost && <HostControls sessionId={sessionId} />}
          </Stack>
        </Grid.Col>

        {/* Middle Column - Chat */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ChatBox messages={messages} onSendMessage={handleSendMessage} onSendRoll={handleRoll} loading={dmLoading} />
        </Grid.Col>

        {/* Right Column - Party & OOC Chat */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Stack gap="md">
            <PartyMembers members={members} />
            <OOCChat messages={messages} onSendMessage={sendOOCMessage} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default function GamePage() {
  return (
    <ProtectedRoute>
      <GameContent />
    </ProtectedRoute>
  );
}
