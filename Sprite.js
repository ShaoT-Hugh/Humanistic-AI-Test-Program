class SpriteManager {
  static get(){
    if(!this.instance) this.instance = new SpriteManager();
    return this.instance;
  }
  constructor() {
    this.floating_texts = [];
    this.flying_balls = [];
    this.ripples = [];
  }
  createSprite(type, config) {
    switch(type) {
      case "floating_text":
        this.floating_texts.push(new FloatingText(config));
        break;
      case "flying_ball":
        this.flying_balls.push(new Flyingball(config));
        break;
    }
  }

  update() { // update corresponding sprites(if no parameter, update all)
    // update floating texts
    if(this.floating_texts.length > 0) {
      for(let [index, txt] of this.floating_texts.entries())
        if(txt.render()) this.floating_texts.splice(index, 1);
    }
    // update flying balls
    if(this.flying_balls.length > 0) {
      for(let [index, ball] of this.flying_balls.entries())
        if(ball.render()) this.flying_balls.splice(index, 1);
    }
  }
}

class Sprite {
  constructor({x, y, tx, ty, rate = 40} = {}) {
    this.opos_x = x; // initial x position
    this.opos_y = y; // initial y position
    this.pos_x = x; // current x position
    this.pos_y = y; // current y position
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

// damage ball
class Flyingball {
  constructor({x, y, tx, ty, txt, rate = 20, size = 5, color = '255, 255, 255'} = {}) {
    this.pos_x = x; // current x position
    this.pos_y = y; // current y position
    this.targt_x = tx; // target x position
    this.targt_y = ty; // target y position
    this.text = txt || null; // text showing when collide
    this.dir = direct(tx, ty, x, y);
    this.spd = dist(x, y, tx, ty) / rate;
    this.size = size + map(txt, 0, 50, 0, 10);
    this.color = color;
    this.trace = [];

    this.state = "moving"
  }
  move() {
    let x = this.pos_x, y = this.pos_y, tx = this.targt_x, ty = this.targt_y;
    // record the trace
    if(frameCount % 3 == 0){ // interval of the trace
      let trace = this.trace;
      if(this.state === "moving") trace.push([x, y]);
      if(trace.length > 6 || this.state === "ready") trace.splice(0, 1);
    }
    // update the position
    // if the current postion does not match the target position, move the sprite
    if(x !== tx || y !== ty) {
      this.pos_x += this.spd * cos(this.dir);
      this.pos_y += this.spd * sin(this.dir);
      // if the current position get close enough to the target, stop moving
      if(abs(this.pos_x - tx) < 1) this.pos_x = tx;
      if(abs(this.pos_y - ty) < 1) this.pos_y = ty;
    } else if(this.state === "moving") {
      this.state = "ready";
      spriteManager.createSprite("floating_text", { // create the damage number
        x: this.pos_x, y: this.pos_y,
        txt: '-' + this.text,
        color: '220, 80, 80'
      });
      assetsManager.get("Damaged").play();
    }
  }
  render(canvas = window) {
    this.move();
    // render the trace
    for(let [i, shade] of this.trace.entries()){
      canvas.fill('rgba(' + this.color + ',' + map(i, 0, this.trace.length, 180, 0) + ')');
      canvas.ellipse(shade[0], shade[1], map(i, 0, 6, 2, this.size));
    }
    let x = this.pos_x, y = this.pos_y;
    canvas.push();
    if(this.state !== "ready") canvas.fill('rgb(' + this.color + ')');
    else canvas.fill('rgba(' + this.color + ',' + map(this.trace.length, 0, 6, 0, 180) + ')');
    canvas.circle(x, y, this.size);
    canvas.pop();
    return this.state === "ready" && this.trace.length <= 0;
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
    let x = this.pos_x, y = this.pos_y, ty = this.targt_y;
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
    return this.isReady && apl <= 0;
  }
}

class cusButton { // (x position, y position, width, height, event listener, button image, text, text color, text size)
  constructor({x, y, width, height, func, imgs = [], text = '', text_col = 255, text_size = 20, offsetX = 0, offsetY = 0} = {}){
    this.pos_x = x;
    this.pos_y = y;
    this.offset_x = offsetX; // offset used to output the absolute coordination of the button
    this.offset_y = offsetY;
    this.width = width;
    this.height = height;
    
    this.func = func; // event listener on the button
    this.imgs = imgs; // [0]: normal; [1]: clicked
    this.text = text;
    this.text_color = text_col;
    this.text_size = text_size;
    this.enabled = false; // if the button is enabled
    this.Clicked = false;

    this.autoTrigger = false; // if true, the button will be automatically triggered
  }

  // enable
  enable(isEnabled){
    this.enabled = isEnabled;
  }

  // check if the mouse is on the button
  ifMouseOn(){
    let x = this.pos_x + this.offset_x, y = this.pos_y + this.offset_y, w = this.width, h = this.height;
    let mx = mouseX, my = mouseY;
    if(mx > x + w || mx < x || my > y + h || my < y)
      return false;
    else return true;
  }

  // check if the button is clicked
  ifClicked(){
    if(this.ifMouseOn()) {
      this.Clicked = true;
      this.func(); // trigger the button
      assetsManager.get("Click_button").play(); // play clicking sound
    }
  }

  render(canvas = window){
    let x = this.pos_x, y = this.pos_y, w = this.width, h = this.height;
    // check if the button is clicked
    if(this.autoTrigger && this.enabled && !this.Clicked && mouseIsPressed) this.ifClicked();
    if(this.Clicked && !mouseIsPressed) this.Clicked = false; // always reset the button clicked state

    canvas.push();
    canvas.imageMode(CORNER);
    // canvas.textFont(text_font);
    canvas.textAlign(CENTER);
    canvas.textSize(this.text_size);
    if(this.imgs.length > 0) {
      canvas.fill(this.text_color);
      if(!this.Clicked) {
        canvas.image(this.imgs[0], x, y);
        canvas.text(this.text, x + w/2, y + h/2);
      }else{
        canvas.image(this.imgs[1], x, y + 2);
        canvas.text(this.text, x + w/2, y + h/2 + 2);
      }
    } else { // if there is no button image, show a rectangle instead
      canvas.strokeWeight(1);
      if(this.enabled) {
        canvas.stroke(220);
        if(!this.Clicked) {
          canvas.fill(80);
          canvas.rect(x, y, w, h);
          canvas.fill(220);
          canvas.text(this.text, x + w/2, y + h/2);
        } else {
          canvas.fill(180);
          canvas.rect(x, y, w, h);
          canvas.fill(40);
          canvas.text(this.text, x + w/2, y + h/2);
        }
      } else { // if the button is disabled, make it grey
        canvas.stroke(120);
        canvas.fill(40);
        canvas.rect(x, y, w, h);
        canvas.fill(120);
        canvas.text(this.text, x + w/2, y + h/2);
      }
      
    }
    canvas.pop();
  }
}

class levelButton extends cusButton {
  constructor({x, y, w, h, levelData, func} = {}) {
    super({x: x, y: y, width: w, height: h, func: func});
    this.level = levelData;

    this.enabled = true;
    this.autoTrigger = true;
  }

  drawThumbnail(canvas = window) {
    let x = this.pos_x + 10, y = this.pos_y + 10;
    let s = (this.width - 2 * 10) / GRID_COL;
    // draw the grid
    canvas.strokeWeight(0.3);
    canvas.stroke(255, 180);
    canvas.fill(120, 80);
    for(let r = 0; r < GRID_ROW; r++) {
      for(let c = 0; c < GRID_COL; c++) {
        canvas.rect(x + c * s, y + r * s, s);
      }
    }
    // draw the players
    canvas.noStroke();
    for(let p of this.level.players) {
      canvas.fill(p.camp);
      canvas.circle(x + (p.x + 0.5) * s, y + (p.y + 0.5) * s, s / 2);
    }
  }

  render(canvas = window){
    let x = this.pos_x, y = this.pos_y, w = this.width, h = this.height;
    // check if the button is clicked
    if(this.autoTrigger && this.enabled && !this.Clicked && mouseIsPressed) this.ifClicked();
    if(this.Clicked && !mouseIsPressed) this.Clicked = false; // always reset the button clicked state

    canvas.push();
    this.drawThumbnail(canvas);
    if(this.ifMouseOn()) {
      canvas.textSize(18);
      if(!this.Clicked) {
        canvas.strokeWeight(1);
        canvas.stroke(220);
      }
      canvas.fill(180, 60);
      canvas.rect(x, y, w, h);
      canvas.fill(220);
      canvas.text(this.level.level_name, x + w/2, y + h/2);
    }
    canvas.pop();
  }
}

// calculate the angle between two pts
function direct(x1, y1, x2, y2){
  let vec0 = createVector(1, 0);
  let vec = createVector(x1 - x2, y1 - y2);
  return vec0.angleBetween(vec);
}