# Soundcheck

Music pop quiz game using ElevenLabs conversational AI and Spotify.

## Tech stack

- Next.js 16 with App Router
- TypeScript
- SCSS modules
- ElevenLabs conversational AI (voice quiz host)
- Spotify Web Playback SDK (song snippets)
- Prettier + ESLint for formatting/linting

## Project structure

```
src/
├── app/                       # Next.js App Router pages
│   ├── globals.scss          # Global styles + CSS variables
│   ├── page.tsx              # Landing page
│   ├── page.module.scss      # Landing page styles
│   └── play/
│       ├── page.tsx          # Quiz player with Spotify auth
│       └── page.module.scss  # Quiz page styles
├── components/
│   ├── QuizPlayer.tsx        # Main quiz UI with ElevenLabs integration
│   └── QuizPlayer.module.scss
├── lib/
│   ├── clients/              # API clients (ElevenLabs SDK wrapper)
│   ├── config/               # Constants and environment config
│   ├── contexts/             # React contexts (Spotify provider)
│   ├── hooks/                # Custom hooks (useSpotifyPlayer)
│   ├── services/             # Business logic (agent config builder)
│   └── utils/                # Utility functions (parsing, token storage)
├── storage/prompts/          # Agent prompt templates
└── test/                     # Test setup
```

## Key concepts

### ElevenLabs client tools

The agent calls these client-side tools during gameplay:

- `play_song_snippet` - Play a Spotify track snippet (5 seconds)
- `stop_playback` - Stop current playback
- `reveal_answer` - Show correct answer in UI
- `update_score` - Update score display
- `show_results` - Show final results screen

### Quiz themes

Define themes using the `QuizTheme` type in `src/lib/services/agent-config.ts`:

```typescript
const theme: QuizTheme = {
  name: "80s Hits",
  description: "Classic songs from the 1980s",
  songs: [
    { trackUri: "spotify:track:...", title: "...", artist: "..." },
    // 10 songs total
  ],
};
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix lint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
```

## Environment variables

Copy `.env.local.example` to `.env.local` and configure:

- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` - Your agent ID
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret
- `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` - Spotify OAuth callback URL (default: `http://localhost:3000/callback`)

## Important notes

- Spotify Web Playback SDK requires a Premium account
- Agent prompt template: `src/storage/prompts/base_prompt.md`
- Song snippets default to 5 seconds (configurable in constants)
- Max 2 replays per song
