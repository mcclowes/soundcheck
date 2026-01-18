# Soundcheck

An AI-powered music pop quiz game. Listen to song snippets, guess the title or artist, and compete for high scores.

## How it works

1. Connect your Spotify account (Premium required)
2. The AI quiz host plays 5-second song snippets
3. Guess the song title or artist using voice
4. Get instant feedback and track your score
5. Complete 10 songs per themed round

## Features

- Voice-based interaction powered by ElevenLabs conversational AI
- Spotify integration for authentic song playback
- Themed quiz rounds (80s hits, 90s pop, etc.)
- Replay snippets up to 2 times per song
- Real-time score tracking

## Getting started

### Prerequisites

- Node.js 18+
- Spotify Premium account
- ElevenLabs API key
- Spotify Developer app credentials

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/mcclowes/soundcheck.git
   cd soundcheck
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
   - `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` - Your ElevenLabs agent ID
   - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Spotify app client ID
   - `SPOTIFY_CLIENT_SECRET` - Spotify app client secret
   - `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` - OAuth callback URL (default: http://localhost:3000/callback)

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Creating an ElevenLabs agent

1. Go to [ElevenLabs](https://elevenlabs.io) and create an account
2. Navigate to Conversational AI > Agents
3. Create a new agent using the config from `src/lib/services/agent-config.ts`
4. Copy the agent ID to your `.env.local`

## Tech stack

- [Next.js](https://nextjs.org) - React framework
- [ElevenLabs](https://elevenlabs.io) - Conversational AI
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) - Music playback
- [SCSS modules](https://sass-lang.com) - Styling
- [TypeScript](https://www.typescriptlang.org) - Type safety

## License

MIT
