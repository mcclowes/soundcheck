"use client";

import { useState, useEffect, useCallback } from "react";
import { SpotifyProvider } from "@/lib/contexts/SpotifyContext";
import { QuizPlayer } from "@/components/QuizPlayer";
import { ELEVENLABS_AGENT_ID } from "@/lib/config/constants";
import { handleOAuthCallback, getStoredToken, clearToken } from "@/lib/utils/token-storage";
import styles from "./page.module.scss";

export default function PlayPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle OAuth callback and check for stored token on mount
  useEffect(() => {
    // First, check if this is an OAuth callback (has hash with token)
    const callbackToken = handleOAuthCallback();
    if (callbackToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: initializing state from sessionStorage on mount
      setAccessToken(callbackToken.accessToken);
      setIsLoading(false);
      return;
    }

    // Otherwise, check for existing stored token
    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken.accessToken);
    }
    setIsLoading(false);
  }, []);

  const handleSpotifyLogin = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${window.location.origin}/play`;
    const scopes = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-modify-playback-state",
      "user-read-playback-state",
    ].join(" ");

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("client_id", clientId || "");
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);

    window.location.href = authUrl.toString();
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setAccessToken(null);
  }, []);

  // Show loading state while checking for token
  if (isLoading) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1>Soundcheck</h1>
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1>Soundcheck</h1>
          <p className={styles.subtitle}>The music pop quiz game</p>

          <div className={styles.spotifyIcon}>🎵</div>
          <p className={styles.spotifyDescription}>
            Connect your Spotify account to play song snippets and test your music knowledge
          </p>

          <button onClick={handleSpotifyLogin} className={styles.spotifyButton}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Connect with Spotify
          </button>

          <p className={styles.spotifyNote}>Requires Spotify Premium for playback</p>
        </div>
      </div>
    );
  }

  if (!ELEVENLABS_AGENT_ID) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.configWarning}>
          <h2>Configuration needed</h2>
          <p>Please set up your ElevenLabs agent ID in the environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <SpotifyProvider accessToken={accessToken}>
      <QuizPlayer agentId={ELEVENLABS_AGENT_ID} theme="80s Hits" onLogout={handleLogout} />
    </SpotifyProvider>
  );
}
