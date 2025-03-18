var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Room } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
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
], Player.prototype, "tick", void 0);
export class MyRoomState extends Schema {
    constructor() {
        super(...arguments);
        this.players = new MapSchema();
    }
}
__decorate([
    type("number")
], MyRoomState.prototype, "mapWidth", void 0);
__decorate([
    type("number")
], MyRoomState.prototype, "mapHeight", void 0);
__decorate([
    type({ map: Player })
], MyRoomState.prototype, "players", void 0);
export class Part4Room extends Room {
    constructor() {
        super(...arguments);
        this.state = new MyRoomState();
        this.fixedTimeStep = 1000 / 60;
    }
    onCreate(options) {
        // set map dimensions
        this.state.mapWidth = 800;
        this.state.mapHeight = 600;
        this.onMessage(0, (client, input) => {
            // handle player input
            const player = this.state.players.get(client.sessionId);
            // enqueue input to user input buffer.
            player.inputQueue.push(input);
        });
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
        const velocity = 2;
        this.state.players.forEach(player => {
            let input;
            // dequeue player inputs
            while (input = player.inputQueue.shift()) {
                if (input.left) {
                    player.x -= velocity;
                }
                else if (input.right) {
                    player.x += velocity;
                }
                if (input.up) {
                    player.y -= velocity;
                }
                else if (input.down) {
                    player.y += velocity;
                }
                player.tick = input.tick;
            }
        });
    }
    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        const player = new Player();
        player.x = Math.random() * this.state.mapWidth;
        player.y = Math.random() * this.state.mapHeight;
        this.state.players.set(client.sessionId, player);
    }
    onLeave(client, consented) {
        console.log(client.sessionId, "left!");
        this.state.players.delete(client.sessionId);
    }
    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
