/**
 * -----------------------------
 * 2D Multiplayer Platformer
 * -----------------------------
 * - Connecting with the room
 * - Client-predicted input for local player with Matter.js physics
 * - Server reconciliation for accurate physics simulation
 * - Fixed tickrate on both client and server
 * - Linear interpolation for other players
 */

import Phaser from "phaser";
import { Room, Client, getStateCallbacks } from "colyseus.js";
import { BACKEND_URL } from "../backend";

// Import shared code
import {
  PLAYER_SPEED,
  JUMP_FORCE,
  PLAYER_SIZE,
  FRICTION,
  FRICTION_AIR,
  RESTITUTION,
  PLAYER_MASS,
  FIXED_TIME_STEP,
  InputData,
  isGrounded,
  applyJump,
  LEVEL_CONFIG
} from "shared";

// Import for type checking only
import type { PlatformerState, Player } from "../../../server/src/rooms/PlatformerRoom";

export class PlatformerScene extends Phaser.Scene {
    room: Room<PlatformerState>;

    // Matter.js physics
    matter: Phaser.Physics.Matter.MatterPhysics;
    
    // Player entities
    currentPlayer: Phaser.Physics.Matter.Sprite;
    playerEntities: { [sessionId: string]: Phaser.GameObjects.Sprite } = {};

    // Debug visuals
    debugFPS: Phaser.GameObjects.Text;
    localRef: Phaser.GameObjects.Rectangle;
    remoteRef: Phaser.GameObjects.Rectangle;
    debugText: Phaser.GameObjects.Text;
    
    // Controls
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    keys: {
        a: Phaser.Input.Keyboard.Key,
        d: Phaser.Input.Keyboard.Key,
        space: Phaser.Input.Keyboard.Key
    };

    // Input and state
    inputPayload: InputData = {
        left: false,
        right: false,
        jump: false,
        tick: 0
    };
    
    // Input buffer for reconciliation
    inputBuffer: InputData[] = [];

    // Fixed time step and tick management
    elapsedTime = 0;
    fixedTimeStep = FIXED_TIME_STEP;
    currentTick: number = 0;
    lastReconciledTick: number = 0;
    rtt: number = 0; // Round trip time for network latency estimation
    serverTickOffset: number = 0; // Offset between client and server ticks
    lastPingTime: number = 0;

    // Level entities
    ground: Phaser.Physics.Matter.Sprite;
    platforms: Phaser.Physics.Matter.Sprite[] = [];
    groundBodies: MatterJS.BodyType[] = [];

    constructor() {
        super({ key: "platformer" });
    }

    preload() {
        // We'll use the existing ship asset as a placeholder
        // Actual game would use proper character sprites
        this.load.image('player', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png?v=1649945243288');
        this.load.image('platform', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png?v=1649945243288');
    }

    async create() {
        // Set up input controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        };

        // Add debug text displays
        this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000" });
        this.debugText = this.add.text(4, 24, "", { color: "#ff0000", fontSize: "12px" });

        // Create the level (this is just the client-side representation)
        this.createLevel();

        // Connect to the server room
        await this.connect();

        const $ = getStateCallbacks(this.room);

        // Set up RTT calculation
        this.setupRTTCalculation();

        // When a player joins, create their representation
        $(this.room.state).players.onAdd((player: Player, sessionId) => {
            if (sessionId === this.room.sessionId) {
                // This is the current player - create it with Matter.js physics
                this.currentPlayer = this.matter.add.sprite(player.x, player.y, 'player')
                    .setRectangle(PLAYER_SIZE, PLAYER_SIZE)
                    .setFixedRotation()
                    .setFriction(FRICTION, FRICTION_AIR)
                    .setFrictionAir(FRICTION_AIR)
                    .setBounce(RESTITUTION)
                    .setMass(PLAYER_MASS);
                
                // Disable collisions with world bounds for player
                this.currentPlayer.setCollidesWith(1);

                // Create debug visualizations
                this.localRef = this.add.rectangle(0, 0, PLAYER_SIZE, PLAYER_SIZE);
                this.localRef.setStrokeStyle(1, 0x00ff00);

                this.remoteRef = this.add.rectangle(0, 0, PLAYER_SIZE, PLAYER_SIZE);
                this.remoteRef.setStrokeStyle(1, 0xff0000);

                // Listen for position changes from server for reconciliation
                $(player).onChange(() => {
                    // Update remote reference position
                    this.remoteRef.x = player.x;
                    this.remoteRef.y = player.y;
                    
                    // Only reconcile if server has processed new inputs
                    if (player.lastProcessedTick > this.lastReconciledTick) {
                        this.reconcileWithServer(player);
                    }
                });
            } else {
                // Other players - create simple sprites for them
                const entity = this.add.sprite(player.x, player.y, 'player');
                this.playerEntities[sessionId] = entity;

                // Listen for position changes from server to update other players
                $(player).onChange(() => {
                    entity.setData('serverX', player.x);
                    entity.setData('serverY', player.y);
                });
            }
        });

        // Remove player representation when they leave
        $(this.room.state).players.onRemove((player, sessionId) => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                entity.destroy();
                delete this.playerEntities[sessionId];
            }
        });

        // Set camera bounds to match game world
        this.cameras.main.setBounds(0, 0, 800, 600);
    }

    /**
     * Set up ping-pong messages to calculate RTT (round trip time)
     * This helps sync client and server ticks
     */
    setupRTTCalculation() {
        // Add listener for pong messages
        this.room.onMessage("pong", () => {
            const endTime = Date.now();
            this.rtt = endTime - this.lastPingTime;
            // Calculate server tick offset based on RTT
            this.serverTickOffset = Math.round(this.rtt / (2 * FIXED_TIME_STEP));
            console.log(`RTT: ${this.rtt}ms, Server tick offset: ${this.serverTickOffset}`);
        });

        // Send ping messages periodically
        setInterval(() => {
            this.lastPingTime = Date.now();
            this.room.send("ping", {});
        }, 5000);
    }

    /**
     * Reconcile client state with server state
     */
    reconcileWithServer(serverPlayer: Player) {
        if (!this.currentPlayer) return;

        const body = this.currentPlayer.body as MatterJS.BodyType;
        
        // Calculate distance between client and server positions
        const distance = Phaser.Math.Distance.Between(
            this.currentPlayer.x, this.currentPlayer.y,
            serverPlayer.x, serverPlayer.y
        );
        
        // Always reconcile but use different approaches based on distance
        // For small differences, use gentle lerping
        // For large differences, snap more aggressively
        const lerpFactor = distance > 30 ? 0.5 : 0.2;
        
        console.log(`Reconciling: distance=${distance.toFixed(2)}, serverTick=${serverPlayer.tick}, lastProcessedTick=${serverPlayer.lastProcessedTick}`);
        
        // Reset position using lerp for smoothness
        this.matter.body.setPosition(body, {
            x: Phaser.Math.Linear(this.currentPlayer.x, serverPlayer.x, lerpFactor),
            y: Phaser.Math.Linear(this.currentPlayer.y, serverPlayer.y, lerpFactor)
        }, false);
        
        // Also reset velocity with lerping
        this.matter.body.setVelocity(body, {
            x: Phaser.Math.Linear(body.velocity.x, serverPlayer.vx, lerpFactor),
            y: Phaser.Math.Linear(body.velocity.y, serverPlayer.vy, lerpFactor)
        });
        
        // Filter out inputs that the server has already processed
        this.inputBuffer = this.inputBuffer.filter(input => input.tick > serverPlayer.lastProcessedTick);
        
        console.log(`Re-applying ${this.inputBuffer.length} pending inputs`);
        
        // Re-apply pending inputs in order
        this.inputBuffer.forEach(input => {
            this.applyInput(input);
        });
        
        // Update the last reconciled tick
        this.lastReconciledTick = serverPlayer.lastProcessedTick;
    }

    createLevel() {
        // Create ground using shared level config
        this.ground = this.matter.add.sprite(
            LEVEL_CONFIG.ground.x, 
            LEVEL_CONFIG.ground.y, 
            'platform', 
            undefined, 
            { isStatic: true }
        );
        this.ground.setDisplaySize(LEVEL_CONFIG.ground.width, LEVEL_CONFIG.ground.height);
        this.groundBodies.push(this.ground.body as MatterJS.BodyType);
        
        // Create platforms from shared level config
        LEVEL_CONFIG.platforms.forEach(platform => {
            const platformSprite = this.matter.add.sprite(
                platform.x,
                platform.y,
                'platform',
                undefined,
                { isStatic: true }
            );
            platformSprite.setDisplaySize(platform.width, platform.height);
            this.platforms.push(platformSprite);
            this.groundBodies.push(platformSprite.body as MatterJS.BodyType);
        });
    }

    async connect() {
        // Add connection status text
        const connectionStatusText = this.add
            .text(0, 0, "Trying to connect with the server...")
            .setStyle({ color: "#ff0000" })
            .setPadding(4);

        try {
            const client = new Client(BACKEND_URL);
            this.room = await client.joinOrCreate("platformer_room", {});

            // Connection successful!
            connectionStatusText.destroy();
        } catch (e) {
            // Couldn't connect
            connectionStatusText.text = "Could not connect with the server.";
            console.error("Connection error:", e);
        }
    }

    update(time: number, delta: number): void {
        // Skip loop if not connected yet
        if (!this.currentPlayer) {
            return;
        }

        // Apply fixed time step for consistent physics
        this.elapsedTime += delta;
        while (this.elapsedTime >= this.fixedTimeStep) {
            this.elapsedTime -= this.fixedTimeStep;
            this.fixedTick(time, this.fixedTimeStep);
        }

        // Update debug displays
        this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps.toFixed(1)} FPS`;
        this.debugText.text = `Tick: ${this.currentTick}, Pending inputs: ${this.inputBuffer.length}, RTT: ${this.rtt}ms`;
        
        // Update debug visual positions
        this.localRef.x = this.currentPlayer.x;
        this.localRef.y = this.currentPlayer.y;
        
        // Interpolate other players' positions for smooth movement
        this.interpolateOtherPlayers();
    }

    fixedTick(time: number, delta: number): void {
        // Increment client tick
        this.currentTick++;

        // Gather input
        const left = this.keys.a.isDown || this.cursors.left.isDown;
        const right = this.keys.d.isDown || this.cursors.right.isDown;
        const jump = this.cursors.up.isDown || this.keys.space.isDown;
        
        // Add server tick offset to align with server time
        const adjustedTick = this.currentTick + this.serverTickOffset;
        
        // Create input payload
        this.inputPayload = {
            left,
            right,
            jump,
            tick: adjustedTick
        };
        
        // Add input to buffer for reconciliation
        this.inputBuffer.push({...this.inputPayload});
        
        // Send input to server
        if (this.room) {
            this.room.send(0, this.inputPayload);
        }
        
        // Apply local prediction
        this.applyInput(this.inputPayload);

        // Clean old inputs from buffer if they get too large
        if (this.inputBuffer.length > 100) {
            const cutoffTick = adjustedTick - 50;
            const oldLength = this.inputBuffer.length;
            this.inputBuffer = this.inputBuffer.filter(input => input.tick > cutoffTick);
            console.log(`Cleaned input buffer, removed ${oldLength - this.inputBuffer.length} old inputs`);
        }
    }
    
    // Apply input to local player with prediction
    applyInput(input: InputData): void {
        if (!this.currentPlayer) return;
        
        const body = this.currentPlayer.body as MatterJS.BodyType;
        
        // Check if player is touching a surface below (for jumping)
        const isPlayerGrounded = this.isPlayerGrounded();
        
        // Apply horizontal movement
        let velocityX = 0;
        if (input.left) {
            velocityX = -PLAYER_SPEED;
        } else if (input.right) {
            velocityX = PLAYER_SPEED;
        }
        
        this.matter.body.setVelocity(body, {
            x: velocityX,
            y: body.velocity.y
        });
        
        // Apply jump if player is on ground
        if (input.jump && isPlayerGrounded) {
            console.log(`Client jump at tick ${input.tick}, isGrounded=${isPlayerGrounded}`);
            // Use MatterJS.Body type as any to avoid TypeScript errors
            applyJump(body as any, JUMP_FORCE);
        }
    }
    
    // Helper to check if player is on ground
    isPlayerGrounded(): boolean {
        if (!this.currentPlayer || !this.groundBodies.length) return false;
        
        const body = this.currentPlayer.body as MatterJS.BodyType;
        
        // Use a ray cast downward from the player to detect ground
        const rayLength = PLAYER_SIZE / 2 + 2; // Slightly more than half the player height
        const startPoint = { x: body.position.x, y: body.position.y };
        const endPoint = { x: body.position.x, y: body.position.y + rayLength };
        
        const collisions = this.matter.query.ray(
            this.groundBodies,
            startPoint,
            endPoint
        );
        
        // If we found any collisions with ground bodies, player is grounded
        // Also check velocity as a backup
        return collisions.length > 0 || Math.abs(body.velocity.y) < 0.1;
    }
    
    interpolateOtherPlayers() {
        // Interpolate other players for smooth movement
        for (let sessionId in this.playerEntities) {
            if (sessionId === this.room.sessionId) continue;
            
            const entity = this.playerEntities[sessionId];
            const { serverX, serverY } = entity.data.values;
            
            // Only interpolate if we have server data
            if (serverX !== undefined && serverY !== undefined) {
                entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
                entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
            }
        }
    }
} 