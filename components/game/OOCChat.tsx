'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Stack, TextInput, ScrollArea, Text, Group, Badge, ActionIcon } from '@mantine/core';
import { MessageWithDetails } from '@/types';
import { PiPaperPlaneRight } from 'react-icons/pi';

interface OOCChatProps {
  messages: MessageWithDetails[];
  onSendMessage: (content: string) => void;
}

export function OOCChat({ messages, onSendMessage }: OOCChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const viewport = useRef<HTMLDivElement>(null);

  // Filter only OOC messages
  const oocMessages = messages.filter((m) => m.message_type === 'ooc');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
    }
  }, [oocMessages]);

  const handleSend = () => {
    if (!messageInput.trim()) return;

    onSendMessage(messageInput);
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="lg">
            Player Chat
          </Text>
          <Badge size="sm" variant="light" color="grape">
            OOC
          </Badge>
        </Group>

        <Text size="xs" c="dimmed">
          Chat with other players without triggering DM responses
        </Text>

        <ScrollArea h={300} viewportRef={viewport}>
          <Stack gap="xs" p="sm">
            {oocMessages.length === 0 ? (
              <Text size="sm" c="dimmed" fs="italic" ta="center">
                No messages yet. Say hi to your party!
              </Text>
            ) : (
              oocMessages.map((message) => (
                <Card key={message.id} withBorder padding="xs" style={{ backgroundColor: 'var(--mantine-color-grape-0)' }}>
                  <Group justify="space-between" mb={4}>
                    <Text fw={600} size="sm">
                      {message.profile?.player_name || 'Unknown'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </Text>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Text>
                </Card>
              ))
            )}
          </Stack>
        </ScrollArea>

        <TextInput
          placeholder="Chat with your party..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rightSection={
            <ActionIcon
              size="lg"
              variant="filled"
              color="grape"
              onClick={handleSend}
              disabled={!messageInput.trim()}
            >
              <PiPaperPlaneRight size={20} />
            </ActionIcon>
          }
        />
      </Stack>
    </Card>
  );
}
