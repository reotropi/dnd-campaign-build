'use client';

import { Group, Button, Indicator } from '@mantine/core';
import { PiChatCircle, PiDiceFive } from 'react-icons/pi';

interface MobileActionButtonsProps {
  onOpenOOC: () => void;
  onOpenDice: () => void;
  oocUnreadCount: number;
  diceEnabled: boolean;
}

export function MobileActionButtons({
  onOpenOOC,
  onOpenDice,
  oocUnreadCount,
  diceEnabled
}: MobileActionButtonsProps) {
  return (
    <Group
      gap="xs"
      grow
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px',
        backgroundColor: 'var(--mantine-color-body)',
        borderTop: '1px solid var(--mantine-color-gray-3)',
        zIndex: 100,
      }}
    >
      {/* OOC Chat Button */}
      <Indicator
        inline
        label={oocUnreadCount}
        size={20}
        disabled={oocUnreadCount === 0}
        color="grape"
      >
        <Button
          onClick={onOpenOOC}
          variant="light"
          color="grape"
          size="lg"
          leftSection={<PiChatCircle size={20} />}
          fullWidth
        >
          OOC Chat
        </Button>
      </Indicator>

      {/* Dice Roll Button */}
      <Button
        onClick={onOpenDice}
        variant="light"
        color="blue"
        size="lg"
        leftSection={<PiDiceFive size={20} />}
        disabled={!diceEnabled}
        fullWidth
      >
        Roll Dice
      </Button>
    </Group>
  );
}
