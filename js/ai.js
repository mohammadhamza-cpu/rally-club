/* AI has no teleporting and no remote hits. It uses the same movement, jump,
 * swing, contact and scoring paths as humans. Difficulty changes reaction,
 * footwork, landing error and shot selection, not collision reach. */
(function(B){
  'use strict';const C=B.C;
  const LEVELS=B.AI_LEVELS={easy:{reaction:.27,speed:235,error:57,jump:false,mistime:.27},medium:{reaction:.13,speed:310,error:22,jump:true,mistime:.12},hard:{reaction:.055,speed:350,error:5,jump:true,mistime:.035}};
  B.AI=class{
    constructor(level='medium',random=Math.random){this.config=LEVELS[level]||LEVELS.medium;this.level=level;this.random=random;this.clock=0;this.target=900;this.error=0;this.lastHit=-1;this.shot='normal';this.planJump=false;}
    decide(g,id,dt){
      const p=g.players[id],b=g.shuttle,c=this.config,face=p.face;
      const input={move:0,jump:false,swingHeld:false,swingReleased:false,up:false,down:false};
      if(g.phase==='serve') {if(g.server===id){input.swingHeld=g.serveTime>.2&&g.serveTime<=.9;input.swingReleased=g.serveTime>.9;}this.lastHit=-1;return input;}
      if(g.phase!=='rally')return input;
      this.clock-=dt;if(this.delayStarted)this.swingDelay=Math.max(0,this.swingDelay-dt);
      const incoming=b.lastHitter!==id,own=x=>id===0?x<588:x>612;
      if(this.lastHit!==g.rallyHits){
        this.lastHit=g.rallyHits;this.error=(this.random()*2-1)*c.error;
        this.shot=this.random()<.24?'net':this.random()<.4?'clear':'normal';
        this.planJump=c.jump&&this.random()<(this.level==='hard'?.72:.36);
        // Human-like occasional late reactions. Never enlarge the collision head.
        this.swingDelay=this.random()<c.mistime?.32+this.random()*.16:0;this.delayStarted=false;
      }
      if(this.clock<=0){
        this.clock=c.reaction;
        if(incoming){
          const land=B.predict(b,C.ground);let intercept=B.predict(b,423);
          if(this.planJump){
            const high=B.predict(b,320);
            if(own(high.x)&&high.time>.14&&Math.abs(high.x-face*58-p.x)<c.speed*high.time)intercept=high;
            else if(p.grounded)this.planJump=false;
          }
          this.target=(own(intercept.x)?intercept.x:land.x)-face*58+this.error;
        } else this.target=id===0?330:870;
        this.target=B.clamp(this.target,id===0?70:648,id===0?552:1130);
      }
      if(Math.abs(this.target-p.x)>9)input.move=Math.sign(this.target-p.x);
      // Charge through the normal player state; the AI bar is not decorative.
      const prep=this.shot==='net'?.16:this.shot==='clear'?.52:.72;
      if(incoming&&p.cooldown<=0&&p.swing===0){const landing=B.predict(b,423);input.swingHeld=p.charging||landing.time<prep;}
      if(incoming && own(b.x)){
        if(this.planJump && p.grounded && b.vy> -90 && b.y>245 && b.y<323 && Math.abs(b.x-p.x)<112)input.jump=true;
        // A short forward simulation tests whether a real head sweep will connect.
        // It is only a decision: the live engine still has to make that contact.
        if(p.cooldown<=0 && p.swing===0 && Math.hypot(b.x-p.x,b.y-(p.y-72))<160){
          const q={...b},ghost={...p};
          B.movePlayer(ghost,input,C.step,c.speed);ghost.swingHand=(q.x-ghost.x)*face< -8?'backhand':'forehand';ghost.swingAim=B.swingAim(ghost,q);ghost.swing=.001;ghost.swingConnected=false;
          for(let k=0;k<20;k++){
            const oldB={x:q.x,y:q.y},oldR=B.racket(ghost);
            if(k>0)B.movePlayer(ghost,{move:input.move},C.step,c.speed);
            ghost.swing+=C.step;B.integrateShuttle(q,C.step);
            if(B.racketCollision(ghost,q,oldB,oldR)){input.swingReleased=true;break;}
          }
          input.up=this.shot==='clear';input.down=this.shot==='net';
          if((!p.grounded||input.jump)&&b.y<365){input.up=false;input.down=false;}
          if(input.swingReleased&&this.swingDelay>0){this.delayStarted=true;input.swingReleased=false;}
        }
      }
      if(input.swingReleased)input.swingHeld=false;
      return input;
    }
  };
})(globalThis.Badminton);
