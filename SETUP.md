# Setup Guide

Detailed setup instructions for the D&D AI Campaign Manager.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **npm 9+** installed
- A **Supabase** account ([sign up here](https://supabase.com))
- An **Anthropic API** key ([get one here](https://console.anthropic.com/))
- Basic knowledge of Next.js and React

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- Mantine UI 7.5
- Supabase client libraries
- Anthropic SDK
- TypeScript and other dev dependencies

### 2. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for database to be provisioned

### 3. Set Up Database

#### Run Schema Script

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy contents of `supabase/schema.sql`
4. Paste and run

This creates:
- `profiles` table
- `sessions` table
- `characters` table
- `session_members` table
- `messages` table
- `game_state` table
- Necessary functions and triggers

#### Run Policies Script

1. In SQL Editor, create a new query
2. Copy contents of `supabase/policies.sql`
3. Paste and run

This sets up Row Level Security (RLS) policies for:
- User authentication
- Character ownership
- Session membership
- Message visibility

### 4. Get Supabase Credentials

1. In your Supabase project dashboard
2. Go to Settings > API
3. Copy:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon/public key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY)

⚠️ **Warning**: Never commit `service_role` key to version control!

### 5. Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 6. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in the values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Run Development Server

```bash
npm run dev
```

The app should now be running at [http://localhost:3000](http://localhost:3000)

## Verification

### Test Authentication

1. Go to http://localhost:3000/register
2. Create an account
3. Verify you can log in

### Test Database Connection

1. After logging in, check the dashboard
2. You should see your player name
3. Check Supabase Dashboard > Table Editor > profiles
4. Your profile should appear

### Test Character Creation

1. Click "Create Character"
2. Fill in character details
3. Submit
4. Check Supabase Dashboard > Table Editor > characters
5. Your character should appear

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to Supabase

**Solutions**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check if Supabase project is active
- Ensure API keys are correct
- Check network/firewall settings

### Authentication Errors

**Problem**: Can't sign up or log in

**Solutions**:
- Check Supabase Auth is enabled
- Verify email settings in Supabase
- Check RLS policies are applied
- Look for errors in browser console

### Claude API Errors

**Problem**: DM doesn't respond

**Solutions**:
- Verify `ANTHROPIC_API_KEY` is correct
- Check API key has credits
- Review API rate limits
- Check browser/server console for errors

### Build Errors

**Problem**: `npm run build` fails

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install

# Run type check
npm run type-check

# Check for TypeScript errors
```

### Real-time Updates Not Working

**Problem**: Chat or character updates don't appear

**Solutions**:
- Check Supabase Realtime is enabled
- Verify RLS policies allow subscriptions
- Check browser WebSocket connection
- Look for subscription errors in console

## Production Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Configure Environment Variables**
   - Add all variables from `.env`
   - Update `NEXT_PUBLIC_APP_URL` to your production URL

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Post-Deployment Checks

1. Test authentication
2. Create a test character
3. Create a test session
4. Verify real-time updates work
5. Test dice rolling
6. Test Claude AI responses

## Database Maintenance

### Backup Database

```sql
-- In Supabase SQL Editor
-- Export important tables
SELECT * FROM profiles;
SELECT * FROM characters;
SELECT * FROM sessions;
```

### Monitor Usage

- Check Supabase Dashboard > Database > Usage
- Monitor API requests
- Watch for rate limit warnings

### Clean Old Sessions

```sql
-- Delete ended sessions older than 30 days
DELETE FROM sessions
WHERE status = 'ended'
AND ended_at < NOW() - INTERVAL '30 days';
```

## Development Tips

### Hot Reload

Changes to files will hot reload automatically:
- Components update instantly
- API routes restart on change
- CSS updates without refresh

### Database Changes

After modifying schema:
1. Update `supabase/schema.sql`
2. Run SQL in Supabase Editor
3. Update TypeScript types in `types/index.ts`

### Testing Locally

Use multiple browser profiles to test multiplayer:
1. Open Chrome
2. Open Chrome Incognito
3. Register different users
4. Test session joining and gameplay

## Next Steps

- Read [CHARACTER_IMPORT_GUIDE.md](./CHARACTER_IMPORT_GUIDE.md)
- Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Check [API.md](./docs/API.md) for API details
- Start creating characters and sessions!

## Support

If you encounter issues:
1. Check this guide
2. Review error messages
3. Check browser/server console
4. Consult documentation in `/docs`
5. Open an issue on GitHub
