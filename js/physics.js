/* Logical units are pixels; positive Y points down. Rendering never changes physics.
 * 120 Hz fixed-step integration, accelerated movement, gravity and speed-dependent
 * shuttle drag. Flight solving and AI prediction use exactly the same integrator. */
(function (B) {
  'use strict';
  const C = B.C = Object.freeze({ width:1200, height:675, ground:548, left:90, right:1110,
    netX:600, netY:386, netHalf:5, playerSpeed:335, acceleration:2300,
    gravity:1700, jumpSpeed:640, shuttleGravity:490, drag:.14, quadraticDrag:.00042,
    arm:83, racketRadius:22, shuttleRadius:5, swingDuration:.30, swingCooldown:.34,
    chargeTime:.85, minPower:.25, step:1/120 });
  const clamp = B.clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const approach = (a,b,d) => a<b ? Math.min(b,a+d) : Math.max(b,a-d);
  B.makePlayer = id => ({ id, x:id===0?300:900, y:C.ground, vx:0, vy:0, face:id===0?1:-1,
    grounded:true, runPhase:0, swing:0, cooldown:0, swingAim:-.7, swingType:'normal',
    swingConnected:false, swingHand:'forehand', charging:false, chargeSeconds:0,
    swingPower:C.minPower, powerFlash:0, lastShot:'', shotLabelTime:0,
    celebrate:0, land:0, hitFlash:0, jumps:0, swings:0, hits:0 });
  B.powerFromHold = seconds => C.minPower+(1-C.minPower)*clamp(seconds/C.chargeTime,0,1);
  B.shoulder = p => ({ x:p.x, y:p.y-72 });
  B.swingAim = (p,b) => {
    // Lead the short windup; the angle is then locked for the entire swing.
    const t=.065, q={...b};
    if(b.live)for(let i=0;i<8;i++)B.integrateShuttle(q,C.step);
    const x=p.x+p.vx*t,y=Math.min(C.ground,p.y+p.vy*t+C.gravity*t*t/2);
    return Math.atan2(q.y-(y-72),(q.x-x)*p.face);
  };
  B.racket = (p, elapsed=p.swing) => {
    const t=p.swing>0 ? clamp(elapsed/C.swingDuration,0,1) : 0;
    const direction=p.swingHand==='backhand'?-1:1;
    const angle=p.swing>0 ? p.swingAim+direction*(-.92+1.85*Math.sin(Math.min(1,t/.82)*Math.PI/2))
      : -.83-(p.charging?.65*clamp(p.chargeSeconds/C.chargeTime,0,1):0);
    return { x:p.x+p.face*Math.cos(angle)*C.arm, y:p.y-72+Math.sin(angle)*C.arm, angle };
  };
  B.movePlayer = (p,input,dt,speed=C.playerSpeed) => {
    p.vx=approach(p.vx,(input.move||0)*speed,C.acceleration*dt);
    p.x+=p.vx*dt;
    const lo=p.id===0?45:C.netX+35, hi=p.id===0?C.netX-35:1155;
    if(p.x<lo || p.x>hi) {p.x=clamp(p.x,lo,hi);p.vx=0;}
    if(input.jump && p.grounded) {p.vy=-C.jumpSpeed;p.grounded=false;p.jumps++;}
    p.vy+=C.gravity*dt;p.y+=p.vy*dt;
    if(p.y>=C.ground){if(!p.grounded)p.land=.15;p.y=C.ground;p.vy=0;p.grounded=true;}
    p.runPhase+=Math.abs(p.vx)*dt*.032;
    p.cooldown=Math.max(0,p.cooldown-dt);p.land=Math.max(0,p.land-dt);
    p.hitFlash=Math.max(0,p.hitFlash-dt);p.celebrate=Math.max(0,p.celebrate-dt);
    p.powerFlash=Math.max(0,p.powerFlash-dt);p.shotLabelTime=Math.max(0,p.shotLabelTime-dt);
  };
  B.integrateShuttle = (b,dt) => {
    const decay=Math.exp(-(C.drag+C.quadraticDrag*Math.hypot(b.vx,b.vy))*dt);
    b.vx*=decay;b.vy=b.vy*decay+C.shuttleGravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  };
  B.predict = (b,height=C.ground,limit=4) => {
    const q={x:b.x,y:b.y,vx:b.vx,vy:b.vy};
    let t=0;
    while(t<limit){B.integrateShuttle(q,1/60);t+=1/60;if(q.y>=height && q.vy>0)break;}
    return {...q,time:t};
  };
  B.launchForTarget = (b,target,vy) => {
    const dir=target>b.x?1:-1;
    let lo=5,hi=1900;
    // Bisection accounts for drag rather than assuming a ballistic parabola.
    for(let n=0;n<14;n++) {
      const vx=(lo+hi)/2, end=B.predict({x:b.x,y:b.y,vx:vx*dir,vy});
      if((end.x-target)*dir>0)hi=vx;else lo=vx;
    }
    return {vx:dir*(lo+hi)/2,vy};
  };
})(globalThis.Badminton = globalThis.Badminton || {});
