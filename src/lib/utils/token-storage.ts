import { parseSpotifyTokenFromHash, isTokenExpired, SpotifyTokenData } from "./parsing";

const TOKEN_STORAGE_KEY = "soundcheck_spotify_token";

/**
 * Securely handle the OAuth callback by:
 * 1. Parsing token from URL hash (if present)
 * 2. Immediately clearing the hash from URL to prevent token leakage
 * 3. Storing token securely in sessionStorage
 *
 * Returns the token data if successfully extracted, null otherwise.
 */
export function handleOAuthCallback(): SpotifyTokenData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash;
  if (!hash) {
    return null;
  }

  // Parse token from hash FIRST
  const tokenData = parseSpotifyTokenFromHash(hash);

  // IMMEDIATELY clear the hash from URL to prevent token leakage via Referer headers
  // This must happen before any external resources could be loaded
  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  if (tokenData) {
    // Store token securely
    saveToken(tokenData);
  }

  return tokenData;
}

/**
 * Save token data to sessionStorage.
 * Uses sessionStorage instead of localStorage to ensure token is cleared on browser close.
 */
export function saveToken(tokenData: SpotifyTokenData): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  } catch {
    // sessionStorage might be unavailable (private browsing, quota exceeded)
    console.warn("Failed to save token to sessionStorage");
  }
}

/**
 * Retrieve token from sessionStorage.
 * Returns null if no token exists or token is expired.
 */
export function getStoredToken(): SpotifyTokenData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const tokenData: SpotifyTokenData = JSON.parse(stored);

    // Validate token structure
    if (!tokenData.accessToken || !tokenData.expiresAt) {
      clearToken();
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(tokenData.expiresAt)) {
      clearToken();
      return null;
    }

    return tokenData;
  } catch {
    // Invalid JSON or other error
    clearToken();
    return null;
  }
}

/**
 * Clear stored token (for logout or when token is invalid).
 */
export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Get access token string if available and not expired.
 * This is a convenience function for components that just need the token string.
 */
export function getAccessToken(): string | null {
  const tokenData = getStoredToken();
  return tokenData?.accessToken ?? null;
}

/**
 * Check if we have a valid (non-expired) token.
 */
export function hasValidToken(): boolean {
  return getStoredToken() !== null;
}
