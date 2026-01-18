/**
 * Safely parse an integer from a string, returning a fallback value if parsing fails.
 */
export function parseIntSafe(value: string, fallback: number = 0): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse Spotify OAuth token data from URL hash fragment.
 * Returns null if no valid token is found.
 */
export function parseSpotifyTokenFromHash(hash: string): SpotifyTokenData | null {
  if (!hash || !hash.startsWith("#")) {
    return null;
  }

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");
  const tokenType = params.get("token_type");

  if (!accessToken) {
    return null;
  }

  const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  return {
    accessToken,
    tokenType: tokenType || "Bearer",
    expiresAt,
  };
}

export type SpotifyTokenData = {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
};

/**
 * Check if a token is expired (with 5 minute buffer for safety).
 */
export function isTokenExpired(expiresAt: number, bufferMs: number = 5 * 60 * 1000): boolean {
  return Date.now() >= expiresAt - bufferMs;
}
