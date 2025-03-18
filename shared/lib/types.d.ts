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
    lastProcessedTick: number;
}
export interface PlatformConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface LevelConfig {
    ground: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    platforms: PlatformConfig[];
}
