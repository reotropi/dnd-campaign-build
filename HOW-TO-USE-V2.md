# How to Use V2 System (Drop-in Replacement)

## 🎯 Quick Start

The V2 system is **100% compatible** with your existing frontend. You just need to change **one line** to test it!

### Option 1: Test on a Single Session

In `app/game/[sessionId]/page.tsx`, find this line:

```typescript
const response = await fetch('/api/claude', {
```

Change it to:

```typescript
const response = await fetch('/api/claude-v2', {
```

That's it! Everything else stays the same.

### Option 2: Test on New Sessions Only

Keep old sessions using `/api/claude` and new sessions using `/api/claude-v2`.

## 📊 What's Different (Under the Hood)

| Aspect | Old (/api/claude) | New (/api/claude-v2) |
|--------|------------------|---------------------|
| Claude output | Tool calls | Pure JSON |
| Hallucinations | Common | Rare |
| Spells/Skills | Supported | Disabled (for now) |
| Combat | Complex | Simple & reliable |
| Interface | Same | Same (compatible!) |

## ✅ Compatibility

**Frontend doesn't change at all!**

The `/api/claude-v2` endpoint:
- ✅ Accepts the same request format
- ✅ Returns the same response format
- ✅ Works with your existing DiceRoller
- ✅ Works with your existing ChatBox
- ✅ Works with your existing message system

**Request format (same):**
```typescript
{
  session_id: string;
  user_id: string;
  user_message?: string;
  roll_data?: RollData; // Your existing RollData type
  character_name?: string;
}
```

**Response format (same):**
```typescript
{
  content: string;        // DM's narrative
  rollPrompts?: Array<{   // Exactly like before
    character_name: string;
    roll_type: string;
    description: string;
  }>;
}
```

## 🧪 Test Checklist

1. **Start a new game session**
   - Create session
   - Add characters
   - Start game

2. **Change ONE line in page.tsx**
   ```typescript
   // OLD:
   const response = await fetch('/api/claude', {

   // NEW:
   const response = await fetch('/api/claude-v2', {
   ```

3. **Test basic combat:**
   - Say: "I attack the rats!"
   - DM should initialize combat (JSON-based)
   - Roll initiative when prompted
   - Roll attacks and damage
   - Watch enemy turn (auto-rolls)
   - Combat ends when all enemies dead

4. **Check console logs:**
   - Look for `[Claude V2]` logs
   - Should see parsed JSON responses
   - No errors about invalid JSON

## 🐛 Troubleshooting

### "Invalid JSON" error
- Check server console for full Claude response
- Claude might have added text before/after JSON
- The parser tries to extract JSON from markdown

### Empty response
- Check if Claude returned valid JSON
- Look at `[Claude V2] Response:` log
- Verify system prompt is correct

### Combat not starting
- Check `combat_state` in database
- Verify `start_combat` was in response
- Check server logs for errors

## 📝 Limitations (V2)

For now, V2 is **simplified for reliability**:

- ❌ No spells (will add back later)
- ❌ No skill checks (will add back later)
- ✅ Just combat: attack rolls, damage, HP
- ✅ Perfect for testing combat flow

## 🔄 Switching Back

If V2 doesn't work well, just change back:

```typescript
const response = await fetch('/api/claude', {
```

Both systems work side-by-side. No data is lost.

## 🎯 Goal

**Get ONE perfect combat working.**

Once combat is rock-solid with V2:
- ✅ Add spells back (as JSON)
- ✅ Add skill checks (as JSON)
- ✅ Add conditions (as JSON)
- ✅ Keep everything structured!

## 💡 Why This Works Better

**Old way:**
```
Claude: "I'll use the apply_damage tool... oh wait, I forgot"
Result: ❌ State diverges from narrative
```

**New way:**
```json
{
  "narrative": "Rat takes 6 damage!",
  "combat_update": {
    "damage": [{"target_id": "rat_1", "amount": 6}]
  }
}
```
```
System: Parses JSON → Applies 6 damage automatically
Result: ✅ State always matches narrative
```

## 🚀 Next Steps

1. Try V2 on one test session
2. If it works well → gradually migrate
3. Report any issues
4. Once stable → add features back

Good luck! 🎲
