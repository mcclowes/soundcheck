"use client";

/// <reference types="@types/spotify-web-playback-sdk" />

import { useState, useEffect, useCallback, useRef } from "react";
import { SPOTIFY_CLIENT_ID, SNIPPET_DURATION_MS } from "@/lib/config/constants";

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
    __spotifySDKReady?: boolean;
    __spotifySDKCallbacks?: Array<() => void>;
  }
}

type SpotifyPlayer = Spotify.Player;

export type SpotifyPlayerState = {
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: Spotify.Track | null;
  deviceId: string | null;
  error: string | null;
};

export type UseSpotifyPlayerReturn = {
  state: SpotifyPlayerState;
  playSnippet: (trackUri: string, startMs?: number) => Promise<void>;
  stopPlayback: () => Promise<void>;
  setAccessToken: (token: string) => void;
};

const SPOTIFY_SDK_URL = "https://sdk.scdn.co/spotify-player.js";

/**
 * Load Spotify SDK script, handling duplicate loads and race conditions.
 * Uses a callback queue pattern to support multiple consumers.
 */
function loadSpotifySDK(onReady: () => void): () => void {
  // If SDK is already loaded, call callback immediately
  if (window.Spotify && window.__spotifySDKReady) {
    onReady();
    return () => {};
  }

  // Initialize callback queue if needed
  if (!window.__spotifySDKCallbacks) {
    window.__spotifySDKCallbacks = [];
  }

  // Add this callback to the queue
  window.__spotifySDKCallbacks.push(onReady);

  // Check if script is already being loaded
  const existingScript = document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`);
  if (existingScript) {
    // Script is loading, callback will be called when ready
    return () => {
      // Remove callback from queue on cleanup
      const callbacks = window.__spotifySDKCallbacks;
      if (callbacks) {
        const index = callbacks.indexOf(onReady);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Load the script for the first time
  const script = document.createElement("script");
  script.src = SPOTIFY_SDK_URL;
  script.async = true;

  // Set up the global callback that Spotify SDK expects
  window.onSpotifyWebPlaybackSDKReady = () => {
    window.__spotifySDKReady = true;

    // Call all queued callbacks
    const callbacks = window.__spotifySDKCallbacks || [];
    callbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error("Error in Spotify SDK ready callback:", e);
      }
    });

    // Clear the queue
    window.__spotifySDKCallbacks = [];
  };

  document.body.appendChild(script);

  // Return cleanup function
  return () => {
    const callbacks = window.__spotifySDKCallbacks;
    if (callbacks) {
      const index = callbacks.indexOf(onReady);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  };
}

export function useSpotifyPlayer(): UseSpotifyPlayerReturn {
  const [state, setState] = useState<SpotifyPlayerState>({
    isReady: false,
    isPlaying: false,
    currentTrack: null,
    deviceId: null,
    error: null,
  });

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const snippetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const setAccessToken = useCallback((token: string) => {
    accessTokenRef.current = token;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!SPOTIFY_CLIENT_ID) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: setting error state on initial config check
      setState((prev) => ({ ...prev, error: "Spotify client ID not configured" }));
      return;
    }

    const initializePlayer = () => {
      // Guard against initialization after unmount
      if (!isMountedRef.current) {
        return;
      }

      // Don't create duplicate players
      if (playerRef.current) {
        return;
      }

      const player = new window.Spotify.Player({
        name: "Soundcheck Quiz Player",
        getOAuthToken: (cb) => {
          if (accessTokenRef.current) {
            cb(accessTokenRef.current);
          }
        },
        volume: 0.8,
      });

      player.addListener("ready", ({ device_id }) => {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, isReady: true, deviceId: device_id }));
        }
      });

      player.addListener("not_ready", ({ device_id }) => {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, isReady: false, deviceId: device_id }));
        }
      });

      player.addListener("player_state_changed", (playerState) => {
        if (playerState && isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isPlaying: !playerState.paused,
            currentTrack: playerState.track_window.current_track,
          }));
        }
      });

      player.addListener("initialization_error", ({ message }) => {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, error: `Initialization error: ${message}` }));
        }
      });

      player.addListener("authentication_error", ({ message }) => {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, error: `Authentication error: ${message}` }));
        }
      });

      player.addListener("account_error", ({ message }) => {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, error: `Account error: ${message}` }));
        }
      });

      player.connect();
      playerRef.current = player;
    };

    const cleanupSDK = loadSpotifySDK(initializePlayer);

    return () => {
      isMountedRef.current = false;
      cleanupSDK();

      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }

      if (snippetTimeoutRef.current) {
        clearTimeout(snippetTimeoutRef.current);
        snippetTimeoutRef.current = null;
      }
    };
  }, []);

  const stopPlayback = useCallback(async () => {
    if (snippetTimeoutRef.current) {
      clearTimeout(snippetTimeoutRef.current);
      snippetTimeoutRef.current = null;
    }

    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  const playSnippet = useCallback(
    async (trackUri: string, startMs: number = 0) => {
      if (!accessTokenRef.current || !state.deviceId) {
        throw new Error("Spotify not ready or not authenticated");
      }

      // Clear any existing snippet timeout
      if (snippetTimeoutRef.current) {
        clearTimeout(snippetTimeoutRef.current);
      }

      // Start playback via Spotify API
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessTokenRef.current}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: startMs,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to start playback: ${error}`);
      }

      // Set timeout to stop after snippet duration
      snippetTimeoutRef.current = setTimeout(async () => {
        if (isMountedRef.current) {
          await stopPlayback();
        }
      }, SNIPPET_DURATION_MS);
    },
    [state.deviceId, stopPlayback]
  );

  return {
    state,
    playSnippet,
    stopPlayback,
    setAccessToken,
  };
}
