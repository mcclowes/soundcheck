"use client";

import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { useSpotify } from "@/lib/contexts/SpotifyContext";
import { TOOL_NAMES, SONGS_PER_ROUND, MAX_REPLAYS } from "@/lib/config/constants";
import styles from "./QuizPlayer.module.scss";

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
      <div className={styles.resultsContainer}>
        <div className={styles.resultsCard}>
          <h1>Quiz Complete!</h1>
          <p className={styles.resultsTheme}>Theme: {results.theme}</p>

          <div className={styles.scoreDisplay}>
            {results.correctCount}/{results.totalSongs}
          </div>

          <p className={styles.finalScore}>
            Final Score: <span>{results.finalScore}</span>
          </p>

          <button onClick={() => window.location.reload()} className={styles.playAgainButton}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <div className={styles.soundBars}>
              <span />
              <span />
              <span />
              <span />
            </div>
            Soundcheck
          </div>
          <div className={styles.themeInfo}>
            <div className={styles.label}>Theme</div>
            <div className={styles.theme}>{theme}</div>
          </div>
        </div>
      </header>

      {isStarted && (
        <div className={styles.progressBar}>
          <div className={styles.progressContent}>
            <div className={styles.progressInfo}>
              <span>
                Song {progress.songsCompleted + 1} of {SONGS_PER_ROUND}
              </span>
              <span>Score: {progress.currentScore}</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${(progress.songsCompleted / SONGS_PER_ROUND) * 100}%`,
                }}
              />
            </div>
            {progress.replaysUsed > 0 && (
              <div className={styles.replaysInfo}>
                Replays used: {progress.replaysUsed}/{MAX_REPLAYS}
              </div>
            )}
          </div>
        </div>
      )}

      <main className={styles.main}>
        {!isStarted ? (
          <div className={styles.startScreen}>
            <h2>Ready to play?</h2>
            <p>
              Listen to song snippets and guess the title or artist. You can replay each snippet up
              to {MAX_REPLAYS} times.
            </p>
            {!spotifyState.isReady && (
              <p className={styles.warningText}>
                {spotifyState.error || "Connecting to Spotify..."}
              </p>
            )}
            <button
              onClick={handleStart}
              disabled={!spotifyState.isReady}
              className={styles.startButton}
            >
              Start Quiz
            </button>
          </div>
        ) : (
          <div className={styles.quizContent}>
            {progress.currentSong && (
              <div
                className={`${styles.answerFeedback} ${progress.lastAnswerCorrect ? styles.correct : styles.incorrect}`}
              >
                <div className={styles.feedbackLabel}>
                  {progress.lastAnswerCorrect ? "Correct!" : "The answer was:"}
                </div>
                <div className={styles.songTitle}>{progress.currentSong.title}</div>
                <div className={styles.artist}>{progress.currentSong.artist}</div>
              </div>
            )}

            {spotifyState.isPlaying && (
              <div className={styles.playbackIndicator}>
                <div className={styles.bars}>
                  {[12, 18, 14, 20].map((height, i) => (
                    <span key={i} style={{ height: `${height}px` }} />
                  ))}
                </div>
                <span className={styles.playingText}>Playing...</span>
              </div>
            )}

            <div className={styles.transcript}>
              {messages.map((msg, i) => (
                <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
                  <span className={`${styles.messageBubble} ${styles[msg.role]}`}>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.controls}>
              <button onClick={handleEnd} className={styles.endButton}>
                End Quiz
              </button>
            </div>

            <div className={styles.status}>
              Status: {conversation.status}
              {conversation.isSpeaking && " | Agent speaking..."}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
