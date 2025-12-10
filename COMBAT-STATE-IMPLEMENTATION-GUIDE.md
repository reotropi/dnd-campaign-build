# Combat State Implementation Guide

## 🎯 Overview

This guide explains the new **Structured Combat State System** that has been implemented to fix the core issues with combat management:

### Problems Fixed:
- ❌ DM forgetting which enemies are alive/dead → ✅ System tracks all combatants
- ❌ No enforced turn order → ✅ Automatic turn advancement
- ❌ Players reminding DM about game state → ✅ Persistent state in database
- ❌ Inconsistent combat flow → ✅ Structured updates

## 📋 Implementation Steps

### Step 1: Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```bash
# Navigate to Supabase dashboard → SQL Editor → New query
# Copy and paste contents of: supabase/APPLY-THIS-add-combat-state.sql
```

This adds:
- `combat_state` JSONB column to `game_state` table
- Index for fast combat state queries
- RLS policy for combat state visibility

### Step 2: Apply Existing Fixes (If Not Already Applied)

If you haven't applied the previous fixes, run these as well:

```sql
-- In Supabase SQL Editor, run in order:
-- 1. supabase/APPLY-ALL-FIXES.sql (comprehensive fix for all issues)
```

This fixes:
- Guest visibility in lobby
- Profile name display
- Character access for guests
- Real-time updates

### Step 3: Restart Your Development Server

```bash
npm run dev
```

The new system will automatically be active!

## 🎮 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLAUDE AI                            │
│  (Focuses on narrative and storytelling)                    │
│                                                              │
│  Receives FULL combat state in context:                     │
│  • Current round & turn                                     │
│  • All living/dead enemies with HP/AC                       │
│  • Player HP and conditions                                 │
│  • Initiative order                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Uses new tools:
                 │ - init_combat(enemies)
                 │ - update_combat(changes)
                 │ - end_combat()
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMBAT STATE SYSTEM                       │
│  (Handles all game mechanics and state)                     │
├─────────────────────────────────────────────────────────────┤
│  • Tracks all combatant HP, AC, conditions                  │
│  • Manages turn order automatically                          │
│  • Skips dead enemies                                        │
│  • Persists in database (game_state.combat_state)          │
│  • Sent to Claude with every API call                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Real-time updates via Supabase
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                       UI COMPONENTS                          │
│  • Combat Tracker (shows turn order, HP, conditions)        │
│  • Auto-updates when combat state changes                   │
└─────────────────────────────────────────────────────────────┘
```

### Combat Flow

#### 1. Starting Combat

**Before (Old System):**
```
DM: "3 rats attack!"
→ DM tries to remember rat stats
→ Players roll initiative
→ DM forgets who rolled what
```

**After (New System):**
```
DM: "3 rats attack!"
→ Claude calls: init_combat([
    { name: "Giant Rat", count: 3, hp: 7, ac: 8,
      attack_bonus: 4, damage_dice: "1d4+2" }
  ])
→ System creates combat state with 3 unique enemies
→ System automatically requests initiative from ALL players
→ Players roll initiative → automatically recorded
→ DM rolls enemy initiative → automatically recorded
→ System creates turn order and starts Round 1
```

#### 2. During Combat

**Before (Old System):**
```
DM: "Rat #2 attacks Gorak... wait, which rat is still alive?"
Player: "You killed Rat #1 last turn, remember?"
DM: "Oh right..."
```

**After (New System):**
```
DM narrates: "Rat #2 lunges at Gorak! [Attack: 18] HIT! [Damage: 6]"
→ Claude calls: update_combat({
    damage_dealt: [{ target_id: "gorak_char_id", amount: 6 }],
    turn_complete: true
  })
→ System applies 6 damage to Gorak
→ System advances to next turn automatically
→ Combat Tracker UI updates in real-time
→ Dead enemies are automatically marked and skipped
```

#### 3. Turn Management

The system automatically:
- Advances turns when `turn_complete: true`
- Skips dead enemies
- Increments round number after full cycle
- Shows current turn in UI
- Ends combat when all enemies dead or all players dead

## 🔧 New Components

### 1. Type Definitions (`types/combat.ts`)

```typescript
interface CombatState {
  active: boolean;
  round: number;
  turn_index: number;
  initiative_order: CombatParticipant[];
  combatants: {
    players: PlayerCombatant[];
    enemies: EnemyCombatant[];
  };
}
```

### 2. API Endpoints

- **POST `/api/combat/init`** - Initialize combat with enemies
- **POST `/api/combat/update`** - Update damage, healing, conditions, deaths
- **POST `/api/combat/initiative`** - Add initiative rolls
- **POST `/api/combat/end`** - End combat encounter

### 3. Claude Tools

Claude now has 3 new tools:

**`init_combat`**
```json
{
  "enemies": [
    {
      "name": "Giant Rat",
      "count": 3,
      "hp": 7,
      "ac": 8,
      "attack_bonus": 4,
      "damage_dice": "1d4+2"
    }
  ]
}
```

**`update_combat`**
```json
{
  "damage_dealt": [
    { "target_id": "enemy_id_or_character_id", "amount": 6 }
  ],
  "enemies_killed": ["rat_1", "rat_2"],
  "conditions_added": [
    { "target_id": "player_id", "conditions": ["poisoned"] }
  ],
  "turn_complete": true
}
```

**`end_combat`**
```json
{}
```

### 4. UI Components

**CombatTracker** - Displays:
- Current round number
- Current turn indicator (highlighted)
- Initiative order (sorted high to low)
- HP bars for all combatants
- AC and conditions
- Dead enemies (grayed out with strikethrough)

**useCombatState Hook** - Provides:
- Real-time combat state
- Automatic updates via Supabase subscriptions

## 🎯 Usage Example

### Starting a Combat Encounter

When players enter combat, Claude will now:

1. Call `init_combat` with enemy details
2. System requests initiative from all players
3. Players roll initiative (automatically recorded)
4. Claude rolls enemy initiative using `roll_dice`
5. System creates turn order and displays Combat Tracker

### During Combat

Claude narrates while the system handles mechanics:

```
Narrative (Claude):
"Rat #2's beady eyes lock onto Gorak as it lunges forward, teeth bared!
[Attack roll: 1d20+4 = 18] - A hit! The rat's teeth sink into your arm!
[Damage: 1d4+2 = 6]"

System Update (Automatic):
→ 6 damage applied to Gorak
→ Gorak's HP bar updates in UI
→ Turn advances to next combatant
→ If Gorak at 0 HP, system handles death mechanics
```

### Ending Combat

When all enemies defeated:

```
Claude: "The last rat falls! Victory is yours!"
→ Calls: end_combat()
→ System clears combat state
→ Combat Tracker disappears from UI
→ Players can loot, rest, or continue adventure
```

## 🐛 Troubleshooting

### Combat State Not Showing

1. Check database migration applied:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'game_state' AND column_name = 'combat_state';
   ```

2. Check RLS policy:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'game_state';
   ```

### Initiative Not Recording

- Ensure character ID is correct
- Check browser console for errors
- Verify `/api/combat/initiative` endpoint is accessible

### Claude Not Using New Tools

- Clear browser cache
- Restart development server
- Check Claude prompt includes new combat system instructions

## 📝 Testing Checklist

- [ ] Start combat → `init_combat` called, Combat Tracker appears
- [ ] Players roll initiative → Automatically recorded
- [ ] DM rolls enemy initiative → Turn order displayed
- [ ] Enemy attacks player → Damage applied, HP updated
- [ ] Player kills enemy → Enemy marked dead and skipped
- [ ] All enemies dead → Combat ends automatically
- [ ] Multiple players see same combat state in real-time
- [ ] Guest players can see combat tracker

## 🚀 Benefits

### For Players:
- ✅ Visual combat tracker showing turn order
- ✅ Real-time HP updates for all combatants
- ✅ Clear indication of whose turn it is
- ✅ No need to remind DM about game state

### For DM (Claude):
- ✅ Focuses on narrative and storytelling
- ✅ No need to remember who's alive/dead
- ✅ Automatic turn management
- ✅ Structured state makes decisions easier

### For Developers:
- ✅ Clean separation of concerns
- ✅ Easy to debug (state visible in database)
- ✅ Extensible for future features
- ✅ Type-safe with TypeScript

## 🔮 Future Enhancements

Possible additions:
- [ ] Undo last action
- [ ] Combat log replay
- [ ] Save combat state for later
- [ ] Export combat statistics
- [ ] Status effect timers
- [ ] Area of effect damage tools
- [ ] Concentration tracking for spells

## 📖 API Reference

See [COMBAT-REDESIGN-PLAN.md](./COMBAT-REDESIGN-PLAN.md) for detailed architectural design.

---

**Questions?** Check the implementation files:
- Database: `supabase/APPLY-THIS-add-combat-state.sql`
- Types: `types/combat.ts`
- APIs: `app/api/combat/*`
- Components: `components/game/CombatTracker.tsx`
- Hook: `hooks/useCombatState.ts`
- Claude Integration: `lib/claude.ts`
