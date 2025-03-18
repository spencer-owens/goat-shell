var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Room } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
export class Player extends Schema {
}
__decorate([
    type("number")
], Player.prototype, "x", void 0);
__decorate([
    type("number")
], Player.prototype, "y", void 0);
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
export class Part1Room extends Room {
    constructor() {
        super(...arguments);
        this.state = new MyRoomState();
    }
    onCreate(options) {
        // set map dimensions
        this.state.mapWidth = 800;
        this.state.mapHeight = 600;
        // handle player input
        this.onMessage(0, (client, input) => {
            const player = this.state.players.get(client.sessionId);
            const velocity = 2;
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
        });
    }
    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        // create player at random position.
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
