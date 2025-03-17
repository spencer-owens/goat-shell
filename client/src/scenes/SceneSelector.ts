import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {

    parts = {
        'platformer': "2D Platformer Game",
    };

    constructor() {
        super({ key: "selector", active: true });
    }

    preload() {
        // update menu background color
        this.cameras.main.setBackgroundColor(0x000000);

        // preload demo assets
        this.load.image('ship_0001', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png?v=1649945243288');
    }

    create() {
        // automatically navigate to hash scene if provided
        if (window.location.hash) {
            this.runScene(window.location.hash.substring(1));
            return;
        }

        const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            color: "#ff0000",
            fontSize: "32px",
            fontFamily: "Arial"
        };

        // Add title text
        this.add.text(400, 100, "2D Multiplayer Platformer", textStyle)
            .setOrigin(0.5, 0.5)
            .setFontSize(48);

        // Only show our platformer game option
        this.add.text(400, 300, this.parts['platformer'], textStyle)
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .setPadding(6)
            .on("pointerdown", () => {
                this.runScene("platformer");
            });
            
        // Add instructions
        const instructionStyle = {
            color: "#ffffff",
            fontSize: "20px",
            fontFamily: "Arial"
        };
        
        this.add.text(400, 400, "Controls:", instructionStyle)
            .setOrigin(0.5, 0.5);
            
        this.add.text(400, 430, "A/Left Arrow: Move Left", instructionStyle)
            .setOrigin(0.5, 0.5);
            
        this.add.text(400, 460, "D/Right Arrow: Move Right", instructionStyle)
            .setOrigin(0.5, 0.5);
            
        this.add.text(400, 490, "Space/Up Arrow: Jump", instructionStyle)
            .setOrigin(0.5, 0.5);
            
        this.add.text(400, 530, "Goal: Reach the right side of the screen", instructionStyle)
            .setOrigin(0.5, 0.5);
    }

    runScene(key: string) {
        this.game.scene.switch("selector", key)
    }
}