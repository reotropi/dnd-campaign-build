'use client';

import { useState, useRef, useEffect } from 'react';
import { Stack, TextInput, Button, ScrollArea } from '@mantine/core';
import { MessageWithDetails, RollData } from '@/types';
import { ChatMessage } from './ChatMessage';

interface ChatBoxProps {
  messages: MessageWithDetails[];
  onSendMessage: (content: string, rollData?: RollData) => void;
  onSendRoll: (content: string, rollData: RollData) => void;
}

export function ChatBox({ messages, onSendMessage, onSendRoll }: ChatBoxProps) {
  const [messageInput, setMessageInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

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
    <Stack gap="md" style={{ height: '100%' }}>
      <ScrollArea h={400} viewportRef={viewport}>
        <Stack gap="sm" p="sm">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </Stack>
      </ScrollArea>

      <div>
        <TextInput
          placeholder="Type your action or message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rightSection={
            <Button size="xs" onClick={handleSend}>
              Send
            </Button>
          }
        />
      </div>
    </Stack>
  );
}
