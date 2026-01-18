"use client";

import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { useSpotify } from "@/lib/contexts/SpotifyContext";
import { TOOL_NAMES, SONGS_PER_ROUND, MAX_REPLAYS } from "@/lib/config/constants";

type Message = {
  role: "user" | "agent";
  content: string;
};

type QuizProgress = {
  currentScore: number;
  songsCompleted: number;
  lastAnswerCorrect: boolean | null;
  currentSong: {
    title: string;
    artist: string;
  } | null;
  replaysUsed: number;
};

type QuizResults = {
  finalScore: number;
  correctCount: number;
  totalSongs: number;
  theme: string;
};

type QuizPlayerProps = {
  agentId: string;
  theme: string;
};

export function QuizPlayer({ agentId, theme }: QuizPlayerProps) {
  const { playSnippet, stopPlayback, state: spotifyState } = useSpotify();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [progress, setProgress] = useState<QuizProgress>({
    currentScore: 0,
    songsCompleted: 0,
    lastAnswerCorrect: null,
    currentSong: null,
    replaysUsed: 0,
  });
  const [results, setResults] = useState<QuizResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  const replaysRef = useRef<Record<string, number>>({});

  const conversation = useConversation({
    clientTools: {
      [TOOL_NAMES.PLAY_SONG_SNIPPET]: async (params: {
        track_uri: string;
        song_number: string;
        is_replay?: string;
      }) => {
        const songKey = params.song_number;
        const isReplay = params.is_replay === "true";

        if (isReplay) {
          const currentReplays = replaysRef.current[songKey] || 0;
          if (currentReplays >= MAX_REPLAYS) {
            return `Cannot replay - maximum ${MAX_REPLAYS} replays reached for this song`;
          }
          replaysRef.current[songKey] = currentReplays + 1;
          setProgress((prev) => ({ ...prev, replaysUsed: currentReplays + 1 }));
        } else {
          replaysRef.current[songKey] = 0;
          setProgress((prev) => ({ ...prev, replaysUsed: 0 }));
        }

        try {
          await playSnippet(params.track_uri);
          return isReplay
            ? `Replaying song ${params.song_number} (${MAX_REPLAYS - (replaysRef.current[songKey] || 0)} replays remaining)`
            : `Playing song ${params.song_number}`;
        } catch (error) {
          return `Error playing song: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      },

      [TOOL_NAMES.STOP_PLAYBACK]: async () => {
        await stopPlayback();
        return "Playback stopped";
      },

      [TOOL_NAMES.REVEAL_ANSWER]: async (params: {
        song_title: string;
        artist: string;
        was_correct: string;
      }) => {
        setProgress((prev) => ({
          ...prev,
          currentSong: {
            title: params.song_title,
            artist: params.artist,
          },
          lastAnswerCorrect: params.was_correct === "true",
        }));
        return `Answer revealed: "${params.song_title}" by ${params.artist}`;
      },

      [TOOL_NAMES.UPDATE_SCORE]: async (params: {
        current_score: string;
        songs_completed: string;
        last_answer_correct: string;
      }) => {
        setProgress((prev) => ({
          ...prev,
          currentScore: parseInt(params.current_score, 10),
          songsCompleted: parseInt(params.songs_completed, 10),
          lastAnswerCorrect: params.last_answer_correct === "true",
        }));
        return "Score updated";
      },

      [TOOL_NAMES.SHOW_RESULTS]: async (params: {
        final_score: string;
        correct_count: string;
        total_songs: string;
        theme: string;
      }) => {
        setResults({
          finalScore: parseInt(params.final_score, 10),
          correctCount: parseInt(params.correct_count, 10),
          totalSongs: parseInt(params.total_songs, 10),
          theme: params.theme,
        });
        setShowResults(true);
        return "Results displayed";
      },
    },
    onMessage: (message) => {
      setMessages((prev) => [
        ...prev,
        {
          role: message.source === "user" ? "user" : "agent",
          content: message.message,
        },
      ]);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
    },
  });

  const handleStart = useCallback(async () => {
    if (!spotifyState.isReady) {
      alert("Spotify player not ready. Please make sure you're logged in.");
      return;
    }
    setIsStarted(true);
    await conversation.startSession({
      agentId,
      connectionType: "websocket",
    });
  }, [conversation, agentId, spotifyState.isReady]);

  const handleEnd = useCallback(async () => {
    await conversation.endSession();
    setIsStarted(false);
  }, [conversation]);

  if (showResults && results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-gray-600 mb-6">Theme: {results.theme}</p>

          <div className="text-6xl font-bold text-indigo-600 mb-4">
            {results.correctCount}/{results.totalSongs}
          </div>

          <p className="text-xl mb-8">
            Final Score: <span className="font-bold">{results.finalScore}</span>
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Soundcheck</h1>
          <div className="text-right">
            <div className="text-sm opacity-80">Theme</div>
            <div className="font-medium">{theme}</div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {isStarted && (
        <div className="bg-gray-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                Song {progress.songsCompleted + 1} of {SONGS_PER_ROUND}
              </span>
              <span>Score: {progress.currentScore}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${(progress.songsCompleted / SONGS_PER_ROUND) * 100}%`,
                }}
              />
            </div>
            {progress.replaysUsed > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Replays used: {progress.replaysUsed}/{MAX_REPLAYS}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {!isStarted ? (
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to play?</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Listen to song snippets and guess the title or artist. You can replay each
              snippet up to {MAX_REPLAYS} times.
            </p>
            {!spotifyState.isReady && (
              <p className="text-amber-600 mb-4">
                {spotifyState.error || "Connecting to Spotify..."}
              </p>
            )}
            <button
              onClick={handleStart}
              disabled={!spotifyState.isReady}
              className="px-8 py-4 bg-indigo-600 text-white text-xl rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Quiz
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Current song display */}
            {progress.currentSong && (
              <div
                className={`p-4 rounded-lg mb-6 ${
                  progress.lastAnswerCorrect
                    ? "bg-green-100 border border-green-300"
                    : "bg-red-100 border border-red-300"
                }`}
              >
                <div className="text-sm opacity-70">
                  {progress.lastAnswerCorrect ? "Correct!" : "The answer was:"}
                </div>
                <div className="font-bold text-lg">{progress.currentSong.title}</div>
                <div className="text-gray-600">{progress.currentSong.artist}</div>
              </div>
            )}

            {/* Playback indicator */}
            {spotifyState.isPlaying && (
              <div className="flex items-center justify-center gap-2 text-indigo-600 mb-6">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-indigo-600 rounded-full animate-pulse"
                      style={{
                        height: `${12 + Math.random() * 12}px`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="font-medium">Playing...</span>
              </div>
            )}

            {/* Transcript */}
            <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-3 ${msg.role === "user" ? "text-right" : "text-left"}`}
                >
                  <span
                    className={`inline-block px-3 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleEnd}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                End Quiz
              </button>
            </div>

            {/* Status */}
            <div className="text-center text-sm text-gray-500 mt-4">
              Status: {conversation.status}
              {conversation.isSpeaking && " | Agent speaking..."}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
