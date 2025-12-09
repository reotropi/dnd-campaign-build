# Character Library System - Migration Guide

## Overview

The character system has been redesigned to implement a **Character Library** concept:

- **Before**: Characters belonged to one session only, one-time use
- **After**: Characters are reusable across multiple sessions via a character pool

## Architecture

### Character Library
- All characters with `session_id = null` are in the global character library
- These characters can be added to multiple sessions

### Session Character Pool
- New `session_characters` junction table tracks which characters are available in each session
- Hosts manage which characters from the library are available for their session
- Players select from the session's character pool

### Character Selection
- Each character can only be selected once per session
- Same character can be used in different sessions simultaneously
- Selection is tracked via `session_members.character_id`

## Database Changes

### New Table: `session_characters`

Run this migration to create the junction table:

```bash
psql -h your-db-host -d your-db-name -f supabase/add-session-characters.sql
```

This creates:
- `session_characters` table (junction table)
- Indexes for performance
- Unique constraint to prevent duplicate character assignments

### Schema
```sql
CREATE TABLE session_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, character_id)
);
```

## How It Works

### 1. Character Creation
Characters are created without a `session_id` (they go into the library):

```typescript
// app/characters/new/page.tsx
// Import character with sessionId = null (or optionally set it)
POST /api/characters/import
{
  characterJson: {...},
  sessionId: null,  // Goes to library
  createdBy: user.id
}
```

### 2. Session Setup (Host)
Hosts add characters from their library to the session:

```typescript
// Add character to session pool
POST /api/sessions/{sessionId}/characters
{
  character_id: "character-uuid"
}

// Remove character from session pool
DELETE /api/sessions/{sessionId}/characters?character_id=character-uuid
```

### 3. Player Selection
Players choose from the session's available characters:

```typescript
// app/sessions/[id]/lobby/page.tsx
// Fetches characters from session_characters junction table
GET /api/sessions/{sessionId}/characters

// Player selects character
POST /api/characters/{characterId}/assign
{
  session_id: "session-uuid"
}
```

## Key Components

### SessionCharacterManager
- **File**: `components/session/SessionCharacterManager.tsx`
- **Purpose**: UI for hosts to manage session character pool
- **Features**:
  - View characters in session
  - Add characters from library
  - Remove characters from session

### Updated SessionLobby
- **File**: `components/session/SessionLobby.tsx`
- **Changes**:
  - Includes SessionCharacterManager for hosts
  - Shows session-specific character pool
  - Players select from available pool

### Updated Lobby Page
- **File**: `app/sessions/[id]/lobby/page.tsx`
- **Changes**:
  - Fetches from `session_characters` API
  - Real-time updates via Supabase subscription
  - Filters out already-selected characters

## API Endpoints

### `GET /api/sessions/[id]/characters`
Fetch all characters in a session's pool

**Response:**
```json
{
  "characters": [
    {
      ...characterData,
      "session_character_id": "uuid",
      "added_to_session_at": "timestamp"
    }
  ]
}
```

### `POST /api/sessions/[id]/characters`
Add character to session pool (host only)

**Request:**
```json
{
  "character_id": "uuid"
}
```

### `DELETE /api/sessions/[id]/characters?character_id=uuid`
Remove character from session pool (host only)

### `POST /api/characters/[id]/assign`
Player selects a character from the session pool

**Request:**
```json
{
  "session_id": "uuid"
}
```

**Validation:**
- Character must be in session's pool (`session_characters`)
- Character not already selected by another player
- Updates `session_members.character_id`

## Benefits

### Reusability
- Characters can be used in multiple campaigns
- Build a library of characters over time
- No need to recreate characters

### Flexibility
- Host controls which characters are available
- Easy to add/remove characters from sessions
- Characters remain in library after session ends

### Simplicity
- Clear separation: library vs session pool vs player selection
- Players only see relevant characters
- No confusion about character availability

## Migration Steps

1. **Run database migration**
   ```bash
   psql -h your-host -d your-db -f supabase/add-session-characters.sql
   ```

2. **Deploy code changes**
   - All modified files are already in place
   - No code changes needed

3. **For existing sessions** (if any):
   - Existing characters with `session_id` set will still work
   - To use new system, add them to `session_characters` table:
   ```sql
   INSERT INTO session_characters (session_id, character_id, added_by)
   SELECT session_id, id, created_by
   FROM characters
   WHERE session_id IS NOT NULL;
   ```

4. **Test workflow**:
   1. Create character (goes to library)
   2. Host creates session
   3. Host adds characters to session
   4. Players join and select characters
   5. Start game!

## Notes

- The `is_assigned` field is no longer used for session-based assignment
- `session_id` on characters is now nullable (already migrated via `make-session-optional.sql`)
- Characters without `session_id` are in the global library
- Real-time updates work via Supabase subscriptions
