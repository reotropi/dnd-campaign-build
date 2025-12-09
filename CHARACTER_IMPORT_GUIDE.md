# Character Import Guide

This guide explains how to import D&D characters into the campaign manager.

## Import Methods

### Method 1: Manual Entry

1. Navigate to "Create Character"
2. Select "Manual Entry" tab
3. Fill in all fields:
   - Basic Info: Name, Class, Level, Race, Background
   - Stats: HP, AC, Ability Scores
   - Combat: Proficiency Bonus
   - Notes: Additional information

### Method 2: JSON Import

JSON import allows you to quickly add characters with complete details including spells, weapons, and features.

## JSON Schema

Here's the structure for character JSON:

```json
{
  "name": "Character Name",
  "class": "Fighter",
  "level": 5,
  "race": "Human",
  "background": "Soldier",
  "max_hp": 45,
  "armor_class": 18,
  "strength": 16,
  "dexterity": 14,
  "constitution": 15,
  "intelligence": 10,
  "wisdom": 12,
  "charisma": 8,
  "proficiency_bonus": 3,
  "skills": {
    "athletics": 6,
    "intimidation": 2,
    "perception": 4
  },
  "weapons": [
    {
      "name": "Longsword",
      "damage_dice": "1d8",
      "damage_type": "slashing",
      "attack_bonus": 6,
      "properties": ["versatile"]
    }
  ],
  "spells": [],
  "spell_slots": {},
  "features": [
    {
      "name": "Second Wind",
      "description": "Regain 1d10 + 5 HP as a bonus action",
      "source": "Class"
    }
  ],
  "inventory": [
    {
      "name": "Health Potion",
      "quantity": 2,
      "description": "Heals 2d4+2 HP"
    }
  ],
  "notes": "A veteran soldier seeking redemption"
}
```

## Using Claude to Parse Character Sheets

You can use Claude (at claude.ai) to convert character sheets into JSON format.

### Step 1: Prepare Your Character Sheet

Have your character information ready in any format:
- D&D Beyond export
- Plain text description
- PDF character sheet
- Handwritten notes (typed out)

### Step 2: Use This Prompt in Claude

```
I need to convert this D&D 5e character into JSON format for my campaign manager.

Here's the character information:
[PASTE YOUR CHARACTER DETAILS HERE]

Please convert this into JSON following this exact schema:
{
  "name": "string",
  "class": "string",
  "level": number,
  "race": "string (optional)",
  "background": "string (optional)",
  "max_hp": number,
  "armor_class": number,
  "strength": number,
  "dexterity": number,
  "constitution": number,
  "intelligence": number,
  "wisdom": number,
  "charisma": number,
  "proficiency_bonus": number,
  "skills": {
    "skill_name": bonus_number
  },
  "weapons": [
    {
      "name": "string",
      "damage_dice": "string (e.g., 1d8)",
      "damage_type": "string",
      "attack_bonus": number,
      "properties": ["array", "of", "strings"]
    }
  ],
  "spells": [
    {
      "name": "string",
      "level": number,
      "school": "string",
      "casting_time": "string",
      "range": "string",
      "components": "string",
      "duration": "string",
      "description": "string",
      "damage": "string (optional)",
      "save_dc": number (optional)
    }
  ],
  "spell_slots": {
    "level_1": number,
    "level_2": number
  },
  "features": [
    {
      "name": "string",
      "description": "string",
      "source": "string"
    }
  ],
  "inventory": [
    {
      "name": "string",
      "quantity": number,
      "description": "string (optional)"
    }
  ],
  "notes": "string (optional)"
}

Please provide only the valid JSON, no additional text.
```

### Step 3: Copy the Result

1. Claude will generate the JSON
2. Copy the entire JSON output
3. Paste it into the JSON Import tab in the app

## Example Characters

### Example 1: Simple Fighter

```json
{
  "name": "Gorak the Brave",
  "class": "Fighter",
  "level": 3,
  "race": "Half-Orc",
  "background": "Soldier",
  "max_hp": 28,
  "armor_class": 16,
  "strength": 17,
  "dexterity": 12,
  "constitution": 15,
  "intelligence": 8,
  "wisdom": 10,
  "charisma": 9,
  "proficiency_bonus": 2,
  "skills": {
    "athletics": 5,
    "intimidation": 1,
    "survival": 2
  },
  "weapons": [
    {
      "name": "Greataxe",
      "damage_dice": "1d12",
      "damage_type": "slashing",
      "attack_bonus": 5
    }
  ],
  "features": [
    {
      "name": "Relentless Endurance",
      "description": "When reduced to 0 HP, drop to 1 HP instead (once per long rest)",
      "source": "Race"
    },
    {
      "name": "Action Surge",
      "description": "Take an additional action on your turn",
      "source": "Class"
    }
  ]
}
```

### Example 2: Wizard with Spells

```json
{
  "name": "Elara Moonwhisper",
  "class": "Wizard",
  "level": 5,
  "race": "High Elf",
  "background": "Sage",
  "max_hp": 28,
  "armor_class": 12,
  "strength": 8,
  "dexterity": 14,
  "constitution": 13,
  "intelligence": 18,
  "wisdom": 12,
  "charisma": 10,
  "proficiency_bonus": 3,
  "skills": {
    "arcana": 7,
    "history": 7,
    "investigation": 7,
    "perception": 4
  },
  "weapons": [
    {
      "name": "Quarterstaff",
      "damage_dice": "1d6",
      "damage_type": "bludgeoning",
      "attack_bonus": 1
    }
  ],
  "spells": [
    {
      "name": "Fireball",
      "level": 3,
      "school": "Evocation",
      "casting_time": "1 action",
      "range": "150 feet",
      "components": "V, S, M",
      "duration": "Instantaneous",
      "description": "A bright streak flashes to a point you choose, then blossoms into an explosion of flame.",
      "damage": "8d6",
      "save_dc": 15
    },
    {
      "name": "Mage Armor",
      "level": 1,
      "school": "Abjuration",
      "casting_time": "1 action",
      "range": "Touch",
      "components": "V, S, M",
      "duration": "8 hours",
      "description": "You touch a willing creature who isn't wearing armor, and a protective magical force surrounds it."
    }
  ],
  "spell_slots": {
    "level_1": 4,
    "level_2": 3,
    "level_3": 2
  },
  "features": [
    {
      "name": "Arcane Recovery",
      "description": "Recover spell slots during short rest",
      "source": "Class"
    }
  ],
  "inventory": [
    {
      "name": "Spellbook",
      "quantity": 1,
      "description": "Contains 20 spells"
    },
    {
      "name": "Component Pouch",
      "quantity": 1
    }
  ]
}
```

## Field Explanations

### Required Fields

- **name**: Character's name
- **class**: D&D class (Fighter, Wizard, etc.)
- **level**: Character level (1-20)
- **max_hp**: Maximum hit points
- **armor_class**: AC value
- **strength** through **charisma**: Ability scores (1-30)
- **proficiency_bonus**: Proficiency bonus (usually 2-6)

### Optional Fields

- **race**: Character's race
- **background**: Character's background
- **skills**: Object mapping skill names to bonuses
- **weapons**: Array of weapon objects
- **spells**: Array of spell objects
- **spell_slots**: Object mapping spell levels to slot counts
- **features**: Array of class/race features
- **inventory**: Array of items
- **notes**: Free-form notes

## Tips for Successful Import

1. **Validate JSON**: Use a JSON validator before importing
2. **Check Numbers**: Ensure all numeric fields are numbers, not strings
3. **Spell Names**: Use official D&D spell names
4. **Skill Names**: Use lowercase with underscores (e.g., `sleight_of_hand`)
5. **Keep It Simple**: Start with basic info, add details later

## Common Errors

### Invalid JSON Format
```
Error: Unexpected token
```
**Solution**: Check for missing commas, quotes, or brackets

### Missing Required Field
```
Error: name is required
```
**Solution**: Ensure all required fields are present

### Invalid Data Type
```
Error: max_hp must be a number
```
**Solution**: Remove quotes from numeric values

## Advanced: Bulk Import

To import multiple characters at once:

1. Create an array of character objects
2. Save as JSON file
3. Contact the host to manually import via API

## Support

If you have issues importing characters:
1. Validate your JSON at jsonlint.com
2. Check the console for error messages
3. Try manual entry first
4. Review the example characters above
