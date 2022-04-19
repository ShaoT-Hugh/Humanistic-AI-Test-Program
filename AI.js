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
  /* States:
    1-1: If enemy's health is below 20?
    2-1: If enemy is within my attack range?
    2-2: Whoes health is higher?
    3-1: If enemy is within my attack range?
    3-2: If my health is below 30?
    4-1: If I'm in enemy's attack range?
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