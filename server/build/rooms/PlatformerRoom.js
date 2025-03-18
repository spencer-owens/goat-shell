var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Room } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import * as Matter from 'matter-js';
// Import shared code
import { PLAYER_SPEED, JUMP_FORCE, SPAWN_X, SPAWN_Y, MAP_WIDTH, MAP_HEIGHT, FRICTION, FRICTION_AIR, RESTITUTION, FIXED_TIME_STEP, PLAYER_MASS } from "shared";
import { isGrounded, applyJump, createPlayerBody } from "shared";
import { LEVEL_CONFIG } from "shared";
export class Player extends Schema {
    constructor() {
        super(...arguments);
        this.inputQueue = [];
    }
}
__decorate([
    type("number")
], Player.prototype, "x", void 0);
__decorate([
    type("number")
], Player.prototype, "y", void 0);
__decorate([
    type("number")
], Player.prototype, "vx", void 0);
__decorate([
    type("number")
], Player.prototype, "vy", void 0);
__decorate([
    type("number")
], Player.prototype, "tick", void 0);
__decorate([
    type("boolean")
], Player.prototype, "isGrounded", void 0);
export class PlatformerState extends Schema {
    constructor() {
        super(...arguments);
        this.players = new MapSchema();
    }
}
__decorate([
    type("number")
], PlatformerState.prototype, "mapWidth", void 0);
__decorate([
    type("number")
], PlatformerState.prototype, "mapHeight", void 0);
__decorate([
    type({ map: Player })
], PlatformerState.prototype, "players", void 0);
export class PlatformerRoom extends Room {
    constructor() {
        super(...arguments);
        this.state = new PlatformerState();
        this.fixedTimeStep = FIXED_TIME_STEP;
        this.platforms = [];
        this.playerBodies = {};
    }
    onCreate(options) {
        // Set map dimensions
        this.state.mapWidth = MAP_WIDTH;
        this.state.mapHeight = MAP_HEIGHT;
        // Initialize Matter.js physics engine
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 1 }
        });
        // Create the ground (static body) from shared level config
        this.ground = Matter.Bodies.rectangle(LEVEL_CONFIG.ground.x, LEVEL_CONFIG.ground.y, LEVEL_CONFIG.ground.width, LEVEL_CONFIG.ground.height, { isStatic: true });
        // Create platforms (static bodies) from shared level config
        LEVEL_CONFIG.platforms.forEach(platform => {
            const platformBody = Matter.Bodies.rectangle(platform.x, platform.y, platform.width, platform.height, { isStatic: true });
            this.platforms.push(platformBody);
        });
        // Add all static bodies to the world
        Matter.Composite.add(this.engine.world, [
            this.ground,
            ...this.platforms
        ]);
        // Process client input
        this.onMessage(0, (client, input) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                // Enqueue the input for processing on the next tick
                player.inputQueue.push(input);
            }
        });
        // Set up fixed tick rate simulation
        let elapsedTime = 0;
        this.setSimulationInterval((deltaTime) => {
            elapsedTime += deltaTime;
            while (elapsedTime >= this.fixedTimeStep) {
                elapsedTime -= this.fixedTimeStep;
                this.fixedTick(this.fixedTimeStep);
            }
        });
    }
    fixedTick(timeStep) {
        // Process all player inputs
        this.state.players.forEach((player, sessionId) => {
            let input;
            // Get the player's physics body
            const body = this.playerBodies[sessionId];
            // Check if player is grounded (for jumping)
            const groundBodies = [this.ground, ...this.platforms];
            player.isGrounded = isGrounded(body, groundBodies);
            // Process inputs from the input queue
            while (input = player.inputQueue.shift()) {
                // Handle left/right movement
                let velocityX = 0;
                if (input.left) {
                    velocityX = -PLAYER_SPEED;
                }
                else if (input.right) {
                    velocityX = PLAYER_SPEED;
                }
                // Apply horizontal movement
                Matter.Body.setVelocity(body, {
                    x: velocityX,
                    y: body.velocity.y
                });
                // Handle jumping (only if on the ground)
                if (input.jump && player.isGrounded) {
                    applyJump(body, JUMP_FORCE);
                }
                // Update the player tick
                player.tick = input.tick;
            }
        });
        // Update the physics simulation
        Matter.Engine.update(this.engine, timeStep);
        // Update player positions and velocities from physics simulation
        this.state.players.forEach((player, sessionId) => {
            const body = this.playerBodies[sessionId];
            // Update player schema with body data
            player.x = body.position.x;
            player.y = body.position.y;
            player.vx = body.velocity.x;
            player.vy = body.velocity.y;
        });
    }
    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        // Create a new player
        const player = new Player();
        // Set initial position (spawning on the left side)
        player.x = SPAWN_X;
        player.y = SPAWN_Y;
        player.vx = 0;
        player.vy = 0;
        player.isGrounded = false;
        // Create a physics body for the player using shared utility
        const body = createPlayerBody(player.x, player.y, {
            friction: FRICTION,
            frictionAir: FRICTION_AIR,
            restitution: RESTITUTION,
            mass: PLAYER_MASS
        });
        // Store the physics body and add it to the world
        this.playerBodies[client.sessionId] = body;
        Matter.Composite.add(this.engine.world, body);
        // Associate the body with the player (for reference in fixedTick)
        player.body = body;
        // Add the player to the room state
        this.state.players.set(client.sessionId, player);
    }
    onLeave(client, consented) {
        console.log(client.sessionId, "left!");
        // Get the player's body
        const body = this.playerBodies[client.sessionId];
        // Remove the player's body from the physics world
        if (body) {
            Matter.Composite.remove(this.engine.world, body);
            delete this.playerBodies[client.sessionId];
        }
        // Remove the player from the room state
        this.state.players.delete(client.sessionId);
    }
    onDispose() {
        console.log("room", this.roomId, "disposing...");
        // Clean up Matter.js resources
        Matter.Engine.clear(this.engine);
    }
}
