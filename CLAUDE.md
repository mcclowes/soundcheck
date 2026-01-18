# Soundcheck

Music pop quiz game using ElevenLabs conversational AI and Spotify.

## Tech stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- ElevenLabs conversational AI (voice quiz host)
- Spotify Web Playback SDK (song snippets)
- Prettier + ESLint for formatting/linting

## Project structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── page.tsx          # Landing page
│   └── play/page.tsx     # Quiz player with Spotify auth
├── components/
│   └── QuizPlayer.tsx    # Main quiz UI with ElevenLabs integration
├── lib/
│   ├── clients/          # API clients (ElevenLabs SDK wrapper)
│   ├── config/           # Constants and environment config
│   ├── contexts/         # React contexts (Spotify provider)
│   ├── hooks/            # Custom hooks (useSpotifyPlayer)
│   └── services/         # Business logic (agent config builder)
└── storage/prompts/      # Agent prompt templates
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
```

## Environment variables

Copy `.env.local.example` to `.env.local` and configure:

- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` - Your agent ID
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret

## Important notes

- Spotify Web Playback SDK requires a Premium account
- Agent prompt template: `src/storage/prompts/base_prompt.md`
- Song snippets default to 5 seconds (configurable in constants)
- Max 2 replays per song
