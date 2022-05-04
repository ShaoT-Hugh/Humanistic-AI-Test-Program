// Visual Settings
// canvas parameters
const SCREEN_WIDTH = 800, SCREEN_HEIGHT = 800;
const LARGE_TXET = 40, MID_TEXT = 24;
// grid parameters
const GRID_ORIGIN_X = 160, GRID_ORIGIN_Y = 100, GRID_SIZE = 48, GRID_ROW = 10, GRID_COL = 10;
// button parameters
const BTN_WIDTH = 120, BTN_HEIGHT = 54, BTN_INTERVAL = 16;
const LEVEL_BTN_SIZE = 200, LEVEL_BTN_INTERVAL = 40;
// camp Colors
const COLORS = ['#ff3300', '#3366ff', '#ffd11a', '#33cc33'];
// player parameters
const PLAYER_SIZE = 36;

window.oncontextmenu = function(e) {e.preventDefault();} // disable the browser right-click function

const myCommands = [];

// game managers
var gameManager, assetsManager, spriteManager;
var grid, levelManager;
var GameLoop = 0, waitTimer = 0;

function preload() {
  levelManager = loadJSON("Levels.json");

  assetsManager = new Map();
  // images
  
  // sound effects
  assetsManager.set("Game_start", loadSound("sounds/start_game.wav"));
  assetsManager.set("Game_end", loadSound("sounds/end_game.wav"));
  assetsManager.set("Click_button", loadSound("sounds/button_click1.wav"));
  assetsManager.set("Click_level_button", loadSound("sounds/button_click2.wav"));
  assetsManager.set("Cancel", loadSound("sounds/cancel_command.wav"));
  assetsManager.set("Move", loadSound("sounds/move.wav"));
  assetsManager.set("Damaged", loadSound("sounds/get_damage.wav"));
  assetsManager.set("Recover", loadSound("sounds/recover.wav"));
  assetsManager.set("Invalid_target", loadSound("sounds/invalid_target.wav"));
}

function setup() {
  createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
  noStroke();
  textFont('helvetica');
  textAlign(CENTER, CENTER);

  gameManager = StateManager.get(); // create the game manager
  spriteManager = SpriteManager.get(); // create the sprite manager

}

function draw() {
  background(0);
    
  if(gameManager.screenState !== "TITLE" && GameLoop > 0) {
    gameManager.board.draw(); // always show the grid

    gameManager.drawPlayers(); // always show the player

    if(gameManager.isRunning) {
      gameManager.updateGame();
    } else if(gameManager.screenState === "AWAIT") {
      push();
      fill(20, 160);
      rect(GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_COL * GRID_SIZE, GRID_ROW * GRID_SIZE);
      fill(255);
      textStyle(BOLD);
      textSize(LARGE_TXET);
      text("GAME OVER", width / 2, GRID_ORIGIN_Y + GRID_SIZE * GRID_ROW / 2);
      if(gameManager.winner !== '') {
        textSize(MID_TEXT);
        text("Winner : " + gameManager.winner, width / 2, GRID_ORIGIN_Y + GRID_SIZE * GRID_ROW / 2 + LARGE_TXET);
      }
      textSize(MID_TEXT);
      text("Press ESC to return", width / 2, GRID_ORIGIN_Y + GRID_SIZE * GRID_ROW / 2 + LARGE_TXET * 3);
      pop();
    }
  }
      
  if(gameManager.screenState === "TITLE") {
    push();
    fill(255);
    textStyle(BOLD);
    textSize(LARGE_TXET);
    text("CHOOSE A LEVEL", width / 2, 50);
    pop();
    gameManager.drawLevels(); // show the level buttons
  }
  
  // always update sprites
  spriteManager.update();
}

function mousePressed() {
  if(mouseButton === LEFT) {
    // switch the screen state
    if(gameManager.screenState === "AWAIT") {
      gameManager.triggerButtons();
    } else if(gameManager.screenState === "COMMAND") {
      gameManager.sendCommand();
    }
  } else if(mouseButton === RIGHT) { // right click to quit the command mode
    if(gameManager.screenState === "COMMAND") {
      gameManager.switchState("AWAIT");
      assetsManager.get("Cancel").play(); // play the cancel sound
    }
  } 
}
// Received Player Inputs
function keyPressed() {
  if(keyCode === 27) {
    if(gameManager.isRunning) gameManager.endGame();
    else if(gameManager.screenState === "AWAIT") {
      gameManager.switchState("TITLE"); // when the game is over, back to title screen
      assetsManager.get("Game_end").play(); // play the end sound
    }
  }
}

class Grid {
  constructor(x, y, col, row, size) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.cellSize = size;

    this.right = x + col * size;
    this.bottom = y + row * size;
  }
  draw(canvas = window) {
    let x = this.x, y = this.y, s = this.cellSize;
    canvas.push();
    canvas.stroke(220, 160);
    canvas.strokeWeight(6);
    canvas.noFill();
    canvas.rect(x, y, this.col * s, this.row *s);
    canvas.strokeWeight(2);
    canvas.fill(120, 120);
    for(let r = 0; r < this.row; r++) {
      for(let c = 0; c < this.col; c++) {
        canvas.rect(x + c * s, y + r * s, s);
      }
    }
    canvas.pop();
  }
}