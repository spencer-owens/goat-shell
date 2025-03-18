import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import * as Matter from 'matter-js';

// Import shared code
import { 
  PLAYER_SPEED, 
  JUMP_FORCE, 
  PLAYER_SIZE, 
  SPAWN_X, 
  SPAWN_Y, 
  GROUND_Y,
  MAP_WIDTH,
  MAP_HEIGHT,
  FRICTION,
  FRICTION_AIR,
  RESTITUTION,
  FIXED_TIME_STEP,
  PLAYER_MASS,
  GRAVITY_X,
  GRAVITY_Y
} from "shared";
import { InputData, PlayerState } from "shared";
import { isGrounded, applyJump, createPlayerBody } from "shared";
import { LEVEL_CONFIG } from "shared";

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") vx: number;
  @type("number") vy: number;
  @type("number") tick: number;
  @type("boolean") isGrounded: boolean;
  @type("number") lastProcessedTick: number = 0; // Track the last processed input tick
  
  inputQueue: InputData[] = [];
  body: Matter.Body; // Matter.js body (not serialized)
}

export class PlatformerState extends Schema {
  @type("number") mapWidth: number;
  @type("number") mapHeight: number;
  @type({ map: Player }) players = new MapSchema<Player>();
}

export class PlatformerRoom extends Room<PlatformerState> {
  state = new PlatformerState();
  fixedTimeStep = FIXED_TIME_STEP;
  
  // Matter.js physics engine
  private engine: Matter.Engine;
  private ground: Matter.Body;
  private platforms: Matter.Body[] = [];
  private playerBodies: { [sessionId: string]: Matter.Body } = {};
  private currentTick: number = 0; // Track the current server tick
  
  onCreate(options: any) {
    // Set map dimensions
    this.state.mapWidth = MAP_WIDTH;
    this.state.mapHeight = MAP_HEIGHT;
    
    // Initialize Matter.js physics engine
    this.engine = Matter.Engine.create({
      gravity: { x: GRAVITY_X, y: GRAVITY_Y }
    });
    
    // Create the ground (static body) from shared level config
    this.ground = Matter.Bodies.rectangle(
      LEVEL_CONFIG.ground.x,
      LEVEL_CONFIG.ground.y,
      LEVEL_CONFIG.ground.width,
      LEVEL_CONFIG.ground.height,
      { isStatic: true }
    );
    
    // Create platforms (static bodies) from shared level config
    LEVEL_CONFIG.platforms.forEach(platform => {
      const platformBody = Matter.Bodies.rectangle(
        platform.x,
        platform.y,
        platform.width,
        platform.height,
        { isStatic: true }
      );
      
      this.platforms.push(platformBody);
    });
    
    // Add all static bodies to the world
    Matter.Composite.add(this.engine.world, [
      this.ground,
      ...this.platforms
    ]);
    
    // Process client input
    this.onMessage(0, (client, input: InputData) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Enqueue the input for processing on the next tick
        player.inputQueue.push(input);
      }
    });

    // Add ping-pong for RTT calculation
    this.onMessage("ping", (client) => {
      this.send(client, "pong", {});
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
  
  fixedTick(timeStep: number) {
    // Increment the current tick
    this.currentTick++;
    
    // Process all player inputs
    this.state.players.forEach((player, sessionId) => {
      // Get the player's physics body
      const body = this.playerBodies[sessionId];
      
      // Check if player is grounded (for jumping)
      const groundBodies = [this.ground, ...this.platforms];
      player.isGrounded = isGrounded(body, groundBodies);
      
      // Sort inputs by tick to ensure correct order
      player.inputQueue.sort((a, b) => a.tick - b.tick);
      
      // Process inputs up to current tick
      // This will handle any lagging inputs and limit processing to prevent future inputs
      while (player.inputQueue.length > 0 && player.inputQueue[0].tick <= this.currentTick) {
        const input = player.inputQueue.shift();
        
        // Handle left/right movement
        let velocityX = 0;
        
        if (input.left) {
          velocityX = -PLAYER_SPEED;
        } else if (input.right) {
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
          console.log(`Player ${sessionId} jumped at tick ${input.tick}, isGrounded=${player.isGrounded}`);
        }
        
        // Update the player's last processed tick
        player.lastProcessedTick = input.tick;
      }
      
      // Clean up input queue to prevent it from growing too large
      // Keep only newer inputs for processing in future ticks
      if (player.inputQueue.length > 20) {
        const cutoffTick = this.currentTick - 10;
        player.inputQueue = player.inputQueue.filter(input => input.tick > cutoffTick);
        console.log(`Cleaned input queue for player ${sessionId}, remaining: ${player.inputQueue.length}`);
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
      player.tick = this.currentTick;
    });
  }
  
  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    
    // Create a new player
    const player = new Player();
    
    // Set initial position (spawning on the left side)
    player.x = SPAWN_X;
    player.y = SPAWN_Y;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = false;
    player.tick = this.currentTick;
    player.lastProcessedTick = 0;
    
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
  
  onLeave(client: Client, consented: boolean) {
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