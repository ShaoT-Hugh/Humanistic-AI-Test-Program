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
    this.range = 2;
    this.recovery = 20;
    this.controller = control;
    if(control === 'AI') this.ai = new AI(this);
  }
  getAbsPos(grid) { // get player's abusolute position
    let absX = grid.x + grid.cellSize * (this.x + 0.5);
    let absY = grid.y + grid.cellSize * (this.y + 0.5);
    return [absX, absY];
  }

  // execute the command; return if the command is successfully executed
  act(command, playerList) {
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
        // show the healing number
        spriteManager.createSprite("floating_text", {
          x: this.getAbsPos(gameManager.board)[0],
          y: this.getAbsPos(gameManager.board)[1],
          txt: '+' + this.recovery,
          color: '80, 220, 80'
        });
        break;
      default: // skip the turn
        ifReady = true;
    }
    if(ifReady) myCommands.push(command);
    return ifReady;
  }

  // Player Data Functions  

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

  // visualize the player
  draw(grid, canvas = window) {
    let x = this.getAbsPos(grid)[0],  y = this.getAbsPos(grid)[1];
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
    // draw the player's avatar
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