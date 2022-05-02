/* AI mode description:
    EASY: Always head towards the nearest enemy; attack the neariest enemy; only recover when health is lower than 20
    MEDIUM: 
    HARD: Escape when health is the lowest
*/

class AI {
  constructor(player, mode) {
    this.player = player;
    this.mode = 'EASY';

    this.conditions = {
      // single enemy strategies
      enemyExecutionCheck: function(my, enemy) { // check if the enemy's health is below my attack damage
        if(enemy.hp <= my.damage) return true;
        else return false;
      },
      myExecutionCheck: function(my, enemy) { // check my health is below enemy's attack damage
        if(my.hp < enemy.damage + enemy.damage_dice) return true;
        else return false;
      },
      healthComparison: function(my, enemy) { // compare my health and the enemy's health; return true if my health is higher
        if(my.hp > enemy.hp) return true;
        else return false;
      },
      ifEnemyInScope: function(my, enemy) { // check if the enemy is within my attack range
        let scope = my.getAttackScope(), ifInScope = false;
        for(let cell of scope) {
          if(cell[0] == enemy.x && cell[1] == enemy.y) {
            ifInScope = true;
            break;
          }
        }
        return ifInScope;
      },
      ifInRange: function(pos, player) { // check if a position is within a player's attack range
        let range = player.getAttackScope();
        for(let cell of range) {
          if(cell[0] == pos[0] && cell[1] == pos[1]) return true;
        }
        return false;
      }
    }

    this.actions = {
      approachEnemy(my, enemy) { // decide which direction to go to approach the enemy
        let diff = my.distance(my, enemy);
        let myMoveScope = my.getMovementScope();
        if(abs(diff[0]) > abs(diff[1])) {
          if(diff[0] < 0) return "RIGHT";
          else return "LEFT";
        } else {
          if(diff[1] < 0) return "DOWN";
          else return "UP";
        }
      },
      escapeEnemy(my, enemy) { // escape from the enemy
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

  getPlayerList() {
    return gameManager.playerList;
  }
  getEnemy(my) { // return enemies
    let enemies = [], playerList = this.getPlayerList();
    for(let p of playerList) {
      if(p.camp !== my.camp && p.hp > 0) enemies.push(p);
    }
    return enemies;
  }
  getFriend(my) { // return friends
    let friends = [], playerList = this.getPlayerList();
    for(let p of playerList) {
      if(p.id !== my.id && p.camp == my.camp && p.hp > 0) friends.push(p);
    }
    return friends;
  }
  sortPlayerHealth(players) { // sort players according to their health(low to high)
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
  }

  battleFieldAnalyze(my, playerList) { // get threat levels of surrounding position
    let moveScope = my.getMovementScope(), result = [];
    // check the movement scope to calculate the threat level
    for(let [index, myCell] of moveScope.entries()) {
      for(let p of playerList) {
        if(p.camp !== my.camp && ifInRange(myCell, p)) result.push(p.damage);
      }
    }

    return result;
  }

  /* States:
    1-1: If enemy's health is below 20?
    2-1: If enemy is within my attack range?
    2-2: Whoes health is higher?
    3-1: If enemy is within my attack range?
    3-2: If my health is below 30?
    4-1: If I'm in enemy's attack range?
  */
  stateCheck(state) {
    let my = this.player, conditions = this.conditions, actions = this.actions;
    let enemy = this.sortPlayerHealth(this.getEnemy(my))[0];

    switch(state) {
      case '1-1':
        if(conditions.enemyExecutionCheck(my, enemy)) return this.stateCheck('2-1');
        else return this.stateCheck('2-2');
      case '2-1':
        if(conditions.ifEnemyInScope(my, enemy)) return "ATTACK";
        else return this.stateCheck('2-2');
      case '2-2':
        if(conditions.healthComparison(my, enemy)) return this.stateCheck('3-1');
        else return this.stateCheck('3-2');
      case '3-1':
        if(conditions.ifEnemyInScope(my, enemy)) return "ATTACK";
        else return actions.approachEnemy(my, enemy);
      case '3-2':
        if(conditions.myExecutionCheck(my, enemy)) return this.stateCheck('4-1');
        else return this.stateCheck('3-1');
      case '4-1':
        if(conditions.ifMyInScope(my, enemy)) return actions.escapeEnemy(my, enemy);
        else return "RECOVER";
    }
  }
}

class Tree {
  constructor(player, mode) {
    this.player = player;
  }
}

class Node { // base class for nodes
  constructor(name, type, children) {
    this.name = name;
    this.type = type;
    this.children = children;
  }
  execute() {
    switch(this.type) {
      case "Fallback":
        for(let node of this.children)
          if(node.execute()) return true;
        return false;
    }
  }
}

class NonLeafNode extends Node{

}