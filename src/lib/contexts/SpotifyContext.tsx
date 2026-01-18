"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useSpotifyPlayer, UseSpotifyPlayerReturn } from "@/lib/hooks/useSpotifyPlayer";

const SpotifyContext = createContext<UseSpotifyPlayerReturn | null>(null);

type SpotifyProviderProps = {
  children: ReactNode;
  accessToken?: string;
};

export function SpotifyProvider({ children, accessToken }: SpotifyProviderProps) {
  const spotify = useSpotifyPlayer();

  useEffect(() => {
    if (accessToken) {
      spotify.setAccessToken(accessToken);
    }
  }, [accessToken, spotify]);

  return <SpotifyContext.Provider value={spotify}>{children}</SpotifyContext.Provider>;
}

export function useSpotify(): UseSpotifyPlayerReturn {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}
