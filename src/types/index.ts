export type Team = 'red' | 'blue' | null;


export interface SimulationLog {
  id: string;
  timestamp: string;
  createdAt: number;
  source: string;
  message: string;
  type: 'info' | 'attack' | 'defense' | 'alert';
}

export interface Asset {
  id: string;
  name: string;
  type: 'server' | 'proxy' | 'workstation' | 'firewall';
  status: 'online' | 'offline' | 'compromised' | 'patching';
  team: 'red' | 'blue';
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  logs: SimulationLog[];
  activeTeam: Team;
  assets: Asset[];
}

// Web Speech API Types
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

export interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}
