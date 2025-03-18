import * as Matter from 'matter-js';
/**
 * Check if a player body is grounded (in contact with a surface below)
 * @param body The player's physics body
 * @param groundBodies Array of bodies that represent ground or platforms
 * @returns True if the player is on the ground
 */
export declare function isGrounded(body: Matter.Body, groundBodies: Matter.Body[]): boolean;
/**
 * Apply a jump force to a physics body
 * @param body The physics body to apply the jump to
 * @param jumpForce The magnitude of the jump force
 */
export declare function applyJump(body: Matter.Body, jumpForce: number): void;
/**
 * Apply horizontal movement to a physics body
 * @param body The physics body to move
 * @param direction -1 for left, 0 for none, 1 for right
 * @param speed Movement speed
 */
export declare function applyHorizontalMovement(body: Matter.Body, direction: number, speed: number): void;
/**
 * Create a player body with consistent physics properties
 * @param x Initial x position
 * @param y Initial y position
 * @param options Additional physics options
 * @returns A new Matter.js body
 */
export declare function createPlayerBody(x: number, y: number, options?: Matter.IBodyDefinition): Matter.Body;
