import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseIntSafe,
  parseBooleanParam,
  parseSpotifyTokenFromHash,
  isTokenExpired,
} from "./parsing";

describe("parseIntSafe", () => {
  it("parses valid integers", () => {
    expect(parseIntSafe("42")).toBe(42);
    expect(parseIntSafe("0")).toBe(0);
    expect(parseIntSafe("-10")).toBe(-10);
  });

  it("returns fallback for invalid input", () => {
    expect(parseIntSafe("abc")).toBe(0);
    expect(parseIntSafe("")).toBe(0);
    expect(parseIntSafe("NaN")).toBe(0);
  });

  it("uses custom fallback when provided", () => {
    expect(parseIntSafe("abc", 99)).toBe(99);
    expect(parseIntSafe("", -1)).toBe(-1);
  });

  it("handles edge cases", () => {
    expect(parseIntSafe("42.5")).toBe(42); // parseInt behavior
    expect(parseIntSafe("42abc")).toBe(42); // parseInt behavior
    expect(parseIntSafe("   42")).toBe(42); // leading whitespace
  });
});

describe("parseBooleanParam", () => {
  it("handles boolean values", () => {
    expect(parseBooleanParam(true)).toBe(true);
    expect(parseBooleanParam(false)).toBe(false);
  });

  it("handles string 'true' in various cases", () => {
    expect(parseBooleanParam("true")).toBe(true);
    expect(parseBooleanParam("True")).toBe(true);
    expect(parseBooleanParam("TRUE")).toBe(true);
    expect(parseBooleanParam("  true  ")).toBe(true);
  });

  it("handles string 'false' and other falsy strings", () => {
    expect(parseBooleanParam("false")).toBe(false);
    expect(parseBooleanParam("False")).toBe(false);
    expect(parseBooleanParam("no")).toBe(false);
    expect(parseBooleanParam("")).toBe(false);
    expect(parseBooleanParam("random")).toBe(false);
  });

  it("handles string '1' and 'yes'", () => {
    expect(parseBooleanParam("1")).toBe(true);
    expect(parseBooleanParam("yes")).toBe(true);
    expect(parseBooleanParam("Yes")).toBe(true);
    expect(parseBooleanParam("YES")).toBe(true);
  });

  it("handles string '0'", () => {
    expect(parseBooleanParam("0")).toBe(false);
  });

  it("handles number values", () => {
    expect(parseBooleanParam(1)).toBe(true);
    expect(parseBooleanParam(0)).toBe(false);
    expect(parseBooleanParam(-1)).toBe(true);
    expect(parseBooleanParam(42)).toBe(true);
  });

  it("handles null and undefined", () => {
    expect(parseBooleanParam(null)).toBe(false);
    expect(parseBooleanParam(undefined)).toBe(false);
  });

  it("handles objects and arrays", () => {
    expect(parseBooleanParam({})).toBe(false);
    expect(parseBooleanParam([])).toBe(false);
  });
});

describe("parseSpotifyTokenFromHash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses valid token from hash", () => {
    const hash = "#access_token=abc123&token_type=Bearer&expires_in=3600";
    const result = parseSpotifyTokenFromHash(hash);

    expect(result).not.toBeNull();
    expect(result?.accessToken).toBe("abc123");
    expect(result?.tokenType).toBe("Bearer");
    expect(result?.expiresAt).toBe(Date.now() + 3600 * 1000);
  });

  it("returns null for empty hash", () => {
    expect(parseSpotifyTokenFromHash("")).toBeNull();
    expect(parseSpotifyTokenFromHash("#")).toBeNull();
  });

  it("returns null for hash without access_token", () => {
    const hash = "#token_type=Bearer&expires_in=3600";
    expect(parseSpotifyTokenFromHash(hash)).toBeNull();
  });

  it("returns null for invalid hash format", () => {
    expect(parseSpotifyTokenFromHash("no-hash-prefix")).toBeNull();
  });

  it("uses default values for missing optional params", () => {
    const hash = "#access_token=abc123";
    const result = parseSpotifyTokenFromHash(hash);

    expect(result?.tokenType).toBe("Bearer");
    expect(result?.expiresAt).toBe(Date.now() + 3600 * 1000); // default 1 hour
  });

  it("handles URL-encoded values", () => {
    const hash = "#access_token=abc%20123&token_type=Bearer";
    const result = parseSpotifyTokenFromHash(hash);

    expect(result?.accessToken).toBe("abc 123");
  });
});

describe("isTokenExpired", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for future expiration", () => {
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
    expect(isTokenExpired(expiresAt)).toBe(false);
  });

  it("returns true for past expiration", () => {
    const expiresAt = Date.now() - 1000; // 1 second ago
    expect(isTokenExpired(expiresAt)).toBe(true);
  });

  it("considers buffer time", () => {
    const fiveMinutes = 5 * 60 * 1000;
    const expiresAt = Date.now() + fiveMinutes - 1000; // 4:59 from now

    // With default 5 minute buffer, this should be expired
    expect(isTokenExpired(expiresAt)).toBe(true);

    // With no buffer, this should not be expired
    expect(isTokenExpired(expiresAt, 0)).toBe(false);
  });

  it("uses custom buffer", () => {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // With 15 minute buffer, should be expired
    expect(isTokenExpired(expiresAt, 15 * 60 * 1000)).toBe(true);

    // With 5 minute buffer, should not be expired
    expect(isTokenExpired(expiresAt, 5 * 60 * 1000)).toBe(false);
  });
});
