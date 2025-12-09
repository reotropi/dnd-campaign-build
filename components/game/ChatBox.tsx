'use client';

import { useState, useRef, useEffect } from 'react';
import { Stack, TextInput, Button, ScrollArea, Card, Text, Group, Badge } from '@mantine/core';
import { MessageWithDetails, RollData } from '@/types';
import { ChatMessage } from './ChatMessage';

interface ChatBoxProps {
  messages: MessageWithDetails[];
  onSendMessage: (content: string, rollData?: RollData) => void;
  loading?: boolean;
  pendingRoll?: RollData | null;
  onClearRoll?: () => void;
}

export function ChatBox({ messages, onSendMessage, pendingRoll, onClearRoll }: ChatBoxProps) {
  const [messageInput, setMessageInput] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the start of the latest message when new messages arrive
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [messages.length]); // Only trigger when message count changes

  const handleSend = () => {
    if (!messageInput.trim() && !pendingRoll) return;

    onSendMessage(messageInput || `Rolled ${pendingRoll?.total} for ${pendingRoll?.roll_type}`, pendingRoll || undefined);
    setMessageInput('');
    if (onClearRoll) onClearRoll();
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      <ScrollArea h={600} viewportRef={viewport}>
        <Stack gap="sm" p="sm">
          {messages.map((message, index) => (
            <div
              key={message.id}
              ref={index === messages.length - 1 ? lastMessageRef : null}
            >
              <ChatMessage message={message} />
            </div>
          ))}
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

        <TextInput
          placeholder={pendingRoll ? "Add a message (optional)..." : "Type your action or message..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rightSection={
            <Button size="xs" onClick={handleSend} disabled={!messageInput.trim() && !pendingRoll}>
              Send
            </Button>
          }
        />
      </Stack>
    </Stack>
  );
}
