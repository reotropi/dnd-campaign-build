/**
 * Example: How to import the character JSON into the database
 *
 * Usage in your API route or component:
 */

import { supabaseAdmin } from '@/lib/supabase';
import { mapCharacterToDatabase } from '@/lib/character-mapper';

// Your character data
const externalCharacterData = {
  "character_name": "Hank",
  "class": "Ranger",
  "level": 1,
  "hp_current": 14,
  "hp_max": 14,
  "ac": 14,
  "initiative": 4,
  "proficiency": 2,
  "race": "Human",
  "stats": {
    "strength": 12,
    "dexterity": 14,
    "constitution": 14,
    "intelligence": 10,
    "wisdom": 13,
    "charisma": 10
  },
  "skills": {
    "acrobatics": 4,
    "animal_handling": 1,
    "arcana": 0,
    "athletics": 3,
    "deception": 0,
    "history": 0,
    "insight": 3,
    "intimidation": 0,
    "investigation": 0,
    "medicine": 1,
    "nature": 0,
    "perception": 3,
    "performance": 0,
    "persuasion": 0,
    "religion": 0,
    "sleight_of_hand": 2,
    "stealth": 4,
    "survival": 3
  },
  "weapons": [
    {
      "name": "Longbow",
      "type": "ranged",
      "damage_dice": "1d8",
      "damage_type": "piercing",
      "damage_bonus": 2,
      "attack_bonus": 4,
      "range": "150/600",
      "properties": ["ammunition", "heavy", "two-handed"]
    },
    {
      "name": "Shortsword",
      "type": "melee",
      "damage_dice": "1d6",
      "damage_type": "piercing",
      "damage_bonus": 2,
      "attack_bonus": 4,
      "properties": ["finesse", "light"]
    }
  ],
  "spells": [
    {
      "name": "Hunter's Mark",
      "level": 1,
      "school": "divination",
      "casting_time": "1 bonus action",
      "range": "90 feet",
      "duration": "Concentration, up to 1 hour",
      "description": "You choose a creature you can see within range and mystically mark it as your quarry. Until the spell ends, you deal an extra 1d6 damage to the target whenever you hit it with a weapon attack.",
      "damage_dice": "1d6",
      "damage_type": "same as weapon"
    }
  ],
  "spell_slots_max": {
    "1": 3,
    "2": 0,
    "3": 0
  },
  "spell_slots_current": {
    "1": 2,
    "2": 0,
    "3": 0
  },
  "equipment": [
    {
      "name": "Studded Leather Armor",
      "type": "armor",
      "ac_bonus": 12,
      "weight": 13
    },
    {
      "name": "Longbow",
      "type": "weapon",
      "weight": 2
    },
    {
      "name": "Arrows",
      "type": "ammunition",
      "quantity": 20,
      "weight": 1
    }
  ],
  "saving_throws": {
    "strength": 3,
    "dexterity": 4,
    "constitution": 2,
    "intelligence": 0,
    "wisdom": 1,
    "charisma": 0
  },
  "passive_perception": 13,
  "passive_investigation": 10,
  "passive_insight": 13,
  "conditions": [],
  "notes": "Human Ranger, first D&D character",
  "background": "Outlander",
  "alignment": "Neutral Good"
};

// Example function to import character
async function importCharacter(
  characterData: typeof externalCharacterData,
  sessionId: string,
  createdBy: string
) {
  try {
    // Transform to database format
    const dbCharacter = mapCharacterToDatabase(
      characterData,
      sessionId,
      createdBy
    );

    // Insert into database using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('characters')
      .insert(dbCharacter)
      .select()
      .single();

    if (error) throw error;

    console.log('Character imported successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to import character:', error);
    throw error;
  }
}

// Example usage:
// importCharacter(externalCharacterData, 'session-uuid-here', 'user-uuid-here');

export { externalCharacterData, importCharacter };
