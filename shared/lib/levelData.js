"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVEL_CONFIG = exports.PLATFORMS = void 0;
const constants_1 = require("./constants");
// Define platforms that will be consistent between client and server
exports.PLATFORMS = [
    {
        x: 200,
        y: 400,
        width: 200,
        height: 20
    },
    {
        x: 500,
        y: 300,
        width: 200,
        height: 20
    }
];
// Define the level layout
exports.LEVEL_CONFIG = {
    ground: {
        x: constants_1.MAP_WIDTH / 2,
        y: constants_1.GROUND_Y,
        width: constants_1.MAP_WIDTH,
        height: 20
    },
    platforms: exports.PLATFORMS
};
