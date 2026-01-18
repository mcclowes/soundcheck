"use client";

/// <reference types="@types/spotify-web-playback-sdk" />

import { useState, useEffect, useCallback, useRef } from "react";
import { SPOTIFY_CLIENT_ID, SNIPPET_DURATION_MS } from "@/lib/config/constants";

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
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

  const setAccessToken = useCallback((token: string) => {
    accessTokenRef.current = token;
  }, []);

  useEffect(() => {
    if (!SPOTIFY_CLIENT_ID) {
      setState((prev) => ({ ...prev, error: "Spotify client ID not configured" }));
      return;
    }

    // Load Spotify Web Playback SDK
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
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
        setState((prev) => ({ ...prev, isReady: true, deviceId: device_id }));
      });

      player.addListener("not_ready", ({ device_id }) => {
        setState((prev) => ({ ...prev, isReady: false, deviceId: device_id }));
      });

      player.addListener("player_state_changed", (playerState) => {
        if (playerState) {
          setState((prev) => ({
            ...prev,
            isPlaying: !playerState.paused,
            currentTrack: playerState.track_window.current_track,
          }));
        }
      });

      player.addListener("initialization_error", ({ message }) => {
        setState((prev) => ({ ...prev, error: `Initialization error: ${message}` }));
      });

      player.addListener("authentication_error", ({ message }) => {
        setState((prev) => ({ ...prev, error: `Authentication error: ${message}` }));
      });

      player.addListener("account_error", ({ message }) => {
        setState((prev) => ({ ...prev, error: `Account error: ${message}` }));
      });

      player.connect();
      playerRef.current = player;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      if (snippetTimeoutRef.current) {
        clearTimeout(snippetTimeoutRef.current);
      }
    };
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
        await stopPlayback();
      }, SNIPPET_DURATION_MS);
    },
    [state.deviceId]
  );

  const stopPlayback = useCallback(async () => {
    if (snippetTimeoutRef.current) {
      clearTimeout(snippetTimeoutRef.current);
      snippetTimeoutRef.current = null;
    }

    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  return {
    state,
    playSnippet,
    stopPlayback,
    setAccessToken,
  };
}
