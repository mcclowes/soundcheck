import { describe, it, expect } from "vitest";
import { buildAgentConfig, QuizTheme } from "./agent-config";
import { SONGS_PER_ROUND, MAX_REPLAYS, TOOL_NAMES } from "@/lib/config/constants";

const mockTheme: QuizTheme = {
  name: "Test Theme",
  description: "A test theme for unit tests",
  songs: [
    { trackUri: "spotify:track:abc123", title: "Test Song 1", artist: "Test Artist 1" },
    { trackUri: "spotify:track:def456", title: "Test Song 2", artist: "Test Artist 2" },
  ],
};

describe("buildAgentConfig", () => {
  it("builds config with theme name in agent name", () => {
    const config = buildAgentConfig(mockTheme);
    expect(config.name).toBe("Soundcheck - Test Theme");
  });

  it("includes theme info in first message", () => {
    const config = buildAgentConfig(mockTheme);
    expect(config.first_message).toContain("Test Theme");
    expect(config.first_message).toContain(String(SONGS_PER_ROUND));
    expect(config.first_message).toContain(String(MAX_REPLAYS));
  });

  it("builds prompt with all songs listed", () => {
    const config = buildAgentConfig(mockTheme);
    expect(config.prompt.prompt).toContain("Test Song 1");
    expect(config.prompt.prompt).toContain("Test Artist 1");
    expect(config.prompt.prompt).toContain("spotify:track:abc123");
    expect(config.prompt.prompt).toContain("Test Song 2");
    expect(config.prompt.prompt).toContain("Test Artist 2");
  });

  it("includes all required client tools", () => {
    const config = buildAgentConfig(mockTheme);
    const toolNames = config.client_tools?.map((t) => t.name) || [];

    expect(toolNames).toContain(TOOL_NAMES.PLAY_SONG_SNIPPET);
    expect(toolNames).toContain(TOOL_NAMES.STOP_PLAYBACK);
    expect(toolNames).toContain(TOOL_NAMES.REVEAL_ANSWER);
    expect(toolNames).toContain(TOOL_NAMES.UPDATE_SCORE);
    expect(toolNames).toContain(TOOL_NAMES.SHOW_RESULTS);
  });

  it("uses default voice ID when none provided", () => {
    const config = buildAgentConfig(mockTheme);
    expect(config.conversation_config?.tts?.voice_id).toBe("21m00Tcm4TlvDq8ikWAM");
  });

  it("uses custom voice ID when provided", () => {
    const config = buildAgentConfig(mockTheme, "custom-voice-id");
    expect(config.conversation_config?.tts?.voice_id).toBe("custom-voice-id");
  });

  it("sets language to English", () => {
    const config = buildAgentConfig(mockTheme);
    expect(config.language).toBe("en");
  });

  it("configures ASR with high quality and noise reduction", () => {
    const config = buildAgentConfig(mockTheme);
    expect(config.conversation_config?.asr?.quality).toBe("high");
    expect(config.conversation_config?.asr?.enable_noise_reduction).toBe(true);
  });

  it("play_song_snippet tool has required parameters", () => {
    const config = buildAgentConfig(mockTheme);
    const playTool = config.client_tools?.find((t) => t.name === TOOL_NAMES.PLAY_SONG_SNIPPET);

    expect(playTool?.parameters.required).toContain("track_uri");
    expect(playTool?.parameters.required).toContain("song_number");
  });

  it("reveal_answer tool has required parameters", () => {
    const config = buildAgentConfig(mockTheme);
    const revealTool = config.client_tools?.find((t) => t.name === TOOL_NAMES.REVEAL_ANSWER);

    expect(revealTool?.parameters.required).toContain("song_title");
    expect(revealTool?.parameters.required).toContain("artist");
    expect(revealTool?.parameters.required).toContain("was_correct");
  });
});
