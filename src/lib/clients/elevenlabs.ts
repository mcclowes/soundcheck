import { ElevenLabsClient as ElevenLabsSDK } from "@elevenlabs/elevenlabs-js";
import { ELEVENLABS_API_KEY } from "@/lib/config/constants";

export type AgentConfig = {
  name: string;
  prompt: {
    prompt: string;
  };
  first_message?: string;
  language?: string;
  conversation_config?: {
    asr?: {
      quality?: string;
      enable_noise_reduction?: boolean;
    };
    tts?: {
      model_id?: string;
      voice_id?: string;
      stability?: number;
      similarity_boost?: number;
      speed?: number;
    };
    turn?: {
      turn_timeout?: number;
      mode?: {
        type: string;
        eagerness?: string;
      };
    };
  };
  client_tools?: ClientTool[];
};

export type ClientTool = {
  type: "client";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
};

class ElevenLabsService {
  private sdk: ElevenLabsSDK | null = null;

  private getSDK(): ElevenLabsSDK {
    if (!this.sdk) {
      if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY is not configured");
      }
      this.sdk = new ElevenLabsSDK({ apiKey: ELEVENLABS_API_KEY });
    }
    return this.sdk;
  }

  async createAgent(config: AgentConfig): Promise<{ agentId: string }> {
    const sdk = this.getSDK();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await sdk.conversationalAi.agents.create(config as any);
    return { agentId: response.agentId };
  }

  async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<void> {
    const sdk = this.getSDK();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sdk.conversationalAi.agents.update(agentId, config as any);
  }

  async getAgent(agentId: string) {
    const sdk = this.getSDK();
    return sdk.conversationalAi.agents.get(agentId);
  }

  async listVoices() {
    const sdk = this.getSDK();
    return sdk.voices.getAll();
  }
}

export const elevenlabsService = new ElevenLabsService();
