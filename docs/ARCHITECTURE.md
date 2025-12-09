# System Architecture

## Overview

The D&D AI Campaign Manager is built as a modern web application with real-time capabilities, AI integration, and a robust database layer.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Next.js    │  │   Mantine    │  │   React      │     │
│  │   Pages      │  │   UI         │  │   Hooks      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Sessions   │  │   Claude     │     │
│  │   API        │  │   API        │  │   API        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ↓                    ↓                    ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│    Supabase      │  │    Supabase      │  │   Anthropic  │
│    Auth          │  │    Database      │  │   Claude API │
│                  │  │   + Realtime     │  │              │
└──────────────────┘  └──────────────────┘  └──────────────┘
```

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Mantine 7.5**: UI component library
- **Tailwind CSS**: Utility-first styling
- **React Hooks**: State and effect management

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Supabase**: Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Row Level Security
- **Anthropic Claude**: AI Dungeon Master

### Infrastructure
- **Vercel**: Hosting and deployment
- **Supabase Cloud**: Database hosting
- **CDN**: Asset delivery

## Data Flow

### 1. Authentication Flow

```
User → Register/Login Form → Next.js API → Supabase Auth
                                                 ↓
User ← Dashboard ← Profile Created ← Profiles Table
```

### 2. Session Creation Flow

```
Host → Create Session Form → API Route
                                 ↓
                           Generate Code
                                 ↓
                           Create Session
                                 ↓
                    Add Characters to Session
                                 ↓
Host ← Lobby Page ← Session Created ← Database
```

### 3. Game Play Flow

```
Player → Action/Roll → Chat Component → API Route
                                           ↓
                                     Save Message
                                           ↓
                                     Claude API
                                           ↓
DM Response ← All Players ← Real-time ← Database
```

## Database Schema

### Core Tables

#### profiles
- User metadata
- Links to auth.users
- Stores player name

#### sessions
- Game session data
- Host reference
- Session code
- Status tracking

#### characters
- Character stats
- Owner (created_by)
- Assignment (user_id)
- JSON fields for complex data

#### session_members
- Session participation
- Character assignment
- Ready status

#### messages
- Chat history
- Roll data
- DM narration

#### game_state
- Combat tracking
- Turn order
- Quest objectives

## Security Model

### Row Level Security (RLS)

All tables use RLS policies to ensure data privacy:

1. **Profiles**: Users see only their own profile
2. **Characters**:
   - Creators see full details
   - Assigned users see full details
   - Session members see public info only
3. **Sessions**: Members and hosts only
4. **Messages**: Session members only
5. **Game State**: Session members only

### API Security

- Authentication required for all protected routes
- Host verification for admin actions
- Input validation and sanitization
- Rate limiting (via Vercel)

## Real-time Features

### Supabase Realtime

Used for:
- Chat messages
- Character HP updates
- Session status changes
- Player ready status
- Turn indicators

### Implementation

```typescript
// Subscribe to channel
const channel = supabase
  .channel('session:123')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: 'session_id=eq.123'
  }, (payload) => {
    // Handle new message
  })
  .subscribe();
```

## AI Integration

### Claude API Flow

1. **Gather Context**:
   - Session info
   - Characters in party
   - Recent messages
   - Game state

2. **Build Prompt**:
   - System instructions
   - Character list
   - Current situation
   - Player action

3. **Get Response**:
   - Call Claude API
   - Parse response
   - Extract roll prompts

4. **Store & Broadcast**:
   - Save DM message
   - Real-time to all players

### Context Management

- Last 10 messages included
- Character stats available
- Game state (location, objectives)
- Previous rolls incorporated

## Component Architecture

### Layout Components
- `Navbar`: Top navigation
- `ProtectedRoute`: Auth wrapper

### Feature Components

#### Authentication
- `LoginForm`
- `RegisterForm`

#### Characters
- `CharacterCard`: Display card
- `CharacterForm`: Create/edit
- `CharacterSheet`: Full details
- `CharacterSelector`: Player selection

#### Sessions
- `SessionCard`: Session display
- `CreateSessionForm`: Host creation
- `JoinSessionModal`: Player join
- `SessionLobby`: Pre-game lobby

#### Game
- `DMNarration`: DM messages
- `CharacterPanel`: Player stats
- `DiceRoller`: Dice interface
- `ChatBox`: Message input
- `ChatMessage`: Message display
- `RollDisplay`: Roll visualization
- `PartyMembers`: Party list
- `HostControls`: Host panel

## State Management

### React Hooks Pattern

Custom hooks for data:
- `useAuth`: Authentication
- `useCharacter`: Character data
- `useSession`: Session data
- `useGameChat`: Messages
- `useDiceRoller`: Dice state

### Real-time Sync

- Supabase subscriptions in hooks
- Automatic state updates
- Optimistic UI updates

## API Endpoints

### Authentication
- `POST /api/auth/callback`: OAuth callback

### Characters
- `POST /api/characters`: Create character
- `GET /api/characters/[id]`: Get character
- `PUT /api/characters/[id]`: Update character
- `DELETE /api/characters/[id]`: Delete character
- `POST /api/characters/[id]/assign`: Assign to player

### Sessions
- `POST /api/sessions/create`: Create session
- `POST /api/sessions/join`: Join session
- `GET /api/sessions/[id]`: Get session
- `PATCH /api/sessions/[id]`: Update session
- `POST /api/sessions/[id]/start`: Start game
- `POST /api/sessions/[id]/end`: End game

### AI
- `POST /api/claude`: Get DM response

## Performance Optimizations

### Frontend
- Code splitting via Next.js
- Component lazy loading
- Image optimization
- CSS-in-JS with Mantine

### Backend
- API route caching
- Database indexing
- Connection pooling
- Optimistic updates

### Real-time
- Selective subscriptions
- Channel cleanup
- Debounced updates

## Scalability Considerations

### Database
- Indexed queries
- RLS for security
- Connection limits
- Regular cleanup of old data

### API
- Serverless scaling (Vercel)
- Rate limiting
- Caching strategies
- CDN for assets

### AI
- Request queuing
- Error handling
- Fallback responses
- Cost monitoring

## Error Handling

### Client-side
- Form validation
- User-friendly errors
- Toast notifications
- Retry logic

### Server-side
- Try-catch blocks
- Error logging
- Status codes
- Error responses

## Deployment

### Vercel
- Automatic builds
- Preview deployments
- Environment variables
- Edge network

### Supabase
- Managed PostgreSQL
- Automatic backups
- Scaling options
- Global CDN

## Monitoring

### Metrics to Track
- API response times
- Database query performance
- Real-time connection count
- Claude API usage
- Error rates

### Tools
- Vercel Analytics
- Supabase Dashboard
- Browser DevTools
- Custom logging

## Future Enhancements

### Potential Features
- Voice chat integration
- Map/grid system
- NPC management
- Campaign templates
- Character imports from D&D Beyond
- Mobile app
- Dice animation
- Sound effects

### Technical Improvements
- GraphQL API
- Offline support
- Service workers
- WebRTC for video
- Redis caching
- ElasticSearch for logs
