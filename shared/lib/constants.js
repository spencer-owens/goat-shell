"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAVITY_Y = exports.GRAVITY_X = exports.FIXED_TIME_STEP = exports.MAP_HEIGHT = exports.MAP_WIDTH = exports.GROUND_THRESHOLD = exports.PLAYER_MASS = exports.RESTITUTION = exports.FRICTION_AIR = exports.FRICTION = exports.GROUND_Y = exports.SPAWN_Y = exports.SPAWN_X = exports.PLAYER_SIZE = exports.JUMP_FORCE = exports.PLAYER_SPEED = void 0;
// Shared constants for client and server
exports.PLAYER_SPEED = 5;
exports.JUMP_FORCE = 0.15;
exports.PLAYER_SIZE = 32;
exports.SPAWN_X = 50;
exports.SPAWN_Y = 500;
exports.GROUND_Y = 590;
// Physics constants
exports.FRICTION = 0.001;
exports.FRICTION_AIR = 0.001;
exports.RESTITUTION = 0.05;
exports.PLAYER_MASS = 5;
// Ground detection
exports.GROUND_THRESHOLD = 2; // How close to a surface is considered "grounded"
// Game world dimensions
exports.MAP_WIDTH = 800;
exports.MAP_HEIGHT = 600;
// Fixed timestep
exports.FIXED_TIME_STEP = 1000 / 60; // 60 FPS 
// Physics engine settings 
exports.GRAVITY_X = 0;
exports.GRAVITY_Y = 1;
