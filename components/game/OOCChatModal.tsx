'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal, Stack, TextInput, ScrollArea, Text, Group, Badge, ActionIcon } from '@mantine/core';
import { PiPaperPlaneRight } from 'react-icons/pi';
import { MessageWithDetails } from '@/types';

interface OOCChatModalProps {
  opened: boolean;
  onClose: () => void;
  messages: MessageWithDetails[];
  onSendMessage: (content: string) => void;
  unreadCount?: number;
}

export function OOCChatModal({ opened, onClose, messages, onSendMessage }: OOCChatModalProps) {
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={700} size="lg">
            Player Chat
          </Text>
          <Badge size="sm" variant="light" color="grape">
            OOC
          </Badge>
        </Group>
      }
      size="lg"
      styles={{
        body: { padding: 0 },
      }}
    >
      <Stack gap={0} h="70vh">
        {/* Description */}
        <Text size="xs" c="dimmed" px="md" pt="xs" pb="sm">
          Chat with other players without triggering DM responses
        </Text>

        {/* Messages Area */}
        <ScrollArea flex={1} viewportRef={viewport} px="md">
          <Stack gap="xs" py="sm">
            {oocMessages.length === 0 ? (
              <Text size="sm" c="dimmed" fs="italic" ta="center" py="xl">
                No messages yet. Say hi to your party!
              </Text>
            ) : (
              oocMessages.map((message) => (
                <Group
                  key={message.id}
                  align="flex-start"
                  gap="xs"
                  p="sm"
                  style={{
                    backgroundColor: 'var(--mantine-color-grape-0)',
                    borderRadius: 'var(--mantine-radius-md)',
                  }}
                >
                  <Stack gap={4} flex={1}>
                    <Group justify="space-between">
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
                  </Stack>
                </Group>
              ))
            )}
          </Stack>
        </ScrollArea>

        {/* Input Area */}
        <Group gap="xs" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
          <TextInput
            flex={1}
            placeholder="Chat with your party..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            size="md"
          />
          <ActionIcon
            size="lg"
            variant="filled"
            color="grape"
            onClick={handleSend}
            disabled={!messageInput.trim()}
          >
            <PiPaperPlaneRight size={20} />
          </ActionIcon>
        </Group>
      </Stack>
    </Modal>
  );
}
