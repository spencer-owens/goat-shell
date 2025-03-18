"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlayerBody = exports.applyHorizontalMovement = exports.applyJump = exports.isGrounded = void 0;
const Matter = __importStar(require("matter-js"));
const constants_1 = require("./constants");
/**
 * Check if a player body is grounded (in contact with a surface below)
 * @param body The player's physics body
 * @param groundBodies Array of bodies that represent ground or platforms
 * @returns True if the player is on the ground
 */
function isGrounded(body, groundBodies) {
    for (const groundBody of groundBodies) {
        // Get collision points between the player and this surface
        const collides = Matter.Collision.collides(body, groundBody, undefined);
        if (collides && collides.bodyB === groundBody) {
            // Calculate the bottom of the player and top of the ground
            const playerBottom = body.position.y + constants_1.PLAYER_SIZE / 2;
            const groundTop = groundBody.position.y - (groundBody.bounds.max.y - groundBody.bounds.min.y) / 2;
            // Check if the player is on top of the surface with a small threshold
            if (playerBottom <= groundTop + constants_1.GROUND_THRESHOLD) {
                return true;
            }
        }
    }
    // Alternative method: use a ray cast
    const rayStart = { x: body.position.x, y: body.position.y };
    const rayEnd = { x: body.position.x, y: body.position.y + constants_1.PLAYER_SIZE / 2 + 2 };
    const rayCollisions = Matter.Query.ray(groundBodies, rayStart, rayEnd);
    if (rayCollisions.length > 0) {
        return true;
    }
    // Also check if velocity is minimal (nearly resting on ground)
    return Math.abs(body.velocity.y) < 0.1;
}
exports.isGrounded = isGrounded;
/**
 * Apply a jump force to a physics body
 * @param body The physics body to apply the jump to
 * @param jumpForce The magnitude of the jump force
 */
function applyJump(body, jumpForce) {
    Matter.Body.applyForce(body, body.position, { x: 0, y: -jumpForce });
}
exports.applyJump = applyJump;
/**
 * Apply horizontal movement to a physics body
 * @param body The physics body to move
 * @param direction -1 for left, 0 for none, 1 for right
 * @param speed Movement speed
 */
function applyHorizontalMovement(body, direction, speed) {
    Matter.Body.setVelocity(body, {
        x: direction * speed,
        y: body.velocity.y
    });
}
exports.applyHorizontalMovement = applyHorizontalMovement;
/**
 * Create a player body with consistent physics properties
 * @param x Initial x position
 * @param y Initial y position
 * @param options Additional physics options
 * @returns A new Matter.js body
 */
function createPlayerBody(x, y, options = {}) {
    return Matter.Bodies.rectangle(x, y, constants_1.PLAYER_SIZE, constants_1.PLAYER_SIZE, Object.assign({ friction: 0.001, frictionAir: 0.001, restitution: 0.05 }, options));
}
exports.createPlayerBody = createPlayerBody;
