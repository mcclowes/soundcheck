import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  handleOAuthCallback,
  saveToken,
  getStoredToken,
  clearToken,
  getAccessToken,
  hasValidToken,
} from "./token-storage";
import type { SpotifyTokenData } from "./parsing";

describe("token-storage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-18T12:00:00Z"));
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("saveToken / getStoredToken", () => {
    it("saves and retrieves token", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresAt: Date.now() + 3600 * 1000,
      };

      saveToken(tokenData);
      const retrieved = getStoredToken();

      expect(retrieved).toEqual(tokenData);
    });

    it("returns null for expired token", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresAt: Date.now() - 1000, // Already expired
      };

      saveToken(tokenData);
      const retrieved = getStoredToken();

      expect(retrieved).toBeNull();
    });

    it("returns null for token expiring within buffer", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes (less than 5 minute buffer)
      };

      saveToken(tokenData);
      const retrieved = getStoredToken();

      expect(retrieved).toBeNull();
    });

    it("returns null when no token stored", () => {
      expect(getStoredToken()).toBeNull();
    });

    it("clears invalid token data", () => {
      sessionStorage.setItem("soundcheck_spotify_token", "invalid-json");
      expect(getStoredToken()).toBeNull();
      expect(sessionStorage.getItem("soundcheck_spotify_token")).toBeNull();
    });

    it("clears token with missing required fields", () => {
      sessionStorage.setItem(
        "soundcheck_spotify_token",
        JSON.stringify({ tokenType: "Bearer" }) // Missing accessToken and expiresAt
      );
      expect(getStoredToken()).toBeNull();
    });
  });

  describe("clearToken", () => {
    it("removes token from storage", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresAt: Date.now() + 3600 * 1000,
      };

      saveToken(tokenData);
      expect(getStoredToken()).not.toBeNull();

      clearToken();
      expect(getStoredToken()).toBeNull();
    });
  });

  describe("getAccessToken", () => {
    it("returns token string when valid", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token-123",
        tokenType: "Bearer",
        expiresAt: Date.now() + 3600 * 1000,
      };

      saveToken(tokenData);
      expect(getAccessToken()).toBe("test-token-123");
    });

    it("returns null when no token", () => {
      expect(getAccessToken()).toBeNull();
    });
  });

  describe("hasValidToken", () => {
    it("returns true when valid token exists", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresAt: Date.now() + 3600 * 1000,
      };

      saveToken(tokenData);
      expect(hasValidToken()).toBe(true);
    });

    it("returns false when no token", () => {
      expect(hasValidToken()).toBe(false);
    });

    it("returns false when token expired", () => {
      const tokenData: SpotifyTokenData = {
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresAt: Date.now() - 1000,
      };

      saveToken(tokenData);
      expect(hasValidToken()).toBe(false);
    });
  });

  describe("handleOAuthCallback", () => {
    const originalLocation = window.location;
    const mockReplaceState = vi.fn();

    beforeEach(() => {
      // Mock window.location and history
      Object.defineProperty(window, "location", {
        value: {
          hash: "",
          pathname: "/play",
          search: "",
        },
        writable: true,
      });

      Object.defineProperty(window, "history", {
        value: {
          replaceState: mockReplaceState,
        },
        writable: true,
      });

      mockReplaceState.mockClear();
    });

    afterEach(() => {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
    });

    it("parses token from hash and clears URL", () => {
      window.location.hash = "#access_token=abc123&expires_in=3600&token_type=Bearer";

      const result = handleOAuthCallback();

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("abc123");
      expect(mockReplaceState).toHaveBeenCalledWith(null, "", "/play");
    });

    it("stores token in sessionStorage", () => {
      window.location.hash = "#access_token=abc123&expires_in=3600&token_type=Bearer";

      handleOAuthCallback();

      const stored = getStoredToken();
      expect(stored?.accessToken).toBe("abc123");
    });

    it("returns null for empty hash", () => {
      window.location.hash = "";

      const result = handleOAuthCallback();

      expect(result).toBeNull();
      expect(mockReplaceState).not.toHaveBeenCalled();
    });

    it("clears URL even if token parsing fails", () => {
      window.location.hash = "#error=access_denied";

      const result = handleOAuthCallback();

      expect(result).toBeNull();
      expect(mockReplaceState).toHaveBeenCalled();
    });
  });
});
