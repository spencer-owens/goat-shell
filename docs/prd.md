Below is a detailed **Product Requirements Document (PRD)** for creating a 2D multiplayer platformer game based on the existing Phaser.js and Colyseus template, specifically emulating the structure of "Part 4" with the addition of server-side physics using Matter.js. This PRD is designed to be thorough and actionable, providing clear guidance for a coding AI agent to implement the necessary changes in the provided codebase.

---

# Product Requirements Document (PRD) for 2D Multiplayer Platformer

## 1. Overview

### 1.1 Project Name
2D Multiplayer Platformer

### 1.2 Objective
Develop a basic 2D multiplayer platformer game where players spawn on the left side of the screen and aim to reach the right side. The game will feature movement (left, right) and jumping mechanics, with server-authoritative physics managed by Matter.js. Players will join a shared room, see each other in real-time, and experience smooth gameplay through client-side prediction and server reconciliation.

### 1.3 Target Platform
Web browsers

### 1.4 Technology Stack
- **Client:** Phaser.js (with Matter.js for local physics prediction)
- **Server:** Colyseus (with Matter.js for authoritative physics)
- **Networking:** WebSocket via Colyseus
- **Physics Engine:** Matter.js (server-side and client-side)

---

## 2. Functional Requirements

### 2.1 Game Mechanics

#### 2.1.1 Player Controls
- **Move Left:** Press `A` or `Left Arrow` to move the player left.
- **Move Right:** Press `D` or `Right Arrow` to move the player right.
- **Jump:** Press `Spacebar` or `Up Arrow` to make the player jump.
- **Physics-Based Movement:** Player movement and jumping are governed by Matter.js physics (gravity, velocity, and collision).

#### 2.1.2 Player Spawn and Goal
- **Spawn Point:** All players spawn at the left side of the screen (e.g., x: 50, y: ground level).
- **Goal:** Reach the right side of the screen (e.g., x: 750). No win condition is required yet; the focus is on movement and physics.

#### 2.1.3 Physics
- **Gravity:** Apply downward gravity to players, simulating a realistic fall.
- **Collisions:** Players collide with the ground and platforms, preventing them from falling through.
- **Platforms:** Include at least two static platforms at different heights for players to jump onto.

### 2.2 Multiplayer Features

#### 2.2.1 Rooms
- Players join a shared room (e.g., "platformer_room") to play together.
- Multiple players can coexist in the same room, with their positions and actions visible to all.

#### 2.2.2 Authoritative Server
- The server uses Matter.js to simulate physics and game logic based on player inputs.
- The server maintains and updates the authoritative game state, including player positions and velocities.

#### 2.2.3 Client-Side Prediction
- Clients predict player movement locally using Phaser’s Matter.js integration based on inputs (left, right, jump).
- Local predictions are applied immediately for responsiveness.

#### 2.2.4 Server Reconciliation
- Clients receive the authoritative game state from the server and reconcile their local state.
- If the local player position diverges from the server’s state, smoothly correct the position (e.g., using interpolation or snapping).

#### 2.2.5 State Synchronization
- The server broadcasts the game state to all clients at a fixed tickrate (e.g., 60Hz).
- Clients interpolate the positions of other (non-local) players for smooth rendering.

### 2.3 UI and Scenes

#### 2.3.1 Scene Selector
- Modify the existing `SceneSelector.ts` to remove or hide options for `Part1Scene`, `Part2Scene`, `Part3Scene`, and `Part4Scene`.
- Add a single option for the new platformer game scene (e.g., "Platformer Game").

#### 2.3.2 Game Scene
- Display a simple 2D level with:
  - A ground plane at the bottom of the screen.
  - At least two static platforms at varying heights.
  - Player sprites representing each connected player.
- Use basic sprites with animations for idle, walking, and jumping states.

---

## 3. Technical Specifications

### 3.1 Server-Side (Colyseus)

#### 3.1.1 Room Implementation
- **File:** Create a new room file, `PlatformerRoom.ts`, in `server/src/rooms/`.
- **Base:** Model it after `Part4Room.ts`, retaining the fixed tickrate pattern.
- **Physics Integration:** Integrate Matter.js as the physics engine:
  - Initialize a Matter.js engine and world in the room’s `onCreate` method.
  - Add static bodies for the ground and platforms.
  - Add dynamic bodies for each player upon joining.

#### 3.1.2 Physics Engine
- **Library:** Use Matter.js (e.g., via `matter-js` npm package).
- **Simulation:** Run the physics simulation at a fixed tickrate (e.g., 60Hz) using `Matter.Engine.update`.
- **Components:**
  - **Gravity:** Default downward gravity (e.g., `{ x: 0, y: 1 }`).
  - **Ground:** Static rectangle at the bottom (e.g., x: 400, y: 590, width: 800, height: 20).
  - **Platforms:** At least two static rectangles (e.g., x: 200, y: 400, width: 200, height: 20; x: 500, y: 300, width: 200, height: 20).
  - **Players:** Dynamic bodies with mass and friction, spawned at the left side.

#### 3.1.3 Input Handling
- **Message Type:** Receive input messages from clients (e.g., `{ left: boolean, right: boolean, jump: boolean, tick: number }`).
- **Processing:** Apply inputs to the corresponding player’s Matter.js body:
  - Left/Right: Set horizontal velocity (e.g., -200 or 200).
  - Jump: Apply an upward impulse (e.g., `{ x: 0, y: -0.3 }`) if the player is on the ground.

#### 3.1.4 State Management
- **Schema:** Update the `Player` schema in `PlatformerRoom.ts` to include:
  - `x: number` (position x)
  - `y: number` (position y)
  - `vx: number` (velocity x)
  - `vy: number` (velocity y)
  - `tick: number` (for reconciliation)
  - `inputQueue: InputData[]` (for queued inputs)
- **Broadcast:** Send the updated state (player positions and velocities) to all clients at each tick.

### 3.2 Client-Side (Phaser.js)

#### 3.2.1 Scene Implementation
- **File:** Create a new scene file, `PlatformerScene.ts`, in `client/src/scenes/`.
- **Base:** Model it after `Part4Scene.ts`, retaining fixed tickrate, client prediction, and interpolation.
- **Assets:** Load player sprites and platform tiles (reuse `ship_0001.png` temporarily if new assets aren’t provided).
- **Level Setup:** Add ground and platforms matching the server’s layout using Phaser’s Matter.js physics.

#### 3.2.2 Physics Integration
- **Engine:** Use Phaser’s Matter.js integration for local simulation.
- **Prediction:** Apply inputs locally to the current player’s body (e.g., set velocity for left/right, apply force for jump).
- **Reconciliation:** Adjust the local player’s position and velocity if they diverge from the server’s state.

#### 3.2.3 Input Handling
- **Capture:** Detect `A`, `D`, `Left Arrow`, `Right Arrow`, `Spacebar`, and `Up Arrow` key presses.
- **Send:** Send inputs to the server with the current tick (e.g., `{ left, right, jump, tick }`).
- **Local Application:** Apply inputs immediately to the local player for prediction.

#### 3.2.4 Interpolation
- For non-local players, interpolate positions between server updates using `Phaser.Math.Linear`.

#### 3.2.5 Reconciliation
- Compare the local player’s position and velocity with the server’s state.
- If divergent, smoothly adjust the local state (e.g., lerp to server position over a few frames).

### 3.3 Networking

#### 3.3.1 Message Types
- **Client to Server:** Input messages (e.g., `{ left: boolean, right: boolean, jump: boolean, tick: number }`).
- **Server to Client:** State updates (player positions, velocities, and tick).

#### 3.3.2 Tickrate
- Use a fixed tickrate of 60Hz for both server simulation and client updates, consistent with `Part4Room.ts` and `Part4Scene.ts`.

---

## 4. Assets and Art

### 4.1 Player Sprites
- **Requirement:** Basic sprites for:
  - Idle (standing still)
  - Walking (left/right movement)
  - Jumping (mid-air)
- **Temporary:** Reuse `ship_0001.png` from the existing assets if new sprites aren’t available.

### 4.2 Platform Tiles
- **Requirement:** Simple rectangular tiles for the ground and platforms.
- **Temporary:** Use Phaser’s built-in shapes (e.g., rectangles) if tiles aren’t provided.

### 4.3 Background
- **Requirement:** A basic solid color or simple image (e.g., sky blue).
- **Default:** Use the existing background color from `index.ts` (`#b6d53c`).

---

## 5. Code Structure and Organization

### 5.1 Server
- **File:** `server/src/rooms/PlatformerRoom.ts`
  - Define the room logic, Matter.js integration, and state schema.
- **Schema:** Extend or replace the `Player` and `MyRoomState` classes within `PlatformerRoom.ts` to include physics properties.
- **Comments:** Add detailed comments explaining Matter.js setup, input handling, and state updates.

### 5.2 Client
- **File:** `client/src/scenes/PlatformerScene.ts`
  - Implement the game scene with Phaser and Matter.js.
- **File:** `client/src/scenes/SceneSelector.ts`
  - Update to include only the new `PlatformerScene`.
- **Comments:** Document prediction, reconciliation, and physics setup clearly.

### 5.3 Shared
- **File:** Optionally create `shared/types.ts` for shared input and state interfaces (e.g., `InputData`, `PlayerState`).
- **Purpose:** Ensure consistency between client and server message formats.

### 5.4 Separation of Concerns
- Keep client-side rendering and prediction separate from server-side physics and logic.
- Avoid modifying existing `Part1`–`Part4` files; create new files instead.

---

## 6. Testing and Debugging

### 6.1 Local Testing
- **Requirement:** Test with multiple browser instances to ensure:
  - Players spawn correctly on the left.
  - Movement and jumping work as expected.
  - Physics (gravity, collisions) behaves consistently.
  - Multiplayer synchronization is accurate.

### 6.2 Latency Simulation
- **Tool:** Use the existing latency simulation in `index.html` and `app.config.ts`.
- **Test Cases:** Verify gameplay under 0ms, 100ms, and 300ms latency.

### 6.3 Debugging Tools
- **Server:** Use Colyseus Monitor (`/colyseus`) to inspect room state.
- **Client:** Add debug overlays (e.g., FPS counter, player position text) to `PlatformerScene.ts`.

---

## 7. Future Considerations

- **Level Design:** Expand with more platforms, obstacles, and a defined finish line.
- **Gameplay Features:** Add player interactions (e.g., collision), power-ups, or scoring.
- **Optimization:** Reduce network traffic (e.g., delta updates) and optimize physics for scalability.

---

This PRD provides a comprehensive blueprint for building a basic 2D multiplayer platformer on top of the existing template, leveraging the fixed tickrate pattern from Part 4 and introducing Matter.js physics. It ensures the game is multiplayer-ready, deterministic, and responsive, with clear instructions for implementation.