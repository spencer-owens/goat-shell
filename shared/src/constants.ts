// Shared constants for client and server
export const PLAYER_SPEED = 5;
export const JUMP_FORCE = 0.15;
export const PLAYER_SIZE = 32;
export const SPAWN_X = 50;
export const SPAWN_Y = 500;
export const GROUND_Y = 590;

// Physics constants
export const FRICTION = 0.001;
export const FRICTION_AIR = 0.001;
export const RESTITUTION = 0.05;
export const PLAYER_MASS = 5;

// Ground detection
export const GROUND_THRESHOLD = 2; // How close to a surface is considered "grounded"

// Game world dimensions
export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;

// Fixed timestep
export const FIXED_TIME_STEP = 1000 / 60; // 60 FPS 

// Physics engine settings 
export const GRAVITY_X = 0;
export const GRAVITY_Y = 1; 