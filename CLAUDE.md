# Soundcheck

Music pop quiz game using ElevenLabs conversational AI and Spotify.

## Architecture

- **Next.js 15** with App Router
- **ElevenLabs** for voice AI quiz host
- **Spotify Web Playback SDK** for song snippets
- **Tailwind CSS** for styling

## Key directories

```
src/
├── app/                   # Next.js pages
│   ├── page.tsx          # Landing page
│   └── play/page.tsx     # Quiz player with Spotify auth
├── components/
│   └── QuizPlayer.tsx    # Main quiz UI with ElevenLabs integration
├── lib/
│   ├── clients/          # API clients (ElevenLabs)
│   ├── config/           # Constants and env vars
│   ├── contexts/         # React contexts (Spotify)
│   ├── hooks/            # Custom hooks (useSpotifyPlayer)
│   └── services/         # Business logic (agent-config)
└── storage/prompts/      # Agent prompt templates
```

## Client tools

The ElevenLabs agent calls these client-side tools:

- `play_song_snippet` - Play a Spotify track snippet
- `stop_playback` - Stop current playback
- `reveal_answer` - Show correct answer in UI
- `update_score` - Update score display
- `show_results` - Show final results screen

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Add ElevenLabs API key and create an agent
3. Add Spotify app credentials (needs Premium for playback)
4. Run `npm run dev`

## Creating quiz themes

Define themes in `src/lib/services/agent-config.ts` using the `QuizTheme` type:

```typescript
const theme: QuizTheme = {
  name: "80s Hits",
  description: "Classic songs from the 1980s",
  songs: [
    { trackUri: "spotify:track:...", title: "...", artist: "..." },
    // ... 10 songs total
  ]
};
```

## Development notes

- Spotify requires Premium account for Web Playback SDK
- Agent prompt is in `src/storage/prompts/base_prompt.md`
- Song snippets are 5 seconds, configurable in constants
- Max 2 replays per song
