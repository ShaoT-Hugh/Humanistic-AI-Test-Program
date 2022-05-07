class StateManager {
  static get(){
    if(!this.instance) this.instance = new StateManager();
    return this.instance;
  }
  constructor() {
    this.isRunning = false;
    // AWAIT: Waiting for the player to choose a command
    // COMMAND: Waiting for the player to choose a target
    this.screenState = "TITLE";
    this.cur_command = "MOVE"; // MOVE is the default command

    this.round = 0;
    this.turn = 0; // whose turn it is now
    this.winner = "";

    this.board = {};
    this.instruction = "";

    let param = screenParam;
    // Level Buttons
    this.levels = [];
    let left_edge = (width - param.LEVEL_BTN_SIZE * 3 - param.LEVEL_BTN_INTERVAL * 2) / 2;
    for(let lv in levelManager)
      if(levelManager[lv] !== null)
        this.levels.push(new levelButton({
          x: left_edge + (parseInt(lv) % 3) * (param.LEVEL_BTN_SIZE + param.LEVEL_BTN_INTERVAL),
          y: param.GRID_CENTER_Y - param.GRID_SIZE * 5 + floor(parseInt(lv) / 3) * (param.LEVEL_BTN_SIZE + param.LEVEL_BTN_INTERVAL),
          w: param.LEVEL_BTN_SIZE, h: param.LEVEL_BTN_SIZE,
          levelData: levelManager[lv],
          func: function() {
            gameManager.startGame(levelManager[lv]);
            gameManager.enableLevels(false);
          }
        }));
      
    // HUM Buttons (ATTACK & REST)
    this.buttons = [];
    let originX = (width - param.BTN_WIDTH * 2 - param.BTN_INTERVAL) / 2;
    let originY = param.GRID_CENTER_Y + 10 * param.GRID_SIZE / 2;
    this.buttons.push(new cusButton({
      x: originX, y: originY + param.BTN_HEIGHT, width: param.BTN_WIDTH, height: param.BTN_HEIGHT,
      text: "ATTACK",
      func: function() {
        gameManager.cur_command = "ATTACK";
        gameManager.switchState("COMMAND");
      },
      text_size: param.BTN_HEIGHT / 3
    }));
    
    this.buttons.push(new cusButton({
      x: originX + (param.BTN_WIDTH + param.BTN_INTERVAL), y: originY + param.BTN_HEIGHT, width: param.BTN_WIDTH, height: param.BTN_HEIGHT,
      text: "REST",
      func: function() {
        gameManager.cur_command = "REST";
        gameManager.switchState("COMMAND");
        gameManager.sendCommand();
      },
      text_size: param.BTN_HEIGHT / 3
    }));

    this.playerList = []; // all the player objects
  }
  enableButtons(enable = true) { // enable all the buttons for the player
    for(let btn of this.buttons) btn.enable(enable);
  }
  triggerButtons() { // attempt to trigger all the buttons
    for(let btn of this.buttons) if(btn.enabled) btn.ifClicked();
    if(this.cur_command === "MOVE" && this.playerList[this.turn].controller === "player") { // if the command is MOVE
      this.sendCommand(); // if no command button is pressed, send MOVE as default command
    }
  }
  resetButtons() { // reset the position of the buttons
    for(let btn of this.buttons) {
      btn.pos_y = screenParam.GRID_CENTER_Y + this.board.row * this.board.cellSize / 2 + screenParam.BTN_HEIGHT;
    }
  }
  enableLevels(enable = true) { // enable all the level buttons
    for(let btn of this.levels) btn.enable(enable);
  }

  startGame(level = {}) {
    this.playerList = []; // clear all the players
    this.cur_command = "MOVE"; // reset command string
    this.winner = ""; // reset winner
    
    // read level data
    // create new grid/map
    this.board = new Grid(
      screenParam.GRID_CENTER_X, screenParam.GRID_CENTER_Y,
      level.grid.col, level.grid.row,
      screenParam.GRID_SIZE, "CENTER"
    );
    // create new players
    for(let p of level.players) this.playerList.push(new Player(p));

    this.switchState("AWAIT");
    this.resetButtons(); // reset button positions
    this.enableButtons(true); // enable all the buttons
    this.isRunning = true; // start the game
    assetsManager.get("Game_start").play(); // play the start sound
    // if the 1st player is AI, start next round
    if(this.playerList[this.turn].controller == 'AI') this.nextRound();

    GameLoop ++; // calculate the entire game
  }
  switchState(new_state) { // switch the screen state
    switch(new_state) {
      case "AWAIT":
        this.screenState = "AWAIT";
        this.enableButtons(true); // enable the buttons
        this.cur_command = "MOVE"; // reset command string
        break;
      case "COMMAND":
        this.screenState = "COMMAND";
        this.enableButtons(false); // disable the buttons
        break;
      case "TITLE":
        this.screenState = "TITLE";
        this.board = {}; // clear the board
        this.enableButtons(false); // disable the buttons
        this.enableLevels(true); // enable the level buttons
        break;
    }
  }
  updateGame() { // update game state
    // check the game state
    let cur_player = this.playerList[this.turn];
    if(this.screenState === "AWAIT") {
      if(cur_player.hp > 0) cur_player.drawMovementScope(this.board); // draw the movement scope
    } else if(this.screenState === "COMMAND" && this.cur_command === "ATTACK") {
      cur_player.drawAttackScope(this.board); // draw the attack range
    }
    this.showPlayerInfo();

    this.highlightCursor(); // show the highlight cursor

    this.drawButtons(); // always show the buttons
    // show instruction texts
  }
  endGame() {
    this.round = 0;
    this.turn = 0;
    // reset round & turn number
    this.switchState("AWAIT");
    this.enableButtons(false); // disable all the buttons
    this.isRunning = false; // end the game
    assetsManager.get("Game_end").play(); // play the end sound
  }

  sendCommand() { // execute the current command to see if the command is executable
    let ifReady = false;
    let targt_pos = this.getCursor(), target;
    if(targt_pos || this.cur_command === "REST") { // target must be a valid cell of the game board
      let targt_player = this.checkPosition(targt_pos[0], targt_pos[1]);
      let cur_player = this.playerList[this.turn];
      let abs_pos = this.getAbsPos(targt_pos, this.board);

      switch(this.cur_command) {
        case "MOVE": // target must be an empty position && within the player's movement range
          if(!targt_player && cur_player.checkPosInMovement(targt_pos)) {
            target = targt_pos;
            ifReady = true;
            this.switchState("COMMAND"); // switch to command state to disable the buttons
          } else {
            spriteManager.createSprite("floating_text", {
              x: abs_pos[0],
              y: abs_pos[1],
              txt: "Cannot move there!",
              color: '220, 220, 220'
            });
            assetsManager.get("Invalid_target").play();
            this.switchState("AWAIT"); // return to AWAIT state
          }
          break;
        case "ATTACK": // target must be an enemy && within the player's attack range
          if(targt_player.camp !== cur_player.camp && cur_player.checkEnemyInRange(targt_player)) {
            target = targt_player;
            ifReady = true;
          } else {
            spriteManager.createSprite("floating_text", {
              x: abs_pos[0],
              y: abs_pos[1],
              txt: "Invalid Target!",
              color: '220, 220, 220'
            });
            assetsManager.get("Invalid_target").play();
          }
          break;
        case "REST": // no target; restore health and end the turn
          target = null;
          ifReady = true;
          break;
        default:
          target = null; // default command: REST
          ifReady = true;
      }
    }
    if(ifReady) this.nextRound({command: this.cur_command, target: target}); // send out the command
  }
  nextRound(command = {}) { // attempt to go to the next round
    let ifReady = false; // if available to go to the next round
    let cur_player = this.playerList[this.turn];
    // check if the player is still alive
    if(cur_player.hp > 0 && cur_player.controller !== "Null") {
      // check if the player is controlled by the real player or AI
      if(cur_player.controller === 'player')
        ifReady = cur_player.act(command);
      else
        ifReady = cur_player.act();
    } else {
      ifReady = true;
    }
    clearTimeout(waitTimer);
    // console.log(this.turn);
    if(ifReady) { // if the current player has moved successfully, go to the next round
      // check if the game is over
      let remainingPlayers = {red: 0, blue: 0, yellow: 0, green: 0}, alive_team = [];
      for(let p of this.playerList)
        if(p.hp >= 0) remainingPlayers[p.camp] ++;
      for(let camp in remainingPlayers)
        if(remainingPlayers[camp] > 0) alive_team.push(camp);
      if(alive_team.length <= 1) {
        this.winner = alive_team[0];
        this.endGame();
      } else { // if the game is continuing
        this.turn = (this.turn + 1) % this.playerList.length;
        this.round += 1;
        let next_player = this.playerList[this.turn];
        this.cur_command = "MOVE"; // reset command string
        // check if the next player is controlled by AI
        if(next_player.controller === 'AI' || next_player.controller === 'Null') {
          this.enableButtons(false);
          waitTimer = setTimeout(function() {
            gameManager.nextRound();
          }, 1500);
        } else if(next_player.hp <= 0) this.nextRound();
        else this.switchState("AWAIT");
      }  
    }
  }

  getAbsPos(pos, grid) { // get the abusolute position of a grid cell
    let absX = grid.x + grid.cellSize * (pos[0] + 0.5);
    let absY = grid.y + grid.cellSize * (pos[1] + 0.5);
    return [absX, absY];
  }
  getCursor() { // get the cell which cursor is on
    let x = mouseX, y = mouseY, grid = this.board;
    // check if the cursor is within the game board, return the cell which cursor is on
    if(x >= grid.x && x <= grid.right && y >= grid.y && y <= grid.bottom) {
      let col = floor((x - grid.x) / grid.cellSize);
      let row = floor((y - grid.y) / grid.cellSize);
      return [col, row];
    } else return false; // if the cursor is outside the board, return false
  }
  highlightCursor() { // highlight the player's cursor
    // check if the cursor is within the game board
    let cell = this.getCursor(), grid = this.board;
    if(cell) {
      // draw the highlighted block
      let cellX = grid.x + cell[0] * grid.cellSize, cellY = grid.y + cell[1] * grid.cellSize;
      let cur_player = this.playerList[this.turn];
      push();
      if(((this.cur_command === "MOVE" && cur_player.checkPosInMovement(cell)) || 
      (this.cur_command === "ATTACK" && cur_player.checkPosInRange(cell))) &&
      cur_player.controller === "player") {
        strokeWeight(6);
        stroke(20, 80, 20);
        fill(20, 120, 20, 128);
      } else { // stress the cursor if the cell is a valid target in command mode
        noStroke();
        fill(120, 20, 20, 128);
      }
      rect(cellX, cellY, this.board.cellSize);
      pop();
    }
  }
  showPlayerInfo() { // In "AWAIT" state, player can check each other player's movement and attack scope
    let cell = this.getCursor(), grid = this.board;
    // check if the mouse is over any player
    for(let p of this.playerList) {
      if(p.x === cell[0] && p.y === cell[1]) {
        // p.drawMovementScope(grid);
        p.drawAttackScope(grid);
        p.drawInfoPanel(grid);
      }
    }
  }
  checkPosition(x, y) { // check if a position has been possessed, return the player on the position
    for(let p of this.playerList)
      if(p.hp > 0 && p.x === x && p.y === y) return p;
    return false;
  }

  // Visualization functions
  drawPlayers(canvas = window) {
    for(let p of this.playerList) {
      p.draw(this.turn, this.board);
    }
    // tell the player who's turn it is now
    let txt_x = width / 2, txt_y = screenParam.GRID_SIZE;
    canvas.push();
    canvas.fill(255);
    canvas.textStyle(BOLD);
    canvas.textSize(screenParam.LARGE_TEXT);
    if(this.playerList[this.turn].controller === 'player') canvas.text("YOUR TURN", txt_x, txt_y);
    else canvas.text("AI PLAYER'S TURN", txt_x, txt_y);
    canvas.pop();
  }
  drawButtons(canvas = window) {
    for(let btn of this.buttons) btn.render(canvas);
  }
  drawLevels(canvas = window) {
    for(let btn of this.levels) btn.render(canvas);
  }
}