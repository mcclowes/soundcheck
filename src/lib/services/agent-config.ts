import { TOOL_NAMES, SONGS_PER_ROUND, MAX_REPLAYS } from "@/lib/config/constants";
import type { AgentConfig, ClientTool } from "@/lib/clients/elevenlabs";

const CLIENT_TOOLS: ClientTool[] = [
  {
    type: "client",
    name: TOOL_NAMES.PLAY_SONG_SNIPPET,
    description: `Play a snippet of a song for the player to guess. The snippet plays for 5 seconds. Players can request up to ${MAX_REPLAYS} replays per song.`,
    parameters: {
      type: "object",
      properties: {
        track_uri: {
          type: "string",
          description: "The Spotify track URI (e.g., spotify:track:4iV5W9uYEdYUVa79Axb7Rh)",
        },
        song_number: {
          type: "string",
          description: `The song number in the round (1-${SONGS_PER_ROUND})`,
        },
        is_replay: {
          type: "string",
          description: "Whether this is a replay request (true/false)",
        },
      },
      required: ["track_uri", "song_number"],
    },
  },
  {
    type: "client",
    name: TOOL_NAMES.STOP_PLAYBACK,
    description: "Stop the currently playing song snippet.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    type: "client",
    name: TOOL_NAMES.REVEAL_ANSWER,
    description:
      "Reveal the correct answer for the current song, showing the song title and artist.",
    parameters: {
      type: "object",
      properties: {
        song_title: {
          type: "string",
          description: "The title of the song",
        },
        artist: {
          type: "string",
          description: "The artist who performed the song",
        },
        was_correct: {
          type: "string",
          description: "Whether the player guessed correctly (true/false)",
        },
      },
      required: ["song_title", "artist", "was_correct"],
    },
  },
  {
    type: "client",
    name: TOOL_NAMES.UPDATE_SCORE,
    description: "Update the player's score display after each answer.",
    parameters: {
      type: "object",
      properties: {
        current_score: {
          type: "string",
          description: "The player's current total score",
        },
        songs_completed: {
          type: "string",
          description: "Number of songs completed so far",
        },
        last_answer_correct: {
          type: "string",
          description: "Whether the last answer was correct (true/false)",
        },
      },
      required: ["current_score", "songs_completed", "last_answer_correct"],
    },
  },
  {
    type: "client",
    name: TOOL_NAMES.SHOW_RESULTS,
    description: "Show the final results screen at the end of the quiz round.",
    parameters: {
      type: "object",
      properties: {
        final_score: {
          type: "string",
          description: "The player's final score",
        },
        correct_count: {
          type: "string",
          description: "Number of songs guessed correctly",
        },
        total_songs: {
          type: "string",
          description: "Total number of songs in the round",
        },
        theme: {
          type: "string",
          description: "The theme of the quiz round",
        },
      },
      required: ["final_score", "correct_count", "total_songs", "theme"],
    },
  },
];

export type QuizTheme = {
  name: string;
  description: string;
  songs: Array<{
    trackUri: string;
    title: string;
    artist: string;
  }>;
};

export function buildAgentConfig(theme: QuizTheme, voiceId?: string): AgentConfig {
  const prompt = buildPrompt(theme);

  return {
    name: `Soundcheck - ${theme.name}`,
    prompt: {
      prompt,
    },
    first_message: `Welcome to Soundcheck! Today's theme is "${theme.name}". ${theme.description} I'll play you ${SONGS_PER_ROUND} song snippets, and you need to guess the song title and artist. You can ask me to replay a snippet up to ${MAX_REPLAYS} times. Ready to play?`,
    language: "en",
    conversation_config: {
      asr: {
        quality: "high",
        enable_noise_reduction: true,
      },
      tts: {
        model_id: "eleven_flash_v2",
        voice_id: voiceId || "21m00Tcm4TlvDq8ikWAM", // Default Rachel voice
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.0,
      },
      turn: {
        turn_timeout: 15,
        mode: {
          type: "server_vad",
          eagerness: "medium",
        },
      },
    },
    client_tools: CLIENT_TOOLS,
  };
}

function buildPrompt(theme: QuizTheme): string {
  const songList = theme.songs
    .map((song, i) => `Song ${i + 1}: "${song.title}" by ${song.artist} (URI: ${song.trackUri})`)
    .join("\n");

  return `You are an enthusiastic music quiz host for "Soundcheck", a pop quiz game where players guess songs from short audio snippets.

## Theme: ${theme.name}
${theme.description}

## Songs for this round:
${songList}

## Game rules:
1. You have ${SONGS_PER_ROUND} songs to play for this round
2. For each song, call the play_song_snippet tool with the track_uri
3. After playing, wait for the player's guess
4. Players can say "play again" or "replay" up to ${MAX_REPLAYS} times per song
5. Accept reasonable answers - the song title OR artist name is typically enough
6. Be generous with spelling variations and partial answers
7. After each guess, call reveal_answer and update_score
8. After all songs, call show_results with the final tally

## Interaction style:
- Be upbeat and encouraging
- Give hints if the player is struggling (without giving away the answer)
- Celebrate correct answers enthusiastically
- Be sympathetic but motivating on wrong answers
- Keep the energy high throughout

## Tool usage:
- ALWAYS call play_song_snippet before asking for a guess
- ALWAYS call reveal_answer after judging an answer
- ALWAYS call update_score after each answer
- Call stop_playback if the player starts guessing while music is playing
- Call show_results after all ${SONGS_PER_ROUND} songs are complete

## Judging answers:
- Accept the song title alone as correct
- Accept the artist name alone as correct
- Accept reasonable variations ("Billie Jean" = "billy jean")
- If unsure, ask for clarification rather than marking wrong
- "Pass" or "skip" counts as incorrect, move to next song

Start by playing Song 1 when the player says they're ready.`;
}
