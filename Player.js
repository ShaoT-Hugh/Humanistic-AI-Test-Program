class Player {
  constructor({id, x, y, camp, hp = 100, dmg = 20, float = 10, movement = 1, range = 1, recovery = 20, control}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.camp = camp;
    switch(camp) {
      case 'red':
        this.color = COLORS[0];
        break;
      case 'blue':
        this.color = COLORS[1];
        break;
      case 'yellow':
        this.color = COLORS[2];
        break;
      case 'green':
        this.color = COLORS[3];
        break;
    }
    this.maxhp = hp;
    this.hp = hp;
    this.damage = dmg;
    this.damage_dice = float;
    this.movement = movement;
    this.range = range;
    this.recovery = recovery;
    this.controller = control;
    if(control === 'AI') this.ai = new AI(this); // create a Tree for AI player

    this.movementScope = this.getMovementScope();
  }

  // execute the command; return if the command is successfully executed
  act(cmd) { // {command: (command name), target: (target position or player id)}
    if(this.controller === "AI") cmd = this.ai.run(); // if the command is empty, switch to AI mode
    let ifReady = false;
    switch(cmd.command) {
      case 'MOVE':
        this.x = cmd.target[0];
        this.y = cmd.target[1];
        this.movementScope = this.getMovementScope(); // update the movement scope
        assetsManager.get("Move").play(); // play moving sound
        ifReady = true;
        break;
      case 'ATTACK':
        let enemy = cmd.target;
        let dmg = this.damage + floor(random(this.damage_dice));
        enemy.hp -= dmg;
        // create a damage ball
        let myPos = this.getAbsPos(gameManager.board), enemyPos = enemy.getAbsPos(gameManager.board);
        spriteManager.createSprite("flying_ball", {
          x: myPos[0], y: myPos[1], tx: enemyPos[0], ty: enemyPos[1], txt: dmg,
          color: red(color(this.color)) + ',' + green(color(this.color)) + ',' + blue(color(this.color))
        });
        ifReady = true;
        break;
      case 'REST': // rest and restore health
        if(this.hp < this.maxhp) { // only restore health when hp is not full
          if(this.hp < this.maxhp - this.recovery) this.hp += this.recovery;
          else this.hp = this.maxhp;
          // show the healing number
          spriteManager.createSprite("floating_text", {
            x: this.getAbsPos(gameManager.board)[0],
            y: this.getAbsPos(gameManager.board)[1],
            txt: '+' + this.recovery,
            color: '80, 220, 80'
          });
          assetsManager.get("Recover").play(); // play the recovery sound
        }
        ifReady = true;
        break;
    }
    // if(ifReady) myCommands.push(cmd); // push the command to local command strings
    return ifReady;
  }

  // Player Data Functions  

  getPlayerList() {
    return gameManager.playerList;
  }
  getMovementScope() { // get the array of the current movement scope
    let scope = [], range = this.movement;
    let x = this.x, y = this.y;
    let grid = gameManager.board;
    // start from the player's position
    for(let row = 0; row < range * 2 + 1; row++) {
      for(let col = 0; col < (range - abs(range - row)) * 2 + 1; col++) {
        const newX = x + abs(range - row) - range + col, newY = y - range + row;
        if(newX >= 0 && newX < grid.col && newY >= 0 && newY < grid.row && (newX !== x || newY !== y) && !this.checkPosition([newX, newY]))
          scope.push([newX, newY]);
      }
    }
    return scope;
  }
  getAttackScope() { // get the array of the current attack scope
    let scope = [], range = this.range;
    let x = this.x, y = this.y;
    let grid = gameManager.board;
    for(let row = 0; row < range * 2 + 1; row++) {
      if(range > 1)
        for(let col = 0; col < (range - abs(range - row)) * 2 + 1; col++) {
          const newX = x + abs(range - row) - range + col, newY = y - range + row;
          if(newX >= 0 && newX < grid.col && newY >= 0 && newY < grid.row && (newX !== x || newY !== y))
            scope.push([newX, newY]);
        }
      else
        for(let col = 0; col < range * 2 + 1; col++) {
          const newX = x - range + col, newY = y - range + row;
          if(newX >= 0 && newX < grid.col && newY >= 0 && newY < grid.row && (newX !== x || newY !== y))
            scope.push([newX, newY]);
        }
    }
    return scope;
  }
 
  checkPosition(pos) { // check if a position has been possessed; return the player who possesses the position
    let playerList = this.getPlayerList();
    for(let p of playerList) {
      if(p.hp > 0 && p.id !== this.id && p.x === pos[0] && p.y === pos[1]) return p;
    }
    return false;
  }
  checkPosInMovement(pos) { // check if a position is within my movement range
    let scope = this.getMovementScope();
    for(let p of scope) {
      if(pos[0] == p[0] && pos[1] == p[1]) return true;
    }
    return false;
  }
  checkPosInRange(pos) { // check if a position is within my attack range
    let range = this.getAttackScope();
    for(let cell of range) {
      if(pos[0] == cell[0] && pos[1] == cell[1]) return true;
    }
    return false;
  }
  checkEnemyInRange(enemy) { // check if an enemy is within my attack range
    let range = this.getAttackScope();
    for(let cell of range) {
      if(cell[0] == enemy.x && cell[1] == enemy.y) return true;
    }
    return false;
  }

  // Visualization Functions

  getAbsPos(grid) { // get player's abusolute position
    let absX = grid.x + grid.cellSize * (this.x + 0.5);
    let absY = grid.y + grid.cellSize * (this.y + 0.5);
    return [absX, absY];
  }
  drawMovementScope(grid, canvas = window) {
    canvas.push();
    canvas.strokeWeight(3);
    canvas.stroke(255);
    canvas.fill(220, 120);
    let scope = this.getMovementScope(); 
    for(let cell of scope) {
      let cell_x = grid.x + grid.cellSize * cell[0], cell_y = grid.y + grid.cellSize * cell[1];
      canvas.rect(cell_x, cell_y, screenParam.GRID_SIZE);
    }
    canvas.pop();
  }
  drawAttackScope(grid, canvas = window) {
    canvas.push();
    let light_color = color(this.color);
    light_color.setAlpha(80);
    canvas.fill(light_color);
    let scope = this.getAttackScope();
    for(let cell of scope) {
      let cell_x = grid.x + grid.cellSize * cell[0], cell_y = grid.y + grid.cellSize * cell[1];
      canvas.rect(cell_x, cell_y, screenParam.GRID_SIZE);
    }
    canvas.pop();
  }
  drawHealScope(grid, canvas = window) {
    canvas.push();
    let cell_x = grid.x + grid.cellSize * this.x, cell_y = grid.y + grid.cellSize * this.y;
    canvas.fill(20, 220, 20, 120);
    canvas.rect(cell_x, cell_y, screenParam.GRID_SIZE);
    canvas.pop();
  }
  drawInfoPanel(grid, canvas = window) { // show the player's info panel
    let x = this.getAbsPos(grid)[0],  y = this.getAbsPos(grid)[1];
    canvas.push();
    canvas.translate(x + screenParam.PLAYER_SIZE, y);
    canvas.stroke(220);
    canvas.fill(80, 200);
    canvas.rect(0, 0, 120, 80);
    // draw the texts
    canvas.noStroke();
    canvas.textAlign(LEFT);
    canvas.textFont(assetsManager.get("text_font"));
    canvas.fill(220);
    canvas.textSize(16);
    canvas.text("HP : " + this.hp + ' / ' + this.maxhp, 10, 20);
    canvas.text("ATK : " + this.damage + ' - ' + (this.damage + this.damage_dice), 10, 42);
    canvas.text("MOV : " + this.movement, 10, 64);
    canvas.pop();
  }
  draw(turn, grid, canvas = window) {
    let x = this.getAbsPos(grid)[0],  y = this.getAbsPos(grid)[1];
    let hp_percent = this.hp / this.maxhp;
    // floating effect
    
    // draw the AI player's attack scope
    // if(this.controller === "AI" && hp_percent > 0) this.drawAttackScope(grid);

    canvas.push();
    canvas.imageMode(CENTER);
    // highlight the current player
    if(turn === this.id) {
      canvas.fill(255, 120);
      canvas.ellipse(x, y, screenParam.PLAYER_SIZE + 25);
    }
    // draw the player's avatar
    // y -= screenParam.PLAYER_SIZE / 2;
    // let size = screenParam.PLAYER_SIZE * 1.2;
    // if(this.hp > 0) {
    //   canvas.fill(this.color);
    //   drawSector(x, y - size * 0.2, screenParam.PLAYER_SIZE, hp_percent, canvas);
    //   canvas.image(assetsManager.get("Avatar_player"), x, y, size, size * 1.3);
    // } else {
    //   drawSector(x, y, screenParam.PLAYER_SIZE, hp_percent, canvas);
    //   canvas.fill(20, 60);
    // }
    if(this.hp > 0) canvas.fill(this.color);
    else canvas.fill(20, 60);
    canvas.stroke(255);
    if(this.controller !== "player") polygon(x, y, screenParam.PLAYER_SIZE / 2, 6);
    else canvas.ellipse(x, y, screenParam.PLAYER_SIZE);
    // draw health bar
    // canvas.noFill();
    // canvas.stroke(0);
    // canvas.rect(x - screenParam.PLAYER_SIZE/2 - 10, y - screenParam.PLAYER_SIZE/2 - 20, (screenParam.PLAYER_SIZE + 20) * hp_percent, 12);

    // show the player's health
    if(this.hp > 0) canvas.fill(255);
    else canvas.fill(255, 80);
    canvas.textFont(assetsManager.get("text_font"));
    canvas.textSize(screenParam.PLAYER_SIZE / 2);
    canvas.textAlign(CENTER, CENTER);
    canvas.text(this.hp >= 0 ? this.hp : 0, x, y - 2);
    canvas.pop();
  }
}

function drawSector(x, y, dia, percent, canvas = window) {
  let start = -PI / 2 + PI * (1 - percent);
  let stop = PI * 3 / 2 - PI * (1 - percent);
  canvas.arc(x, y, dia, dia, start, stop, CHORD);
}
function polygon(x, y, radius, npoints) {
  let angle = TWO_PI / npoints;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}