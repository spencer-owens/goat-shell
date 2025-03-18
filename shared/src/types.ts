// Shared types for client and server

export interface InputData {
  left: boolean;
  right: boolean;
  jump: boolean;
  tick: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tick: number;
  isGrounded: boolean;
  lastProcessedTick: number;
}

// Platform definition for consistent level layout
export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Level definition with platform configurations
export interface LevelConfig {
  ground: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  platforms: PlatformConfig[];
} 