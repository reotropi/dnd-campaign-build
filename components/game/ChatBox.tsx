'use client';

import { useState, useRef, useEffect } from 'react';
import { Stack, Textarea, Button, ScrollArea, Card, Text, Group, Badge, ActionIcon } from '@mantine/core';
import { PiPaperPlaneRight } from 'react-icons/pi';
import { MessageWithDetails, RollData } from '@/types';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface ChatBoxProps {
  messages: MessageWithDetails[];
  onSendMessage: (content: string, rollData?: RollData) => void;
  loading?: boolean;
  pendingRoll?: RollData | null;
  onClearRoll?: () => void;
  sessionId: string | null;
  currentCharacterName: string | null;
}

export function ChatBox({ messages, onSendMessage, pendingRoll, onClearRoll, sessionId, currentCharacterName }: ChatBoxProps) {
  const [messageInput, setMessageInput] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(sessionId, currentCharacterName);

  // Filter out OOC messages (they're shown in the OOC panel on the right)
  const gameMessages = messages.filter((m) => m.message_type !== 'ooc');

  // Auto-scroll to the start of the latest message when new GAME messages arrive
  // Don't scroll if the latest message is OOC (it's in the side panel)
  useEffect(() => {
    if (lastMessageRef.current && gameMessages.length > 0) {
      // Only scroll if the latest overall message is a game message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.message_type !== 'ooc') {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [messages.length, gameMessages.length]); // Trigger when message count changes

  const handleSend = () => {
    if (!messageInput.trim() && !pendingRoll) return;

    // Stop typing indicator when sending
    stopTyping();

    onSendMessage(messageInput || `Rolled ${pendingRoll?.total} for ${pendingRoll?.roll_type}`, pendingRoll || undefined);
    setMessageInput('');
    if (onClearRoll) onClearRoll();
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);

    // Trigger typing indicator
    if (value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const getRollTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initiative: 'Initiative',
      attack: 'Attack',
      damage: 'Damage',
      saving_throw: 'Saving Throw',
      ability_check: 'Ability Check',
      skill_check: 'Skill Check',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      <ScrollArea h={600} viewportRef={viewport}>
        <Stack gap="sm" p="sm">
          {gameMessages.map((message, index) => (
            <div
              key={message.id}
              ref={index === gameMessages.length - 1 ? lastMessageRef : null}
            >
              <ChatMessage message={message} />
            </div>
          ))}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator characterNames={typingUsers.map(u => u.characterName)} />
          )}
        </Stack>
      </ScrollArea>

      <Stack gap="xs">
        {pendingRoll && (
          <Card withBorder padding="sm" style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" fw={600} c="green" mb={4}>
                  Roll Ready to Send:
                </Text>
                <Group gap="xs">
                  <Badge size="lg" variant="filled" color="green">
                    Total: {pendingRoll.total}
                  </Badge>
                  <Badge variant="light" color="blue">
                    {getRollTypeLabel(pendingRoll.roll_type)}
                  </Badge>
                  {pendingRoll.advantage_type !== 'normal' && (
                    <Badge variant="light" color="cyan">
                      {pendingRoll.advantage_type}
                    </Badge>
                  )}
                </Group>
              </div>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={onClearRoll}
              >
                Clear
              </Button>
            </Group>
          </Card>
        )}

        <Group gap="xs" align="flex-end">
          <Textarea
            flex={1}
            placeholder={pendingRoll ? "Add a message (optional)..." : "Type your action or message..."}
            value={messageInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            size="md"
            minRows={1}
            maxRows={4}
            autosize
          />
          <ActionIcon
            size="lg"
            variant="filled"
            color="blue"
            onClick={handleSend}
            disabled={!messageInput.trim() && !pendingRoll}
          >
            <PiPaperPlaneRight size={20} />
          </ActionIcon>
        </Group>
      </Stack>
    </Stack>
  );
}
