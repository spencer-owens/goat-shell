import { LevelConfig, PlatformConfig } from './types';
import { GROUND_Y, MAP_WIDTH } from './constants';

// Define platforms that will be consistent between client and server
export const PLATFORMS: PlatformConfig[] = [
  {
    x: 200,
    y: 400,
    width: 200,
    height: 20
  },
  {
    x: 500,
    y: 300,
    width: 200, 
    height: 20
  }
];

// Define the level layout
export const LEVEL_CONFIG: LevelConfig = {
  ground: {
    x: MAP_WIDTH / 2,
    y: GROUND_Y,
    width: MAP_WIDTH,
    height: 20
  },
  platforms: PLATFORMS
}; 