// Visual Settings
var screenParam = {
  WINDOW_WIDTH: 2304,
  WINDOW_HEIGHT: 1082,
  // canvas parameters
  SCREEN_WIDTH: 900, SCREEN_HEIGHT: 900,
  // text parameters
  LARGE_TEXT: 40, MID_TEXT: 24,
  // grid parameters (default)
  GRID_CENTER_X: 450, GRID_CENTER_Y: 390, GRID_SIZE: 54,
  // button parameters
  BTN_WIDTH: 150, BTN_HEIGHT: 72, BTN_INTERVAL: 36,
  LEVEL_BTN_SIZE: 200, LEVEL_BTN_INTERVAL: 40,
  // player parameters (default)
  PLAYER_SIZE: 40,

  init: function() { // called when init the page
    let scale = windowHeight / this.WINDOW_HEIGHT;
    
    // update all the size parameters
    for(let key in this) {
      if(key !== "resize" && key !== "init") this[key] *= scale;
    }
    // update the canvas
    resizeCanvas(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    // update the window size
    this.WINDOW_WIDTH = windowWidth;
    this.WINDOW_HEIGHT = windowHeight;
  },

  resize: function() { // called when the window is resized
    let scale = windowHeight / this.WINDOW_HEIGHT;
    
    // update all the size parameters
    for(let key in this) {
      if(key !== "resize" && key !== "init") this[key] *= scale;
    }

    // update the canvas
    resizeCanvas(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    // update the game board
    if(gameManager.screenState !== "TITLE") gameManager.board.update();
    // update the window size
    this.WINDOW_WIDTH = windowWidth;
    this.WINDOW_HEIGHT = windowHeight;
  }
}
// canvas parameters
const SCREEN_WIDTH = 800, SCREEN_HEIGHT = 800;
// grid parameters
const GRID_ORIGIN_X = 160, GRID_ORIGIN_Y = 100, GRID_SIZE = 48, GRID_ROW = 10, GRID_COL = 10;
// button parameters
const BTN_WIDTH = 150, BTN_HEIGHT = 72, BTN_INTERVAL = 36;
const LEVEL_BTN_SIZE = 200, LEVEL_BTN_INTERVAL = 40;
// camp Colors
const COLORS = ['#ff3300', '#3366ff', '#e6b800', '#33cc33'];

window.oncontextmenu = function(e) {e.preventDefault();} // disable the browser right-click function

const myCommands = [];

// game managers
var gameManager, assetsManager, spriteManager;
var grid, levelManager;
var GameLoop = 0, waitTimer = 0;

function preload() {
  levelManager = loadJSON("Levels.json");

  assetsManager = new Map();
  // font
  assetsManager.set("text_font", loadFont("assets/CENTURIES.ttf"));
  // images
  assetsManager.set("Avatar_player", loadImage("assets/avatar_player.png"));
  assetsManager.set("Avatar_AI", loadImage("assets/avatar_AI.png"));
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
  let myCanvas = createCanvas(screenParam.SCREEN_WIDTH, screenParam.SCREEN_HEIGHT);
  myCanvas.parent("main");
  // set up the parameters
  noStroke();
  textFont('helvetica');
  textAlign(CENTER, CENTER);

  screenParam.init(); // resize the canvas

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
      let param = screenParam;
      gameManager.board.drawMask(); // draw the board mask
      push();
      fill(255);
      textStyle(BOLD);
      textSize(screenParam.LARGE_TEXT);
      text("GAME OVER", width / 2, param.GRID_CENTER_Y);
      if(gameManager.winner !== '') {
        textSize(screenParam.MID_TEXT);
        text("Winner : " + gameManager.winner, width / 2, param.GRID_CENTER_Y + screenParam.LARGE_TEXT);
      }
      textSize(screenParam.MID_TEXT);
      text("Press ESC to return", width / 2, param.GRID_CENTER_Y + screenParam.LARGE_TEXT * 3);
      pop();
    }
  }
      
  if(gameManager.screenState === "TITLE") {
    push();
    fill(255);
    textStyle(BOLD);
    textSize(screenParam.LARGE_TEXT);
    text("CHOOSE A LEVEL", width / 2, screenParam.GRID_SIZE);
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
// Resize the window
// function windowResized() {
//   screenParam.resize();
// }

class Grid {
  constructor(x, y, col, row, size, mode = "CORNER") {
    switch(mode) {
      case "CORNER":
        this.x = x;
        this.y = y;
        break;
      case "CENTER":
        this.x = x - size * col / 2;
        this.y = y - size * row / 2;
        break;
    }
    this.col = col;
    this.row = row;
    this.cellSize = size;

    this.right = this.x + col * size;
    this.bottom = this.y + row * size;
  }
  update() { // update the grid when the screen is resized
    let param = screenParam;

    this.cellSize = param.GRID_SIZE;
    this.x = param.GRID_CENTER_X - this.cellSize * this.col / 2;
    this.y = param.GRID_CENTER_Y - this.cellSize * this.row / 2;
    this.right = this.x + this.cellSize * this.col;
    this.bottom = this.y + this.cellSize * this.row;
  }
  draw(canvas = window) {
    let x = this.x, y = this.y, s = this.cellSize;
    canvas.push();
    canvas.stroke(220, 160);
    canvas.strokeWeight(6);
    canvas.noFill();
    canvas.rect(x, y, this.col * s, this.row * s);
    canvas.strokeWeight(2);
    canvas.fill(120, 120);
    for(let r = 0; r < this.row; r++) {
      for(let c = 0; c < this.col; c++) {
        canvas.rect(x + c * s, y + r * s, s);
      }
    }
    canvas.pop();
  }
  drawMask(canvas = window) {
    canvas.push();
    canvas.fill(20, 160);
    canvas.rect(this.x, this.y, this.cellSize * this.col, this.cellSize * this.row);
    canvas.pop();
  }
}