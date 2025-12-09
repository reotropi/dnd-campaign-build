'use client';

import { useState, useEffect } from 'react';
import { RollType, AdvantageType, Character, RollData, RollPrompt } from '@/types';
import { executeRoll } from '@/lib/dice';

export function useDiceRoller(character: Character | null, rollPrompt: RollPrompt | null) {
  const [isLocked, setIsLocked] = useState(false);
  const [rollType, setRollType] = useState<RollType>('custom');
  const [advantageType, setAdvantageType] = useState<AdvantageType>('normal');
  const [customModifier, setCustomModifier] = useState(0);
  const [lastRoll, setLastRoll] = useState<RollData | null>(null);

  // Update roll type when DM prompts for a roll
  useEffect(() => {
    if (rollPrompt && character && rollPrompt.character_name === character.name) {
      setRollType(rollPrompt.roll_type);
      setIsLocked(false); // Unlock for new roll
    }
  }, [rollPrompt, character]);

  const canRoll = (): boolean => {
    if (!character) return false;
    if (isLocked) return false;
    if (!rollPrompt) return true; // Allow free rolling when DM hasn't prompted
    return rollPrompt.character_name === character.name;
  };

  const roll = (): RollData | null => {
    if (!canRoll() || !character) return null;

    const rollData = executeRoll(character, rollType, advantageType, customModifier);
    setLastRoll(rollData);

    // Only lock if there was a roll prompt (DM requested it)
    if (rollPrompt && rollPrompt.character_name === character.name) {
      setIsLocked(true);
    }

    return rollData;
  };

  const reset = () => {
    setIsLocked(false);
    setAdvantageType('normal');
    setCustomModifier(0);
    setLastRoll(null);
  };

  return {
    isLocked,
    rollType,
    setRollType,
    advantageType,
    setAdvantageType,
    customModifier,
    setCustomModifier,
    lastRoll,
    canRoll: canRoll(),
    roll,
    reset,
  };
}
