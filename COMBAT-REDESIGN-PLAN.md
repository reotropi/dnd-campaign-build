# Combat Redesign: Structured State Approach

## Current Problems
1. ❌ Claude forgets which enemies are alive/dead
2. ❌ No enforced turn order
3. ❌ Players have to remind DM about game state
4. ❌ Inconsistent combat flow

## Solution: Structured Combat State

### Database Schema Addition

Add to `game_state` table:
```sql
ALTER TABLE game_state ADD COLUMN combat_state JSONB;
```

### Combat State Structure

```typescript
interface CombatState {
  active: boolean;
  round: number;
  turn_index: number; // Index in initiative_order

  initiative_order: CombatParticipant[]; // Sorted by initiative (high to low)

  combatants: {
    players: PlayerCombatant[];
    enemies: EnemyCombatant[];
  };
}

interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  type: 'player' | 'enemy';
}

interface PlayerCombatant {
  character_id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  conditions: string[]; // e.g., ['poisoned', 'prone']
}

interface EnemyCombatant {
  id: string; // Generated unique ID
  name: string; // e.g., "Giant Rat #1"
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  attack_bonus: number;
  damage_dice: string; // e.g., "1d4+2"
  is_alive: boolean;
  conditions: string[];
}
```

### New Combat Flow

#### 1. Combat Start
```
DM: "Combat starts!"
→ Claude uses new tool: init_combat(enemies: Enemy[])
→ System creates combat_state with enemies
→ System requests initiative from all players
→ After all rolls: System sorts initiative_order
→ System starts turn 1
```

#### 2. During Combat
```
Player Action → Claude processes with combat_state context
→ Claude returns structured JSON:
{
  narrative: "The goblin swings at you!",
  combat_updates: {
    damage: [{ target_id: "player1", amount: 5 }],
    conditions: [{ target_id: "enemy2", add: ["prone"] }],
    kill: ["enemy1"] // Mark enemy as dead
  }
}
→ System updates combat_state
→ System advances to next turn
```

#### 3. Turn Management
- UI shows "It's [Name]'s turn"
- Only active player can act
- System automatically advances turns
- DM narrates based on current state

### Benefits

✅ **State is persistent** - Claude can't forget
✅ **Turn order enforced** - UI prevents out-of-turn actions
✅ **Enemies tracked** - System knows who's alive/dead
✅ **Claude focuses on narrative** - System handles mechanics
✅ **Easier debugging** - State is visible in DB

### Implementation Steps

1. Add `combat_state` column to `game_state` table
2. Create combat management tool for Claude:
   - `init_combat(enemies)`
   - `update_combat(changes)`
   - `end_combat()`
3. Update Claude prompt to use structured updates
4. Create UI components:
   - Combat tracker (shows turn order, HP)
   - Turn indicator
   - End turn button
5. Update game loop to advance turns automatically

### Example Claude Response (New Format)

```json
{
  "narrative": "Tikus #2 lunges at Gorak! [Attack: 1d20+4 = 18] - HIT! The rat's teeth sink into your arm! [Damage: 1d4+2 = 6]",
  "combat_update": {
    "damage_dealt": [
      { "target_id": "gorak_char_id", "amount": 6 }
    ],
    "enemies_killed": [],
    "turn_complete": true
  },
  "roll_prompt": {
    "character_name": "Gorak",
    "description": "It's your turn! What do you do?"
  }
}
```

This separates:
- **Narrative** (for display)
- **Mechanics** (for state update)
- **Next action** (for UI)

