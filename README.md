# D&D AI Campaign Manager

A multiplayer D&D campaign manager with an AI-powered Dungeon Master, built with Next.js 14, Supabase, and Claude AI.

## Features

- **AI Dungeon Master**: Powered by Claude Sonnet 4.5 for dynamic storytelling and game management
- **Multiplayer Sessions**: Real-time collaboration with up to 8 players
- **Character Management**: Import characters via JSON or create manually
- **Smart Dice Rolling**: Context-aware dice roller with advantage/disadvantage
- **Real-time Updates**: Live chat, HP tracking, and session synchronization
- **Session Management**: Host controls, player ready status, and character selection

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Mantine UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel (recommended)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account
- Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dnd-ai-campaign-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `NEXT_PUBLIC_APP_URL`: Your app URL (http://localhost:3000 for local)

4. **Set up Supabase**

   Run the SQL scripts in your Supabase SQL editor:
   ```bash
   # Run schema.sql first
   # Then run policies.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dnd-ai-campaign-manager/
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   ├── dashboard/           # Dashboard page
│   ├── game/                # Game session page
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   └── sessions/            # Session management pages
├── components/              # React components
│   ├── auth/               # Authentication components
│   ├── character/          # Character management
│   ├── game/               # Game session components
│   ├── layout/             # Layout components
│   └── session/            # Session management
├── contexts/               # React contexts
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   ├── claude.ts          # Claude AI integration
│   ├── dice.ts            # Dice rolling logic
│   └── supabase.ts        # Supabase client
├── supabase/              # Database schema and policies
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation

```

## Usage Guide

### For Hosts

1. **Create Characters**
   - Navigate to "Create Character"
   - Use JSON import or manual entry
   - Characters can be reused across sessions

2. **Create Session**
   - Click "Create Session"
   - Enter campaign name
   - Select characters to include
   - Share the session code with players

3. **Manage Game**
   - Start game when all players are ready
   - Use host controls to pause/end session
   - Monitor party status

### For Players

1. **Join Session**
   - Click "Join Session"
   - Enter the session code from your host
   - Select an available character

2. **Play Game**
   - View your character panel
   - Roll dice when prompted by the DM
   - Send actions in the chat
   - Track your HP and resources

### Character Import

See [CHARACTER_IMPORT_GUIDE.md](./CHARACTER_IMPORT_GUIDE.md) for detailed instructions on importing characters.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database Setup

Make sure to run the SQL scripts in your Supabase project:
1. `supabase/schema.sql` - Creates tables and functions
2. `supabase/policies.sql` - Sets up Row Level Security

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Character Import](./CHARACTER_IMPORT_GUIDE.md) - How to import characters
- [Architecture](./docs/ARCHITECTURE.md) - System architecture overview
- [API Documentation](./docs/API.md) - API endpoints reference

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - feel free to use this project for your own campaigns!

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in `/docs`

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI by [Mantine](https://mantine.dev/)
- Database by [Supabase](https://supabase.com/)
- AI by [Anthropic Claude](https://www.anthropic.com/)
