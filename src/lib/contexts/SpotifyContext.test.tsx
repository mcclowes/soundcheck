import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook } from "@testing-library/react";
import { SpotifyProvider, useSpotify } from "./SpotifyContext";
import * as useSpotifyPlayerModule from "@/lib/hooks/useSpotifyPlayer";

// Mock the useSpotifyPlayer hook
vi.mock("@/lib/hooks/useSpotifyPlayer", () => ({
  useSpotifyPlayer: vi.fn(),
}));

describe("SpotifyContext", () => {
  const mockSetAccessToken = vi.fn();
  const mockPlaySnippet = vi.fn();
  const mockStopPlayback = vi.fn();

  const mockSpotifyPlayer = {
    state: {
      isReady: false,
      isPlaying: false,
      currentTrack: null,
      deviceId: null,
      error: null,
    },
    playSnippet: mockPlaySnippet,
    stopPlayback: mockStopPlayback,
    setAccessToken: mockSetAccessToken,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSpotifyPlayerModule.useSpotifyPlayer).mockReturnValue(mockSpotifyPlayer);
  });

  describe("SpotifyProvider", () => {
    it("renders children", () => {
      render(
        <SpotifyProvider>
          <div data-testid="child">Test Child</div>
        </SpotifyProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("calls setAccessToken when accessToken is provided", () => {
      render(
        <SpotifyProvider accessToken="test-token">
          <div>Child</div>
        </SpotifyProvider>
      );

      expect(mockSetAccessToken).toHaveBeenCalledWith("test-token");
    });

    it("does not call setAccessToken when accessToken is undefined", () => {
      render(
        <SpotifyProvider>
          <div>Child</div>
        </SpotifyProvider>
      );

      expect(mockSetAccessToken).not.toHaveBeenCalled();
    });

    it("does not cause infinite loop with stable setAccessToken reference", () => {
      // Verify that setAccessToken is only called once, not on every render
      const { rerender } = render(
        <SpotifyProvider accessToken="test-token">
          <div>Child</div>
        </SpotifyProvider>
      );

      // Force a rerender with same token
      rerender(
        <SpotifyProvider accessToken="test-token">
          <div>Child</div>
        </SpotifyProvider>
      );

      // setAccessToken should still only be called once (from the initial effect)
      // If there was an infinite loop bug, this would be called many times
      expect(mockSetAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("useSpotify", () => {
    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSpotify());
      }).toThrow("useSpotify must be used within a SpotifyProvider");

      consoleSpy.mockRestore();
    });

    it("returns spotify context value when used inside provider", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SpotifyProvider>{children}</SpotifyProvider>
      );

      const { result } = renderHook(() => useSpotify(), { wrapper });

      expect(result.current).toEqual(mockSpotifyPlayer);
    });

    it("provides playSnippet function", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SpotifyProvider>{children}</SpotifyProvider>
      );

      const { result } = renderHook(() => useSpotify(), { wrapper });

      expect(result.current.playSnippet).toBe(mockPlaySnippet);
    });

    it("provides stopPlayback function", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SpotifyProvider>{children}</SpotifyProvider>
      );

      const { result } = renderHook(() => useSpotify(), { wrapper });

      expect(result.current.stopPlayback).toBe(mockStopPlayback);
    });

    it("provides state object", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SpotifyProvider>{children}</SpotifyProvider>
      );

      const { result } = renderHook(() => useSpotify(), { wrapper });

      expect(result.current.state).toEqual({
        isReady: false,
        isPlaying: false,
        currentTrack: null,
        deviceId: null,
        error: null,
      });
    });
  });
});
