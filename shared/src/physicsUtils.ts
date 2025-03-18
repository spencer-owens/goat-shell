import * as Matter from 'matter-js';
import { GROUND_THRESHOLD, PLAYER_SIZE } from './constants';

/**
 * Check if a player body is grounded (in contact with a surface below)
 * @param body The player's physics body
 * @param groundBodies Array of bodies that represent ground or platforms
 * @returns True if the player is on the ground
 */
export function isGrounded(body: Matter.Body, groundBodies: Matter.Body[]): boolean {
  for (const groundBody of groundBodies) {
    // Get collision points between the player and this surface
    const collides = Matter.Collision.collides(body, groundBody, undefined);
    
    if (collides && collides.bodyB === groundBody) {
      // Calculate the bottom of the player and top of the ground
      const playerBottom = body.position.y + PLAYER_SIZE / 2;
      const groundTop = groundBody.position.y - (groundBody.bounds.max.y - groundBody.bounds.min.y) / 2;
      
      // Check if the player is on top of the surface with a small threshold
      if (playerBottom <= groundTop + GROUND_THRESHOLD) {
        return true;
      }
    }
  }
  
  // Alternative method: use a ray cast
  const rayStart = { x: body.position.x, y: body.position.y };
  const rayEnd = { x: body.position.x, y: body.position.y + PLAYER_SIZE / 2 + 2 };
  const rayCollisions = Matter.Query.ray(groundBodies, rayStart, rayEnd);
  
  if (rayCollisions.length > 0) {
    return true;
  }
  
  // Also check if velocity is minimal (nearly resting on ground)
  return Math.abs(body.velocity.y) < 0.1;
}

/**
 * Apply a jump force to a physics body
 * @param body The physics body to apply the jump to
 * @param jumpForce The magnitude of the jump force
 */
export function applyJump(body: Matter.Body, jumpForce: number): void {
  Matter.Body.applyForce(body, body.position, { x: 0, y: -jumpForce });
}

/**
 * Apply horizontal movement to a physics body
 * @param body The physics body to move
 * @param direction -1 for left, 0 for none, 1 for right
 * @param speed Movement speed
 */
export function applyHorizontalMovement(body: Matter.Body, direction: number, speed: number): void {
  Matter.Body.setVelocity(body, {
    x: direction * speed,
    y: body.velocity.y
  });
}

/**
 * Create a player body with consistent physics properties
 * @param x Initial x position
 * @param y Initial y position
 * @param options Additional physics options
 * @returns A new Matter.js body
 */
export function createPlayerBody(x: number, y: number, options: Matter.IBodyDefinition = {}): Matter.Body {
  return Matter.Bodies.rectangle(
    x, 
    y,
    PLAYER_SIZE,
    PLAYER_SIZE,
    {
      friction: 0.001,
      frictionAir: 0.001,
      restitution: 0.05,
      ...options
    }
  );
} 