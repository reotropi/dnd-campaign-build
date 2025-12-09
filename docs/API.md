# API Documentation

Complete API reference for the D&D Campaign Manager.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require authentication via Supabase Auth.

### Headers

```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

## Characters

### Create Character

**POST** `/characters`

Create a new character.

**Request Body:**
```json
{
  "name": "Aida",
  "class": "Fighter",
  "level": 5,
  "race": "Human",
  "max_hp": 45,
  "armor_class": 18,
  "strength": 16,
  "dexterity": 14,
  "constitution": 15,
  "intelligence": 10,
  "wisdom": 12,
  "charisma": 8,
  "proficiency_bonus": 3
}
```

**Response:**
```json
{
  "character": {
    "id": "uuid",
    "created_by": "user_id",
    "name": "Aida",
    ...
  }
}
```

### Get Character

**GET** `/characters/[id]`

Get character details.

**Response:**
```json
{
  "character": {
    "id": "uuid",
    "name": "Aida",
    ...
  }
}
```

### Update Character

**PUT** `/characters/[id]`

Update character data.

**Request Body:**
```json
{
  "current_hp": 30,
  "spell_slots": {
    "level_1": 2
  }
}
```

### Delete Character

**DELETE** `/characters/[id]`

Delete a character.

**Response:**
```json
{
  "success": true
}
```

### Assign Character

**POST** `/characters/[id]/assign`

Assign character to current user.

**Request Body:**
```json
{
  "session_id": "uuid"
}
```

**Response:**
```json
{
  "character": {
    "id": "uuid",
    "user_id": "assigned_user_id",
    "is_assigned": true
  }
}
```

## Sessions

### Create Session

**POST** `/sessions/create`

Create a new game session.

**Request Body:**
```json
{
  "campaign_name": "Lost Mine of Phandelver",
  "max_players": 6,
  "character_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "session_code": "ABC-123",
    "status": "lobby",
    ...
  },
  "session_code": "ABC-123"
}
```

### Join Session

**POST** `/sessions/join`

Join an existing session.

**Request Body:**
```json
{
  "session_code": "ABC-123"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    ...
  },
  "member": {
    "id": "uuid",
    "user_id": "uuid",
    "session_id": "uuid",
    "is_ready": false
  }
}
```

### Get Session

**GET** `/sessions/[id]`

Get session details.

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "campaign_name": "Lost Mine",
    "status": "active",
    ...
  }
}
```

### Update Session

**PATCH** `/sessions/[id]`

Update session data.

**Request Body:**
```json
{
  "status": "paused"
}
```

### Start Session

**POST** `/sessions/[id]/start`

Start the game (host only).

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "status": "active",
    "started_at": "2024-01-01T00:00:00Z"
  }
}
```

### End Session

**POST** `/sessions/[id]/end`

End the game (host only).

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "status": "ended",
    "ended_at": "2024-01-01T00:00:00Z"
  }
}
```

## AI / Claude

### Get DM Response

**POST** `/claude`

Get a response from the AI Dungeon Master.

**Request Body:**
```json
{
  "session_id": "uuid",
  "user_message": "I attack the goblin!",
  "roll_data": {
    "roll_type": "attack",
    "total": 18,
    "character_name": "Aida"
  }
}
```

**Response:**
```json
{
  "content": "Your blade strikes true! The goblin staggers back...",
  "rollPrompt": {
    "character_name": "Aida",
    "roll_type": "damage",
    "description": "Roll damage for your longsword attack"
  }
}
```

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Only the host can perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Session not found"
}
```

### 400 Bad Request
```json
{
  "error": "Session code is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create session"
}
```

## Rate Limits

- Standard endpoints: 100 requests/minute
- Claude API: 10 requests/minute
- Authentication: 20 requests/minute

## Webhooks

Currently not implemented. Future feature.

## WebSocket Events

### Real-time Subscriptions

Using Supabase Realtime:

```typescript
// Subscribe to session messages
supabase
  .channel(`messages:${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();
```

### Available Channels

- `messages:{session_id}`: Chat messages
- `characters:{character_id}`: Character updates
- `sessions:{session_id}`: Session status
- `session_members:{session_id}`: Member updates

## Testing

### Using cURL

```bash
# Create character
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test","class":"Fighter","level":1,...}'

# Join session
curl -X POST http://localhost:3000/api/sessions/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"session_code":"ABC-123"}'
```

### Using Postman

1. Import OpenAPI spec (if available)
2. Set Authorization header with Supabase token
3. Set environment variables for base URL

## SDK Usage

While there's no official SDK, you can create typed API clients:

```typescript
// lib/api.ts
export async function createCharacter(data: CharacterImportData) {
  const response = await fetch('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create character');
  }

  return response.json();
}
```

## Versioning

Currently v1 (implicit). Future versions may use:
- `/api/v2/...` URL versioning
- `Accept: application/vnd.dnd.v2+json` header versioning

## Changelog

### v1.0.0 (2024)
- Initial API release
- Character CRUD
- Session management
- Claude AI integration
- Real-time messaging

## Support

For API issues:
- Check response status codes
- Review error messages
- Check server logs
- Verify authentication
- Test with cURL/Postman
