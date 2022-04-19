// grid parameters
const GRID_SIZE = 40, GRID_ROW = 10, GRID_COL = 10;
const PLAYER_SIZE = 26;

const myCommands = [];

// game managers
var gameManager, assetsManager, grid;
var GameLoop = 0, waitTimer = 0;

class StateManger {
  constructor() {
    this.isRunning = false;
    this.round = 0;
    this.turn = 0; // whose turn it is now
    this.board = new Grid(100, 100, GRID_COL, GRID_ROW, GRID_SIZE);

    this.playerList = [];
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
    console.log(cur_player.controller);
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
    console.log(ifReady);
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

class Player {
  constructor(id, x, y, col, control) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.color = col;
    this.maxhp = 100;
    this.hp = 100;
    this.damage = 20;
    this.damage_dice = 10;
    this.range = 1;
    this.recovery = 25;
    this.controller = control;
    if(control === 'AI') this.ai = new AI(this);
  }
  act(command, playerList) { // execute the command; return if the command is successfully executed
    let ifReady = false;
    switch(command) {
      case 'LEFT':
        if(this.x > 0 && !this.checkPositon(this.x - 1, this.y, playerList)) {
          this.x -= 1;
          ifReady = true;
        }
        break;
      case 'RIGHT':
        if(this.x < GRID_COL - 1 && !this.checkPositon(this.x + 1, this.y, playerList)) {
          this.x += 1;
          ifReady = true;
        }
        break;
      case 'UP':
        if(this.y > 0 && !this.checkPositon(this.x, this.y - 1, playerList)) {
          this.y -= 1;
          ifReady = true;
        }
        break;
      case 'DOWN':
        if(this.y < GRID_ROW - 1 && !this.checkPositon(this.x, this.y + 1, playerList)) {
          this.y += 1;
          ifReady = true;
        }
        break;
      case 'ATTACK':
        // check if there is any enemy within the range
        let enemyId = this.checkEnemyInRange(playerList);
        if(enemyId.length > 0) {
          gameManager.damagePlayer(this.damage + round(random(this.damage_dice)), enemyId);
          ifReady = true;
        }
        break;
      case 'RECOVER':
        // restore health
        if(this.hp < this.maxhp - this.recovery) this.hp += this.recovery;
        else this.hp = this.maxhp;
        ifReady = true;
        break;
      default: // skip the turn
        ifReady = true;
    }
    if(ifReady) myCommands.push(command);
    return ifReady;
  }
  getScope() { // get the array of the current attack scope
    let scope = [], range = this.range;
    let x = this.x, y = this.y;
    for(let row = 0; row < range * 2 + 1; row++) {
      for(let col = 0; col < (range - abs(range - row)) * 2 + 1; col++) {
        scope.push([x + abs(range - row) - range + col, y - range + row]);
      }
    }
    return scope;
  }
  checkPositon(x, y, playerList) { // check if a position has been possessed
    let ifPossessed = false;
    for(let p of playerList) {
      if(p.id !== this.id && p.x === x && p.y === y) {
        ifPossessed = true;
        break;
      }
    }
    return ifPossessed;
  }
  checkEnemyInRange(playerList) { // check if any player is within the range, return the eligible player id
    let targets = [], scope = this.getScope();
    for(let p of playerList) {
      if(p.id !== this.id) {
        let pos = [p.x, p.y];
        for(let cell of scope) { // check all the cells in the scope
          if(cell[0] == pos[0] && cell[1] == pos[1]) { // if the player is within the scope
            targets.push(p.id);
          }
        }
      }
    }
    return targets;
  }
  distance(player1, player2) { // calculate the Manhattan distance between 2 players, return [dist_x, dist_y]
    let x1 = player1.x, y1 = player1.y, x2 = player2.x, y2 = player2.y;
    return [x1 - x2, y1 - y2];
  }
  // draw the player
  draw(grid, canvas = window) {
    let x = grid.x + grid.cellSize * (this.x + 0.5),  y = grid.y + grid.cellSize * (this.y + 0.5);
    let hp_percent = this.hp / this.maxhp;
    canvas.push();
    // draw attack range
    let light_color = color(this.color);
    light_color.setAlpha(80);
    canvas.fill(light_color);
    let scope = this.getScope();
    for(let cell of scope) {
      if(cell[0] >= 0 && cell[0] < GRID_COL && cell[1] >= 0 && cell[1] < GRID_ROW) {
        let cell_x = grid.x + grid.cellSize * cell[0], cell_y = grid.x + grid.cellSize * cell[1];
        canvas.rect(cell_x, cell_y, GRID_SIZE);
      }
    }
    // draw the player
    if(this.hp > 0) canvas.fill(this.color);
    else canvas.fill(80);
    canvas.ellipse(x, y, PLAYER_SIZE);
    // draw health bar
    // canvas.noFill();
    // canvas.stroke(0);
    // canvas.rect(x - PLAYER_SIZE/2 - 10, y - PLAYER_SIZE/2 - 20, (PLAYER_SIZE + 20) * hp_percent, 12);
    canvas.fill(255);
    canvas.textSize(12);
    canvas.textAlign(CENTER, CENTER);
    canvas.text(this.hp, x, y);
    canvas.pop();
  }
}

function setup() {
  createCanvas(600, 600);
  noStroke();
  textFont('helvetica');
  textAlign(CENTER, CENTER);

  gameManager = new StateManger();
}

function draw() {
  background(0);

  gameManager.board.draw(); // always show the grid

  if(gameManager.isRunning) {
    gameManager.drawPlayers();
  } else if(GameLoop > 0) {
    push();
    fill(255);
    textStyle(BOLD);
    textSize(33);
    text("GAME OVER", width / 2, height /2);
    pop();
  }
}

// Player Control
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

// AI fucntions
class AI {
  constructor(player, mode) {
    this.player = player;
    this.mode = 'EASY';

    this.conditions = {
      enemyAmount: function(playerList) { // return number of remaining enemies
        let num = 0;
        for(let p of playerList) {
          if(p.id !== this.id && p.hp > 0) num ++;
        }
        return num;
      },
      enemyLowHealthCheck: function(enemy) { // check if the enemy's health is below 20
        if(enemy.hp <= 20) return true;
        else return false;
      },
      myLowHealthCheck: function(my) { // check my health is below 30
        if(my.hp < 30) return true;
        else return false;
      },
      healthComparison: function(my, enemy) { // compare my health and the enemy's health; return true if my health is higher
        if(my.hp > enemy.hp) return true;
        else return false;
      },
      ifEnemyInScope: function(my, enemy) { // check if the enemy is within my attack range
        let scope = my.getScope(), ifInScope = false;
        for(let cell of scope) {
          if(cell[0] == enemy.x && cell[1] == enemy.y) {
            ifInScope = true;
            break;
          }
        }
        return ifInScope;
      },
      ifMyInScope: function(my, enemy) { // check I'm within the enemy's attack range
        let scope = enemy.getScope(), ifInScope = false;
        for(let cell of scope) {
          if(cell[0] == my.x && cell[1] == my.y) {
            ifInScope = true;
            break;
          }
        }
        return ifInScope;
      }
    }
    this.actions = {
      approachEnemy(my, enemy) { // decide which direction to go to approach the enemy
        let diff = my.distance(my, enemy);
        if(abs(diff[0]) > abs(diff[1])) {
          if(diff[0] < 0) return "RIGHT";
          else return "LEFT";
        } else {
          if(diff[1] < 0) return "DOWN";
          else return "UP";
        }
      },
      escapeEnemy(my, enemy, x_block = false, y_block = false) { // escape from the enemy
        let diff = my.distance(my, enemy);
        if(!x_block && (abs(diff[0]) < abs(diff[1]) || y_block)) {
          if(diff[0] < 0 && my.x - 1 >= 0) return "LEFT";
          else if(diff[0] > 0 && my.x + 1 < GRID_COL) return "RIGHT";
          else return this.escapeEnemy(my, enemy, true, y_block);
        } else if(!y_block && (abs(diff[0]) > abs(diff[1]) || x_block)) {
          if(diff[1] < 0 && my.y - 1 >= 0) return "UP";
          else if(diff[1] > 0 && my.y + 1 < GRID_ROW) return "DOWN";
          else return this.escapeEnemy(my, enemy, x_block, true);
        } else {
          if(diff[0] < 0 && my.x - 1 >= 0) return "LEFT";
          else if(diff[0] > 0 && my.x + 1 < GRID_COL) return "RIGHT";
          else if(diff[1] < 0 && my.y - 1 >= 0) return "UP";
          else if(diff[1] > 0 && my.y + 1 < GRID_ROW) return "DOWN";
          else {
            if(diff[0] !== 1 && my.x - 1 >= 0) return "LEFT";
            else if(diff[0] !== -1 && my.x + 1 < GRID_COL) return "RIGHT";
            else if(diff[1] !== 1 && my.y - 1 >= 0) return "UP";
            else if(diff[1] !== -1 && my.y + 1 < GRID_ROW) return "DOWN";
            else return "RECOVER";
          }
        }
      }
    }
  }
  /* AI mode description:
    EASY: Always head towards the nearest enemy; attack the neariest enemy; only recover when health is lower than 20
    MEDIUM: 
    HARD: Escape when health is the lowest
  */
  stateCheck(state, playerList) {
    let my = this.player, conditions = this.conditions, actions = this.actions;
    let enemy = playerList[0];
    switch(state) {
      case '1-1':
        if(conditions.enemyLowHealthCheck(enemy)) return this.stateCheck('2-1', playerList);
        else return this.stateCheck('2-2', playerList);
      case '2-1':
        if(conditions.ifEnemyInScope(my, enemy)) return "ATTACK";
        else return this.stateCheck('2-2', playerList);
      case '2-2':
        if(conditions.healthComparison(my, enemy)) return this.stateCheck('3-1', playerList);
        else return this.stateCheck('3-2', playerList);
      case '3-1':
        if(conditions.ifEnemyInScope(my, enemy)) return "ATTACK";
        else return actions.approachEnemy(my, enemy);
      case '3-2':
        if(conditions.myLowHealthCheck(my)) return this.stateCheck('4-1', playerList);
        else return this.stateCheck('3-1', playerList);
      case '4-1':
        if(conditions.ifMyInScope(my, enemy)) return actions.escapeEnemy(my, enemy);
        else return "RECOVER";
    }
  }
}