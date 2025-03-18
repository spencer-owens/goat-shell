Below is a thorough implementation write-up to synchronize movement between the client and server in your 2D multiplayer platformer game. We'll address synchronization issues by standardizing physics configurations, unifying key logic, improving reconciliation, and sharing code between the client and server where possible. Following your suggestion, we'll create a `shared` folder to house common logic, types, and constants, adhering to best practices by minimizing code duplication and ensuring consistency.

---

## Implementation Overview

To achieve synchronization:
1. **Standardize Physics Configurations**: Ensure physics properties match on both sides.
2. **Share Logic**: Define reusable utilities, types, and constants in a `shared` folder.
3. **Unify Ground Detection and Jump Mechanics**: Use consistent logic for movement.
4. **Enhance Reconciliation**: Improve client-side correction of server state.
5. **Synchronize Ticks**: Align client and server simulations with input buffering.
6. **Test and Debug**: Verify the implementation works under various conditions.

We'll modify existing files (`PlatformerRoom.ts` for the server, `PlatformerScene.ts` for the client) and add new files in a `shared` directory.

---

## File Structure

```
src/
├── client/
│   ├── PlatformerScene.ts    # Client-side game logic
│   └── index.ts             # Phaser configuration
├── server/
│   └── PlatformerRoom.ts    # Server-side room logic
└── shared/
    ├── constants.ts         # Shared constants (e.g., JUMP_FORCE)
    ├── physicsUtils.ts      # Shared physics utilities
    └── types.ts            # Shared types (e.g., InputData)
```

---

## Step 1: Create Shared Files

### `shared/constants.ts`
Define constants used by both client and server to ensure consistency.

```typescript
export const PLAYER_SPEED = 5;
export const JUMP_FORCE = 0.15;
export const PLAYER_SIZE = 32;
export const SPAWN_X = 50;
export const SPAWN_Y = 500;
export const GROUND_Y = 590;
```

### `shared/types.ts`
Define interfaces for input and player state.

```typescript
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
}
```

### `shared/physicsUtils.ts`
Implement shared physics logic for ground detection and jumping.

```typescript
import Matter from 'matter-js';

export function isGrounded(body: Matter.Body, groundBodies: Matter.Body[]): boolean {
  for (const ground of groundBodies) {
    const collision = Matter.Query.collides(body, [ground]);
    if (collision.length > 0) {
      return true;
    }
  }
  return false;
}

export function applyJump(body: Matter.Body, jumpForce: number) {
  Matter.Body.applyForce(body, body.position, { x: 0, y: -jumpForce });
}
```

**Note**: Ensure `matter-js` is installed in both client and server environments (`npm install matter-js`).

---

## Step 2: Update Server-Side Code

### `server/PlatformerRoom.ts`
Modify the server to use shared logic and standardize physics.

```typescript
import { Room } from 'colyseus';
import * as Matter from 'matter-js';
import { isGrounded, applyJump } from '../shared/physicsUtils';
import { InputData, PlayerState } from '../shared/types';
import { JUMP_FORCE, PLAYER_SIZE, PLAYER_SPEED, SPAWN_X, SPAWN_Y, GROUND_Y } from '../shared/constants';

export class PlatformerRoom extends Room {
  private engine: Matter.Engine;
  private ground: Matter.Body;
  private platforms: Matter.Body[] = [];

  onCreate(options: any) {
    this.setSimulationInterval(() => this.fixedTick(), 1000 / 60);
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });

    // Create ground
    this.ground = Matter.Bodies.rectangle(400, GROUND_Y, 800, 60, { isStatic: true });
    Matter.World.add(this.engine.world, this.ground);

    // Example platform (adjust as needed)
    const platform = Matter.Bodies.rectangle(200, 400, 200, 20, { isStatic: true });
    this.platforms.push(platform);
    Matter.World.add(this.engine.world, [platform]);

    this.onMessage(0, (client, input: InputData) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputQueue.push(input);
      }
    });
  }

  onJoin(client: any) {
    const body = Matter.Bodies.rectangle(SPAWN_X, SPAWN_Y, PLAYER_SIZE, PLAYER_SIZE, {
      friction: 0.001,
      frictionAir: 0.001,
      restitution: 0,
      mass: 5,
    });
    Matter.World.add(this.engine.world, body);

    const player: PlayerState = {
      x: SPAWN_X,
      y: SPAWN_Y,
      vx: 0,
      vy: 0,
      tick: 0,
      isGrounded: false,
    };
    player.body = body; // Attach body to state (custom property)
    this.state.players.set(client.sessionId, player);
  }

  fixedTick() {
    Matter.Engine.update(this.engine, 1000 / 60);

    this.state.players.forEach((player, sessionId) => {
      const body = player.body;
      const input = player.inputQueue.shift();

      if (input) {
        player.tick = input.tick;

        // Ground detection
        player.isGrounded = isGrounded(body, [this.ground, ...this.platforms]);

        // Horizontal movement
        let vx = 0;
        if (input.left) vx -= PLAYER_SPEED;
        if (input.right) vx += PLAYER_SPEED;
        Matter.Body.setVelocity(body, { x: vx, y: body.velocity.y });

        // Jump
        if (input.jump && player.isGrounded) {
          applyJump(body, JUMP_FORCE);
        }
      }

      // Update state
      player.x = body.position.x;
      player.y = body.position.y;
      player.vx = body.velocity.x;
      player.vy = body.velocity.y;
    });
  }

  onLeave(client: any) {
    const player = this.state.players.get(client.sessionId);
    if (player && player.body) {
      Matter.World.remove(this.engine.world, player.body);
    }
    this.state.players.delete(client.sessionId);
  }
}
```

**Notes**:
- Assumes a `state.players` Map exists in your schema with a custom `body` property.
- Adjust `inputQueue` and schema as per your existing Colyseus setup.

---

## Step 3: Update Client-Side Code

### `client/index.ts`
Ensure Phaser physics matches the server.

```typescript
import Phaser from 'phaser';
import PlatformerScene from './PlatformerScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'matter',
    matter: {
      debug: true,
      gravity: { x: 0, y: 1 },
    },
  },
  scene: [PlatformerScene],
};

new Phaser.Game(config);
```

### `client/PlatformerScene.ts`
Update the client to use shared logic, implement prediction, and reconcile with the server.

```typescript
import Phaser from 'phaser';
import { Room } from 'colyseus.js';
import { isGrounded, applyJump } from '../shared/physicsUtils';
import { InputData, PlayerState } from '../shared/types';
import { JUMP_FORCE, PLAYER_SIZE, PLAYER_SPEED, SPAWN_X, SPAWN_Y, GROUND_Y } from '../shared/constants';

export default class PlatformerScene extends Phaser.Scene {
  private room!: Room;
  private currentPlayer!: Phaser.GameObjects.Rectangle;
  private ground!: Phaser.GameObjects.Rectangle;
  private platforms: Phaser.GameObjects.Rectangle[] = [];
  private inputPayload: InputData = { left: false, right: false, jump: false, tick: 0 };
  private inputBuffer: InputData[] = [];
  private currentTick: number = 0;

  constructor() {
    super('PlatformerScene');
  }

  create() {
    // Join room (assumed setup)
    this.room = this.registry.get('room');

    // Ground
    this.ground = this.add.rectangle(400, GROUND_Y, 800, 60, 0x666666);
    this.matter.add.gameObject(this.ground, { isStatic: true });

    // Platform
    const platform = this.add.rectangle(200, 400, 200, 20, 0x666666);
    this.matter.add.gameObject(platform, { isStatic: true });
    this.platforms.push(platform);

    // Player setup
    this.room.state.players.onAdd((player: PlayerState, sessionId: string) => {
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = this.add.rectangle(SPAWN_X, SPAWN_Y, PLAYER_SIZE, PLAYER_SIZE, 0x00ff00);
        this.matter.add.gameObject(this.currentPlayer, {
          friction: 0.001,
          frictionAir: 0.001,
          restitution: 0,
          mass: 5,
        });
      }
    });

    // Reconciliation
    this.room.state.players.onChange((player: PlayerState, sessionId: string) => {
      if (sessionId === this.room.sessionId) {
        const body = this.currentPlayer.body as Phaser.Types.Physics.Matter.MatterBody;
        const distance = Phaser.Math.Distance.Between(body.position.x, body.position.y, player.x, player.y);

        if (distance > 5) {
          const lerpFactor = 0.5;
          const newX = Phaser.Math.Linear(body.position.x, player.x, lerpFactor);
          const newY = Phaser.Math.Linear(body.position.y, player.y, lerpFactor);
          this.matter.body.setPosition(body, { x: newX, y: newY }, false);

          const newVx = Phaser.Math.Linear(body.velocity.x, player.vx, lerpFactor);
          const newVy = Phaser.Math.Linear(body.velocity.y, player.vy, lerpFactor);
          this.matter.body.setVelocity(body, { x: newVx, y: newVy });

          // Replay buffered inputs
          const serverTick = player.tick;
          const bufferedInputs = this.inputBuffer.filter((input) => input.tick > serverTick);
          bufferedInputs.forEach((input) => this.applyInput(input));
          this.inputBuffer = this.inputBuffer.filter((input) => input.tick > serverTick);
        }
      }
    });

    // Input handling
    this.input.keyboard.on('keydown-LEFT', () => (this.inputPayload.left = true));
    this.input.keyboard.on('keyup-LEFT', () => (this.inputPayload.left = false));
    this.input.keyboard.on('keydown-RIGHT', () => (this.inputPayload.right = true));
    this.input.keyboard.on('keyup-RIGHT', () => (this.inputPayload.right = false));
    this.input.keyboard.on('keydown-SPACE', () => (this.inputPayload.jump = true));
    this.input.keyboard.on('keyup-SPACE', () => (this.inputPayload.jump = false));

    this.time.addEvent({ delay: 1000 / 60, callback: this.fixedTick, callbackScope: this, loop: true });
  }

  fixedTick() {
    if (!this.currentPlayer) return;

    this.currentTick++;
    this.inputPayload.tick = this.currentTick;
    this.inputBuffer.push({ ...this.inputPayload });
    this.room.send(0, this.inputPayload);

    this.applyInput(this.inputPayload);
  }

  applyInput(input: InputData) {
    const body = this.currentPlayer.body as Phaser.Types.Physics.Matter.MatterBody;
    const groundBodies = [this.ground.body, ...this.platforms.map((p) => p.body)] as Phaser.Types.Physics.Matter.MatterBody[];
    const isPlayerGrounded = isGrounded(body, groundBodies);

    let vx = 0;
    if (input.left) vx -= PLAYER_SPEED;
    if (input.right) vx += PLAYER_SPEED;
    this.matter.body.setVelocity(body, { x: vx, y: body.velocity.y });

    if (input.jump && isPlayerGrounded) {
      applyJump(body, JUMP_FORCE);
    }
  }
}
```

**Notes**:
- Assumes a `registry` setup to pass the Colyseus room to the scene.
- Adjust `onAdd` and `onChange` based on your schema structure.

---

## Step 4: Test and Debug

- **Local Testing**: Run the server and multiple clients. Check that green (client) and red (server) boxes align after reconciliation.
- **Latency Simulation**: Use network tools (e.g., Colyseus’ built-in latency simulation) to test under delay.
- **Debug Logs**: Add logging to verify behavior:
  - In `PlatformerScene.ts`:
    ```typescript
    if (distance > 5) {
      console.log(`Reconciling: distance=${distance.toFixed(2)}, serverTick=${player.tick}`);
    }
    ```
  - In `PlatformerRoom.ts`:
    ```typescript
    if (input.jump && player.isGrounded) {
      console.log(`Jump applied for ${sessionId} at tick ${input.tick}`);
    }
    ```

---

## Conclusion

This implementation:
- **Standardizes Physics**: Matches gravity, friction, and mass between client and server.
- **Shares Logic**: Uses `shared` folder for reusable code, reducing duplication.
- **Synchronizes Movement**: Aligns ground detection, jumping, and tick rates.
- **Improves Reconciliation**: Smoothly corrects discrepancies with position and velocity lerping.
- **Handles Latency**: Buffers inputs for robust prediction and replay.

Test thoroughly to ensure the green and red boxes sync up, and jumping feels responsive and consistent across all clients. This follows best practices by promoting code reuse, maintaining clarity, and ensuring scalability.