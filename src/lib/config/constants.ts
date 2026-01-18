export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
export const ELEVENLABS_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";

export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://localhost:3000/callback";

export const SNIPPET_DURATION_MS = 5000; // 5 second snippets
export const MAX_REPLAYS = 2;
export const SONGS_PER_ROUND = 10;

export const TOOL_NAMES = {
  PLAY_SONG_SNIPPET: "play_song_snippet",
  STOP_PLAYBACK: "stop_playback",
  REVEAL_ANSWER: "reveal_answer",
  UPDATE_SCORE: "update_score",
  SHOW_RESULTS: "show_results",
} as const;
