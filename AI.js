/* AI mode description:
    EASY: Always head towards the nearest enemy; attack the neariest enemy; only recover when health is lower than 20
    MEDIUM: 
    HARD: Escape when health is the lowest
*/

class AI {
  constructor(player, mode) {
    this.player = player;
    this.mode = mode || "NORMAL";

    this.command = {};
    this.tree = new Selector(
      "Selector_0", 0,
      [
        new Sequence(
          "Sequence_1", 1,
          [
            new Behavior(
              "If I'm not going to die", 2,
              BehaviorNodes.ifMyNotDying, this.player
            ),
            new Behavior(
              "If there is any enemy within my range?", 2,
              BehaviorNodes.ifEnemyInRange, this.player
            ),
            new Behavior(
              "Select Target", 2,
              BehaviorNodes.selectTarget, this.player
            )
          ]
        ),
        new Selector(
          "Selector_1", 1,
          [
            new Sequence(
              "Sequence_2-1", 2,
              [
                new Behavior(
                  "If I'm safe", 3,
                  BehaviorNodes.ifMySafe, this.player
                ),
                new Behavior(
                  "Select Movement(approach)", 3,
                  BehaviorNodes.selectMovement_approach, this.player
                )
              ]
            ),
            new Behavior(
              "Select Movement(escape)", 2,
              BehaviorNodes.selectMovement_escape, this.player
            )
          ]
        ),
        new Behavior(
          "Recover", 1,
          BehaviorNodes.recover, this.player
        ),
      ]
    );
  }

  run() { // execute the behavior tree
    if(this.tree.execute()) {
      // console.log(this.command);
      return this.command; // send out the final command in the end
    } else return {command: "SKIP"}
  }
}

const Auxiliary = { // auxiliary functions used to analyze game data

  // movement conditions
  // 2 player conditions

  healthDiff: function(player1, player2) { // calculate the difference of 2 players
    return player1.hp - player2.hp;
  },
  ifPlayerActAhead: function(player1, player2) { // check if player2 is going to act before player1
    let cur_turn = gameManager.turn, playerNum = this.getPlayerList().length;
    if(player1.id === cur_turn || player2.id === cur_turn) return true;
    else {
      let turn1 = player1.id - cur_turn < 0 ? playerNum + player1.id - cur_turn : player1.id - cur_turn;
      let turn2 = player2.id - cur_turn < 0 ? playerNum + player2.id - cur_turn : player2.id - cur_turn;
      if(turn1 > turn2) return true;
      else return false;
    }
  },
  ifPlayerInRange: function(player1, player2) { // check if player2 is within player1 attack range
    let scope = player1.getAttackScope();
    for(let cell of scope) {
      if(cell[0] == player2.x && cell[1] == player2.y) return true;
    }
    return false;
  },
  ifPosInRange: function(pos, player) { // check if a position is within a player's attack range
    let range = player.getAttackScope();
    for(let cell of range) {
      if(cell[0] == pos[0] && cell[1] == pos[1]) return true;
    }
    return false;
  },
  distance: function(player1, player2) { // calculate the Manhattan distance(as array) between 2 players, return [dist_x, dist_y]
    let x1 = player1.x, y1 = player1.y, x2 = player2.x, y2 = player2.y;
    return [x1 - x2, y1 - y2];
    // [0] < 0 => Left: player1, Right: player2 | [0] > 0 => Left: player2, Right: player1
    // [1] < 0 => Top: player1, Bottom: player2 | [1] > 0 => Top: player2, Bottom: player1
  },
  distanceAbs: function(player1, player2) { // calculate the Manhattan distance between 2 players, return distance
    let x1 = player1.x, y1 = player1.y, x2 = player2.x, y2 = player2.y;
    return abs(x1 - x2) + abs(y1 - y2);
  },

  // multi-player conditions

  getPlayerList: function() {
    return gameManager.playerList;
  },
  getEnemies: function(my) { // get all my enemies
    let enemies = [], playerList = this.getPlayerList();
    for(let p of playerList) {
      if(p.camp !== my.camp && p.hp > 0) enemies.push(p);
    }
    return enemies;
  },
  getEnemiesInRange: function(my) { // get all the enemies that I can attack
    let allEnemies = this.getEnemies(my), enemies = [];
    for(let e of allEnemies) {
      if(this.ifPlayerInRange(my, e)) enemies.push(e);
    }
    return enemies;
  },
  getEnemiesThreatenMy: function(my) { // get all the enemies who can attack me
    let allEnemies = this.getEnemies(my), enemies = [];
    for(let e of allEnemies) {
      if(this.ifPlayerInRange(e, my)) enemies.push(e);
    }
    return enemies;
  },
  getFriend: function(my) { // return all my friends
    let friends = [], playerList = this.getPlayerList();
    for(let p of playerList) {
      if(p.id !== my.id && p.camp == my.camp && p.hp > 0) friends.push(p);
    }
    return friends;
  },

  sortPlayerHealth: function(players) { // sort players according to their health(low to high)
    let result = players;
    for(let i = 0; i < players.length - 1; i++) {
      for(let j = 0; j < players.length - 1 - i; j++) {
        if(result[j].hp > result[j + 1].hp) {
          let temp = result[j + 1];
          result[j+1] = result[j];
          result[j] = temp;
        }
      }
    }
    return result;
  },
  healthEvaluate: function(player1, player2) { // compare how much player1 is in more predominant position than player2
    let roundToDie1 = player1.hp / (player2.damage + player2.damage_dice / 2);
    let roundToDie2 = player2.hp / (player1.damage + player1.damage_dice / 2);
    return roundToDie1 - roundToDie2; // higher means you're more upper; lower means you're more inferior
  },
  allEnemyEvaluate: function(my) { // compare I and all my enemies
    let enemies = this.getEnemies(my), comparision = [];
    for(let e of enemies) {
      comparision.push(this.healthEvaluate(my, e));
    }
    return comparision;
  },
  riskEvaluate: function(player) { // evaluate a player's risk factor
    let enemies = this.getEnemiesThreatenMy(player);
    if(enemies.length > 0) {
      let hp = player.hp, maxhp = player.maxhp, losthp = 0;
      // get valid enemies who are going to act before the target player
      for(let e of enemies) {
        if(this.ifPlayerActAhead(player, e)) {
          let dmg = e.damage + e.damage_dice / 2;
          losthp += dmg;
          hp -= dmg;
        }
      }
      // evaluate the health state
      if(hp <= 0) return -5; // deadly: the player is going to die
      else if(hp <= maxhp * 0.1) return 1; // agonal: the player may get killed in the following rounds
      else if(losthp >= maxhp / 2 || hp <= maxhp * 0.3) return 2; // vulnerable: the player may lose too much hp
      else if(hp <= maxhp * 0.6) return 4; // not well
      else if(hp > maxhp * 0.6 && losthp > 0) return 6; // healthy
    } else return 10; // no enemy nearby the player

    // 0-Dying: Probably being killed before next action
    // 1-Agonal: Probably being killed after next action
    // 2-Vulnerable: might lose too much hp in this round
    // 4-Unhealthy: Not well
    // 6-Healthy: Very healthy
    // 10-Safe: No enemy nearby
  },
  nearbyEnemyEvaluate: function(my) { // get an array of risk evaluation of enemies nearby me
    let enemies = this.getEnemiesInRange(my), comparision = [];
    let myState = this.riskEvaluate(my);
    // evaluate every enemy
    for(let e of enemies) { // {res} is decided by the overall feeling and the actual health difference
      let res = myState - this.riskEvaluate(e) + this.healthEvaluate(my, e) + 1 + this.getFriend(my).length;
      // console.log(myState + ',' + this.riskEvaluate(e) + ',' + this.healthEvaluate(my, e));
      comparision.push(res);
    }
    return comparision;
  },
  battleFieldAnalyze: function(my) { // get threat level scores of my reachable positions
    let moveScope = my.getMovementScope(), results = [];
    moveScope.push([my.x, my.y]); // add current position as [0] to the moveScope
    let enemies = this.getEnemies(my);
    // check the movement scope to calculate the threat level
    for(let myCell of moveScope) {
      let threat_level = 0;
      for(let e of enemies) {
        if(this.ifPosInRange(myCell, e)) threat_level -= (e.damage + e.damage_dice / 2) / my.maxhp * 10;
      }
      results.push({pos: myCell, score: threat_level});
    }
    return results;
  }
}

// all behaviors (behavior nodes only return true(executable) or false(inexecutable))
const BehaviorNodes = {
  ifMyNotDying: function(my) { // check if I'm not going to die
    if(Auxiliary.riskEvaluate(my) > 0) return true;
    else return false;
  },
  ifEnemyInRange: function(my) { // check if there is any enemy within my attack range
    let enemyList = Auxiliary.getEnemiesInRange(my);
    if(enemyList.length > 0) return true;
    else return false;
  },
  // ifMyNotInRange: function(my) { // check if I'm not in any enemy's attack range
  //   let enemyList = Auxiliary.getEnemiesThreatenMy(my);
  //   if(enemyList.length > 0) return !true;
  //   return !false;
  // },
  selectTarget: function(my) { // choose a target to attack (content return)
    let enemies = Auxiliary.getEnemiesInRange(my);
    let evaluation = Auxiliary.nearbyEnemyEvaluate(my);
    // calculate the expectation of each target
    let exp = 0;
    for(let res of evaluation) exp += res * (res < 0 ? 0.4 : 0.8);
    // console.log(exp);
    // decide if attack
    if(exp >= -2) {
      // choose the most vulnerable target
      let target = enemies[evaluation.indexOf(max(evaluation))];
      my.ai.command = {command: "ATTACK", target: target}; // return the exact command
      return true;
    } else return false;
  },

  ifMySafe: function(my) { // check I'm safe (no enemy nearby)
    if(Auxiliary.riskEvaluate(my) >= 10) return true;
    else return false;
  },
  selectMovement_approach: function(my) { // select the best position to move (approach)
    let fieldEva = Auxiliary.battleFieldAnalyze(my); // make a field evaluaion
    let enemies = Auxiliary.getEnemies(my); // get all the enemies

    let evaluation = Auxiliary.allEnemyEvaluate(my); // make an enemy evaluation
    // check if I'm in dominant place
    let final_res = 0;
    for(let res of evaluation) final_res += res;
    if(my.hp >= my.maxhp - my.recovery || final_res >= 0) {
      let largestDis = (GRID_COL - 1) + (GRID_ROW - 1);
      let highest_score = -100; // record the best score
      // loop field score array and update score of each position
      for(let posInfo of fieldEva) {
        let target_score = 0;
        let pos = posInfo.pos;
        // approach the weakest enemy
        // for the safe position(score === 0), the closer the better
        for(let e of enemies) {
          let res = Auxiliary.healthEvaluate(my, e); // if the enemy is weaker, then the closer the better
          res = res >= 0 ? res : 0; // if the enemy is too strong, ignore it as I'm in dominant place
          let dist_score = map(min(Auxiliary.distanceAbs({x: pos[0], y: pos[1]}, e), Auxiliary.distanceAbs(my, e)), 0, largestDis, 10, 0);
          target_score += (res + 0.01) * dist_score;
        }
        // console.log(posInfo.score + ',' + target_score);
        posInfo.score += target_score * 10;

        // update the highest score
        if(posInfo.score > highest_score) highest_score = posInfo.score;
      }
      // randomly choose a position from all the best positions
      let best_positions = [];
      for(let posInfo of fieldEva) if(posInfo.score === highest_score) best_positions.push(posInfo.pos);
      let best_pos = best_positions[floor(random(best_positions.length))];

      if(best_pos[0] !== my.x || best_pos[1] !== my.y) { // check if the best position is the current position
        my.ai.command = {command: "MOVE", target: best_pos}; // return moving command
        return true;
      } else return false;
    } else  // if I'm not in dominant place, don't attempt to approach
      return false;
  },
  selectMovement_escape: function(my) { // select the best position to move (escape)
    let fieldEva = Auxiliary.battleFieldAnalyze(my); // make a field evaluaion
    let enemies = Auxiliary.getEnemies(my); // get all the enemies
    // let evaluation = Auxiliary.allEnemyEvaluate(my); // make an enemy evaluation

    let largestDis = (GRID_COL - 1) + (GRID_ROW - 1);
    let highest_score = -100; // record the best score
    // loop field score array and update score of each position
    for(let posInfo of fieldEva) {
      let target_score = 0;
      let pos = posInfo.pos;
      // escape the strongest enemy
      // for the safe position(score === 0), the further the better
      for(let e of enemies) {
        // check if I'm in relative dominant place
        let res = Auxiliary.healthEvaluate(my, e);
        // dist_score: evaluate the distance between 2 players -> the further the smaller
        let dist_score = map(max(Auxiliary.distanceAbs({x: pos[0], y: pos[1]}, e), Auxiliary.distanceAbs(my, e)), 0, largestDis, 1, 0);
        // if the enemy is too strong, then the further the better
        // if the enemy is not that strong, then the nearer the better
        target_score += res < -5 ? (res - 0.01) * dist_score : (res + 5) * dist_score;
      }
      posInfo.score += target_score;
      
      // update the highest score
      if(posInfo.score > highest_score) highest_score = posInfo.score;
    }
    // randomly choose a position from all the best positions
    let best_positions = [];
    for(let posInfo of fieldEva) if(posInfo.score === highest_score) best_positions.push(posInfo.pos);
    let best_pos = best_positions[floor(random(best_positions.length))];

    if(best_pos[0] !== my.x || best_pos[1] !== my.y || highest_score < -5) { // check if the best position is the current position
      my.ai.command = {command: "MOVE", target: best_pos}; // return moving command
      return true;
    } else return false;
  },
  // selectMovement: function(my) { // select the best position to move (escape)
  //   let fieldEva = Auxiliary.battleFieldAnalyze(my); // make a field evaluaion
  //   let enemies = Auxiliary.getEnemies(my); // get all the enemies
  //   // let evaluation = Auxiliary.allEnemyEvaluate(my); // make an enemy evaluation

  //   let largestDis = sqrt(sq(GRID_SIZE * (GRID_COL - 1)) + sq(GRID_SIZE * (GRID_ROW - 1)));
  //   let highest_score = -100, best_pos = [];
  //   // loop field score array and update score of each position
  //   for(let posInfo of fieldEva) {
  //     let target_score = 0;
  //     // escape the strongest enemy
  //     for(let e of enemies) {
  //       let res = Auxiliary.healthEvaluate(my, e); // if the enemy is stronger, then the further the better
  //       let pos = posInfo.pos;
  //       target_score += res * map(min(Auxiliary.distanceAbs({x: pos[0], y: pos[1]}, e), largestDis / 2), 0, largestDis, 5, 1);
  //     }
  //     posInfo.score += target_score;
  //     // choose the position of the highest score
  //     if(posInfo.score > highest_score) {
  //       highest_score = posInfo.score;
  //       best_pos = posInfo.pos;
  //     }
  //   }
  //   if(best_pos[0] !== my.x || best_pos[1] !== my.y) { // check if the best position is the current position
  //     my.ai.command = {command: "MOVE", target: best_pos}; // return moving command
  //     return true;
  //   } else return false;
  // },

  recover: function(my) {
    if(my.hp < my.maxhp) {
      my.ai.command = {command: "RECOVER"};
      return true;
    } else return false;
  }
}

// Tree Nodes
class Node { // base class for nodes
  constructor(name, lv, ifAnounce = false) {
    this.name = name;
    this.level = lv;
    this.ifAnounce = ifAnounce;
  }
}
class Selector extends Node { // Selector node
  constructor(name, lv, children) {
    super(name, lv);
    this.children = children || [];
  }
  execute() {
    if(this.ifAnounce) console.log(this.name);
    for(let node of this.children)
      if(node.execute()) return true;
    return false;
  }
}
class Sequence extends Node { // Sequence node
  constructor(name, lv, children) {
    super(name, lv);
    this.children = children || [];
  }
  execute() {
    if(this.ifAnounce) console.log(this.name);
    for(let node of this.children)
      if(!node.execute()) return false;
    return true;
  }
}
class Behavior extends Node { // behavior/conditional node
  constructor(name, lv, behavior, param) {
    super(name, lv);
    this.func = behavior;
    this.param = param;
  }
  execute() {
    if(this.ifAnounce) console.log(this.name);
    return this.func(this.param);
  }
}