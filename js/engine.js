/* DOM-free match orchestration. External input only expresses intent; the engine
 * owns contact, trajectories, service, scoring and the full match lifecycle. */
(function(B){
  'use strict';const C=B.C,empty=()=>({move:0,jump:false,swingHeld:false,swingReleased:false,up:false,down:false});
  B.Game=class{
    constructor(options={}){this.random=options.random||Math.random;this.onEvent=options.onEvent||(()=>{});this.mode=options.mode||'ai';this.difficulty=options.difficulty||'medium';this.reset();}
    emit(type,data={}){this.onEvent({type,...data});}
    reset(){this.players=[B.makePlayer(0),B.makePlayer(1)];this.scores=[0,0];this.server=0;this.paused=false;this.winner=null;this.rallyHits=0;this.totalHits=0;this.bestRally=0;this.time=0;this.timer=0;this.ai=new B.AI(this.difficulty,this.random);this.pointWinner=null;this.prepareServe();}
    prepareServe(){
      this.phase='serve';this.serveTime=0;this.rallyHits=0;this.rallyTime=0;
      this.players.forEach((p,i)=>{Object.assign(p,{x:i===0?300:900,y:C.ground,vx:0,vy:0,swing:0,cooldown:0,grounded:true,celebrate:0,charging:false,chargeSeconds:0,powerFlash:0,shotLabelTime:0,lastShot:''});});
      this.shuttle={x:0,y:0,vx:0,vy:0,lastHitter:null,live:false,netCooldown:0,kind:'serve',trail:[]};this.attachServe();
      this.emit('serve',{server:this.server});
    }
    attachServe(){const p=this.players[this.server];this.shuttle.x=p.x+p.face*65;this.shuttle.y=p.y-111;}
    cancelCharges(){for(const p of this.players){p.charging=false;p.chargeSeconds=0;}}
    togglePause(){if(this.phase==='over')return;this.paused=!this.paused;this.cancelCharges();this.emit(this.paused?'pause':'resume');}
    chargeSwing(p,input,dt){
      if(input.cancelCharge){p.charging=false;p.chargeSeconds=0;return false;}
      if(this.phase==='serve'&&p.id!==this.server)return false;
      if(p.cooldown>0||p.swing>0){p.charging=false;p.chargeSeconds=0;return false;}
      if(input.swingHeld){p.charging=true;p.chargeSeconds=Math.min(C.chargeTime,p.chargeSeconds+dt);}
      if(input.swingReleased){
        const seconds=Number.isFinite(input.holdSeconds)?Math.max(0,input.holdSeconds):p.chargeSeconds;
        p.swingPower=B.powerFromHold(seconds);p.powerFlash=1.15;
        p.charging=false;p.chargeSeconds=0;return this.startSwing(p,input);
      }
      // Cleared input (pause/focus/cancel/point) never counts as a release shot.
      if(!input.swingHeld){p.charging=false;p.chargeSeconds=0;}
      return false;
    }
    startSwing(p,input){
      if(p.cooldown>0 || p.swing>0)return false;
      if(this.phase==='serve' && p.id!==this.server)return false;
      const b=this.shuttle;
      p.swingHand=(b.x-p.x)*p.face< -8?'backhand':'forehand';
      p.swingAim=B.swingAim(p,b);
      p.swing=.001;p.cooldown=C.swingCooldown;p.swingConnected=false;p.swings++;
      p.swingType=input.down?'net':input.up?'clear':(!p.grounded && b.y<365?'smash':'normal');
      this.emit('swing',{player:p.id,power:p.swingPower,hand:p.swingHand});return true;
    }
    hit(p){
      const b=this.shuttle,serve=this.phase==='serve';
      if(serve && p.id!==this.server)return;
      const shot=B.shotStyle(p,b,serve),launch=B.shotLaunch(p,b,shot);
      b.vx=launch.vx;b.vy=launch.vy;
      b.lastHitter=p.id;b.live=true;b.kind=shot.kind;b.style=shot.name;b.power=shot.power;b.netCooldown=0;b.trail=[];
      p.lastShot=shot.name;p.shotLabelTime=1.6;p.lastTiming=shot.timing;
      p.swingConnected=true;p.hitFlash=.18;p.hits++;this.totalHits++;this.rallyHits++;
      this.phase='rally';this.rallyTime=0;this.emit('hit',{player:p.id,...shot,x:b.x,y:b.y});
    }
    step(dt,inputs=[empty(),empty()]){
      if(this.paused)return;
      this.time+=dt;
      if(this.phase==='point' || this.phase==='over'){
        for(const p of this.players){p.celebrate=Math.max(0,p.celebrate-dt);p.powerFlash=Math.max(0,p.powerFlash-dt);p.shotLabelTime=Math.max(0,p.shotLabelTime-dt);if(p.swing>0){p.swing+=dt;if(p.swing>C.swingDuration)p.swing=0;}}
        if(this.phase==='point'){this.timer-=dt;if(this.timer<=0)this.prepareServe();}return;
      }
      this.serveTime+=dt;
      const commands=[{...empty(),...inputs[0]},{...empty(),...inputs[1]}];
      if(this.mode==='ai')commands[1]=this.ai.decide(this,1,dt);
      const previousR=this.players.map(p=>B.racket(p));
      this.players.forEach((p,i)=>{
        const command=commands[i];
        // The server must serve from the marked service area, not beside the net.
        const movement=this.phase==='serve'?empty():command;
        B.movePlayer(p,movement,dt,this.mode==='ai' && i===1?this.ai.config.speed:C.playerSpeed);
        if(this.chargeSwing(p,command,dt))previousR[i]=B.racket(p);
        if(p.swing>0){p.swing+=dt;if(p.swing>C.swingDuration)p.swing=0;}
      });
      const b=this.shuttle,old={x:b.x,y:b.y};
      if(this.phase==='serve')this.attachServe();
      else{this.rallyTime+=dt;b.netCooldown=Math.max(0,b.netCooldown-dt);B.integrateShuttle(b,dt);}
      for(let i=0;i<2;i++){
        const p=this.players[i];
        if(B.racketCollision(p,b,old,previousR[i])){this.hit(p);break;}
      }
      if(this.phase!=='rally')return;
      if(B.netCollision(b,old))this.emit('net',{x:C.netX,y:b.y});
      const landing=B.landingDecision(b,old);
      if(landing){B.awardPoint(this,landing.winner,landing.reason,landing.x);return;}
      b.trail.push({x:b.x,y:b.y});if(b.trail.length>16)b.trail.shift();
      // Every legal arc should land in under four seconds; rescue invalid numeric
      // states defensively rather than leaving an unfinishable rally.
      if(!Number.isFinite(b.x+b.y+b.vx+b.vy)||this.rallyTime>12)B.awardPoint(this,1-b.lastHitter,'FAULT',C.netX);
    }
  };
})(globalThis.Badminton);
