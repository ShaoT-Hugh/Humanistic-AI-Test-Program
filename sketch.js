// grid parameters
const GRID_SIZE = 40, GRID_ROW = 10, GRID_COL = 10;
const PLAYER_SIZE = 26;

const myCommands = [];

// game managers
var gameManager, assetsManager, spriteManager, grid;
var GameLoop = 0, waitTimer = 0;

function setup() {
  createCanvas(600, 600);
  noStroke();
  textFont('helvetica');
  textAlign(CENTER, CENTER);

  gameManager = StateManager.get(); // create the game manager
  spriteManager = SpriteManager.get(); // create the sprite manager

}

function draw() {
  background(0);

  gameManager.board.draw(); // always show the grid

  if(gameManager.isRunning) { // if the game is running
    // always show the player
    gameManager.drawPlayers();
    // update sprites
    spriteManager.update();
  } else if(GameLoop > 0) {
    push();
    fill(255);
    textStyle(BOLD);
    textSize(33);
    text("GAME OVER", width / 2, height /2);
    pop();
  }
}

// Received Player Inputs
function keyPressed() {
  let command = '';
  switch(keyCode) {
    case 65:
    case 37: // left
      command = 'LEFT';
      break;
    case 68:
    case 39: // right
      command = 'RIGHT';
      break;
    case 87:
    case 38: // up
      command = 'UP';
      break;
    case 83:
    case 40: // down
      command = 'DOWN';
      break;
    case 90: // press Z to attack
      command = 'ATTACK';
      break;
    case 88: // press X to recover
      command = 'RECOVER';
      break;
    case 16: // press SHIFT to skip the round
      command = 'SKIP';
      break;
    case 27: // press ESC to restart the game
      if(gameManager.isRunning) gameManager.endGame();
      else gameManager.startGame();
      break;
  }
  if(gameManager.isRunning && command !== '') gameManager.receiveCommand(command);
}

class StateManager {
  static get(){
    if(!this.instance) this.instance = new StateManager();
    return this.instance;
  }
  constructor() {
    this.isRunning = false;
    this.round = 0;
    this.turn = 0; // whose turn it is now

    this.board = new Grid(100, 100, GRID_COL, GRID_ROW, GRID_SIZE);

    this.playerList = []; // all the player objects
  }
  startGame() {
    // create players
    this.playerList.push(new Player(0, 2, 2, '#ff3300', 'player'));
    this.playerList.push(new Player(1, GRID_COL - 3, GRID_ROW - 3, '#3366ff', 'AI'));

    this.isRunning = true; // start the game
  }
  endGame() {
    this.round = 0;
    this.turn = 0;
    // reset round & turn number
    this.playerList = []; // clear all the players
    this.isRunning = false; // end the game

    GameLoop ++; // calculate the entire game
  }
  receiveCommand(command = '') {
    let cur_player = this.playerList[this.turn];
    if(cur_player.controller === 'player') this.nextRound(command);
  }
  nextRound(command) { // go to the next round
    let ifReady = false; // if available to go to the next round
    let cur_player = this.playerList[this.turn];
    // check if the player is controlled by the real player or AI
    if(cur_player.controller === 'player') ifReady = cur_player.act(command, this.playerList);
    else {
      let AI_command = cur_player.ai.stateCheck('1-1', this.playerList);
      ifReady = cur_player.act(AI_command, this.playerList);
    }
    if(ifReady) { // if the current player has moved successfully, go to the next round
      console.log(this.turn);
      let gameOver = false;
      for(let p of this.playerList) { // check players' states
        if(p.hp <= 0) {
          gameOver = true;
          this.endGame();
          break;
        }
      }
      if(!gameOver) {
        this.turn = (this.turn + 1) % this.playerList.length;
        this.round += 1;
        // check if the next player is controlled by AI
        if(this.playerList[this.turn].controller === 'AI') {
          waitTimer = setTimeout(function() {
            gameManager.nextRound();
            clearTimeout(waitTimer);
          }, 500);
        }
      }      
    }
  }
  damagePlayer(dmg, playerIdList) {
    for(let p of playerIdList) {
      this.playerList[p].hp -= dmg;
      // show the damage number
      spriteManager.createSprite("floating_text", {
        x: this.playerList[p].getAbsPos(this.board)[0],
        y: this.playerList[p].getAbsPos(this.board)[1],
        txt: '-' + dmg,
        color: '220, 80, 80'
      });
    }
  }
  drawPlayers() {
    for(let p of this.playerList) {
      p.draw(this.board);
    }
    // tell the player who's turn it is now
    let txt_x = width / 2, txt_y = 40;
    push();
    fill(255);
    textSize(24);
    if(this.playerList[this.turn].controller === 'player') text("YOUR TURN", txt_x, txt_y);
    else text("ENEMY'S TURN", txt_x, txt_y);
    pop();
  }
}

class Grid {
  constructor(x, y, col, row, size) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.cellSize = size;
  }
  draw(canvas = window) {
    let x = this.x, y = this.y, s = this.cellSize;
    canvas.push();
    canvas.stroke(250);
    canvas.fill(120, 120);
    for(let r = 0; r < this.row; r++) {
      for(let c = 0; c < this.col; c++) {
        canvas.rect(x + c * s, y + r * s, s);
      }
    }
    canvas.pop();
  }
}

class SpriteManager {
  static get(){
    if(!this.instance) this.instance = new SpriteManager();
    return this.instance;
  }
  constructor() {
    this.floating_texts = [];
  }
  createSprite(type, config) {
    switch(type) {
      case "floating_text":
        this.floating_texts.push(new FloatingText(config));
        break;
    }
  }

  update() { // update corresponding sprites(if no parameter, update all)
    // update floating texts
    if(this.floating_texts.length > 0) {
      for(let [index, txt] of this.floating_texts.entries())
        if(txt.render()) this.floating_texts.splice(index, 1);
    }
  }
}

class Sprite {
  constructor({x, y, tx, ty, rate = 40} = {}) {
    this.opos_x = x; // initial x position
    this.opos_y = y; // initial y position
    this.pos_x = x; // current x position
    this.pos_y = y; // current x position
    this.targt_x = tx; // target x position
    this.targt_y = ty; // target y position
    this.rate = rate; // moving velocity(bigger to slower the moving spd)
    this.isReady = false; // inform if the sprite has reach the right position
  }
  move() { // update the position of the sprite
    let x = this.pos_x, y = this.pos_y, v = this.rate;
    let tx = this.targt_x, ty = this.targt_y;
    // if the current postion does not match the target position, move the sprite
    if(x !== tx || y !== ty){
      this.pos_x += (tx - x) / v;
      this.pos_y += (ty - y) / v;
      // if the current position get close enough to the target, stop moving
      if(abs(this.pos_x - tx) < 1) this.pos_x = tx;
      if(abs(this.pos_y - ty) < 1) this.pos_y = ty;
    } else this.isReady = true;
  }
  reposition(x, y){ // change the target position of the sprite
    this.targt_x = x;
    this.targt_y = y;
  }
  reset() { // reset the position of the sprite
    this.pos_x = this.opos_x;
    this.pos_y = this.opos_y;
  }
}

// floating text
class FloatingText extends Sprite{
  constructor({x, y, txt, size = 22, color = '255, 255, 255', stroke = 0} = {}){
    super({x: x, y: y, tx: x, ty: y - 30});
    this.txt = txt; // content of the text
    this.size = size ; // size of the text
    this.color = color; // color of the text(string)
    this.stroke = stroke; // if the text has stroke
  }

  render(canvas = window){
    this.move();
    let x = this.pos_x, y = this.pos_y, tx = this.targt_x, ty = this.targt_y;
    let apl = map(abs(ty - y), 0, 20, 0, 1);

    canvas.push();
    if(this.stroke > 0){
      canvas.strokeWeight(3);
      canvas.stroke(255);
    }
    canvas.fill('rgba(' + this.color + ',' + apl + ')');
    canvas.textSize(this.size);
    canvas.textAlign(CENTER);
    canvas.text(this.txt, x, y);
    canvas.pop();
    return x === tx && y === ty && apl <= 0;
  }
}