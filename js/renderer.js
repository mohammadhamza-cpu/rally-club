/* Canvas-only original artwork. Pose calculations express running, takeoff,
 * landing, service, swing and celebration; no sprites or external assets. */
(function(B){
  'use strict';const C=B.C,colors=['#fc946c','#42c4e2'];
  B.Renderer=class{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.particles=[];this.rings=[];this.netShake=0;this.shake=0;this.clock=0;this.resize();window.addEventListener('resize',()=>this.resize());}
    resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(globalThis.devicePixelRatio||1,2);this.canvas.width=Math.round(Math.min(r.width,r.height*16/9)*d);this.canvas.height=Math.round(this.canvas.width*9/16);}
    line(points,color,width=2){const c=this.ctx;c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    circle(x,y,r,color){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
    ellipse(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
    text(text,x,y,size,color,align='center',weight=700){const c=this.ctx;c.fillStyle=color;c.font=`${weight} ${size}px system-ui,sans-serif`;c.textAlign=align;c.fillText(text,x,y);}
    event(e){
      if(e.type==='hit'){
        for(let i=0;i<(e.kind==='smash'?20:11);i++){const a=i*2.4;this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*(80+Math.random()*100),vy:Math.sin(a)*130,life:.45,max:.45,color:i%2?'#ffffd3':colors[e.player]});}
        this.rings.push({x:e.x,y:e.y,life:.27,max:.27});if(e.trick)this.rings.push({x:e.x,y:e.y,life:.4,max:.4});if(e.kind==='smash')this.shake=.08+.05*(e.power||0);
      }
      if(e.type==='net')this.netShake=.4;
      if(e.type==='over')for(let i=0;i<85;i++)this.particles.push({x:200+Math.random()*800,y:100+Math.random()*60,vx:(Math.random()-.5)*250,vy:-100-Math.random()*220,life:2.5,max:2.5,color:['#d6f574','#ff9975','#70dbdf','#fff8d0'][i%4],confetti:true});
    }
    background(){
      const c=this.ctx;
      const sky=c.createLinearGradient(0,0,0,560);sky.addColorStop(0,'#c2e9d8');sky.addColorStop(.65,'#e8efbe');sky.addColorStop(1,'#fae1a2');c.fillStyle=sky;c.fillRect(0,0,1200,675);
      this.circle(923,175,69,'#fff2b4');this.circle(923,175,91,'#fff4c22b');
      // Stylized clouds and layered foothills keep the shuttle readable.
      c.fillStyle='#fbf9df99';for(const[x,y,s]of [[165,145,1],[485,197,.7],[1070,103,.65]]){c.beginPath();c.ellipse(x,y,66*s,11*s,0,0,7);c.ellipse(x+36*s,y-9*s,27*s,19*s,0,0,7);c.fill();}
      c.fillStyle='#a5cdb8';c.beginPath();c.moveTo(0,387);c.bezierCurveTo(180,278,230,319,399,359);c.bezierCurveTo(580,225,639,255,784,357);c.bezierCurveTo(976,232,1048,246,1200,354);c.lineTo(1200,500);c.lineTo(0,500);c.fill();
      c.fillStyle='#7bb6a2';c.beginPath();c.moveTo(0,420);c.bezierCurveTo(188,365,228,434,443,390);c.bezierCurveTo(650,350,768,442,929,382);c.bezierCurveTo(1041,340,1100,391,1200,375);c.lineTo(1200,500);c.lineTo(0,500);c.fill();
      // Trees, fence and low spectator stands.
      for(const[x,y,s]of [[42,362,.85],[1182,320,1.1],[1140,377,.55],[80,415,.4]]){
        this.line([[x,y+18],[x,y+106*s]],'#448c7c',7*s);this.ellipse(x,y,33*s,53*s,'#4c9b84');this.ellipse(x+14*s,y+17*s,28*s,38*s,'#65ab8a');
      }
      c.fillStyle='#54927f';c.fillRect(0,467,1200,85);this.line([[0,449],[1200,449]],'#f1f1cb70',2);
      for(let x=20;x<1200;x+=53)this.line([[x,447],[x,490]],'#326d6e35',1);
      for(let row=0;row<2;row++){
        c.fillStyle=row?'#569c87':'#689f86';c.fillRect(186,442+row*15,252,8);c.fillRect(762,442+row*15,252,8);
        for(let i=0;i<17;i++){const x=195+i*14.4,y=437+row*15;this.circle(x,y,3.1,['#dcd9a9','#ccac8b','#358c86'][i%3]);this.line([[x,y+3],[x+1,y+8]],['#eadbac','#346c6a','#cad4b2'][i%3],5);this.circle(1200-x,y,3.1,'#bfd2ae');}
      }
      // Side-view collision floor coincides with the bright back service line.
      c.fillStyle='#368e7c';c.fillRect(0,512,1200,163);
      c.fillStyle='#246d68';c.beginPath();c.moveTo(90,548);c.lineTo(1110,548);c.lineTo(1190,634);c.lineTo(10,634);c.closePath();c.fill();
      c.fillStyle='#318c80';c.fillRect(91,549,508,27);c.fillStyle='#3a9686';c.fillRect(601,549,508,27);
      this.line([[90,548],[1110,548],[1190,634],[10,634],[90,548]],'#d1e8c2',3);
      this.line([[70,572],[1130,572]],'#d1e8c2a0',2);this.line([[30,612],[1170,612]],'#c6e1c0a0',2);
      for(const x of [330,495,705,870])this.line([[x,548],[600+(x-600)*1.16,634]],'#cce8c39c',2);
      this.line([[600,551],[600,634]],'#e4eecd88',2);
      this.text('R A L L Y   C L U B',600,657,10,'#d6ebc073');
      this.text('01',52,591,18,'#b1dcb570');this.text('02',1149,591,18,'#b1dcb570');
      for(const x of [90,1110]){this.line([[x,549],[x,518]],'#eaf0c0',3);this.circle(x,515,3,'#fff3be');}
    }
    player(p,g,menu=false){
      const c=this.ctx,face=p.face,color=colors[p.id],running=Math.abs(p.vx)>15&&p.grounded;
      const backhand=p.swing>0&&p.swingHand==='backhand';
      const bob=running?Math.sin(p.runPhase*2)*2:Math.sin(this.clock*2+p.id)*1.1;
      const celebration=p.celebrate>0;
      const cheer=celebration?Math.abs(Math.sin(this.clock*8))*12:0;
      const y=p.y-cheer+(p.grounded?bob:0)+p.land*18,hip={x:p.x-p.vx*.023,y:y-39};
      const shoulder={x:p.x,y:y-72};
      this.ellipse(p.x,C.ground+5,27-(C.ground-p.y)*.055,5,'#143b3d45');
      c.lineCap='round';c.lineJoin='round';
      // Feet follow opposite cyclic strides; raised knees read clearly in jumps.
      for(const side of [-1,1]){
        const stride=running?Math.sin(p.runPhase+(side===1?Math.PI:0))*21:side*13;
        let foot={x:p.x+stride,y:y-2};
        if(!p.grounded)foot={x:p.x+side*23,y:y-11-(side===face?12:0)};
        else if(running)foot.y-=Math.max(0,Math.cos(p.runPhase+(side===1?Math.PI:0)))*12;
        const knee={x:(hip.x+foot.x)/2+face*(p.grounded?5:17),y:(hip.y+foot.y)/2-2};
        this.line([[hip.x,hip.y],[knee.x,knee.y],[foot.x,foot.y]],'#183e46',7);
        this.line([[foot.x-5,foot.y],[foot.x+face*10,foot.y]],'#f2f2d2',6);
      }
      this.line([[hip.x,hip.y],[shoulder.x,shoulder.y]],color,13);
      this.line([[hip.x-3,hip.y],[hip.x+6,hip.y-2]],'#173f47',12);
      this.line([[shoulder.x,shoulder.y-2],[shoulder.x,shoulder.y-11]],'#183e46',6);
      const headX=shoulder.x+face*1.5,headY=shoulder.y-27;
      this.circle(headX,headY,16,'#163e46');this.circle(headX+face*3,headY+1,12,'#f4e7c9');
      this.line([[headX-14,headY-6],[headX+14,headY-6]],color,5);
      this.line([[headX-face*13,headY-7],[headX-face*25,headY-9+Math.sin(this.clock*8)*2]],color,3);
      this.circle(headX+face*8,headY,1.6,'#193d43');
      if(celebration){c.beginPath();c.arc(headX+face*4,headY+4,4,.15,Math.PI-.15);c.strokeStyle='#193d43';c.lineWidth=1.5;c.stroke();}
      // Off arm counterbalances gait or holds the shuttle in service stance.
      const serving=g.phase==='serve'&&g.server===p.id;
      const off=celebration?{x:p.x-face*32,y:y-115}:serving?{x:p.x+face*55,y:y-103}:{x:p.x-face*(running?22:19),y:y-44+(running?Math.cos(p.runPhase)*13:0)};
      this.line([[shoulder.x,shoulder.y],[p.x-face*22,(shoulder.y+off.y)/2],[off.x,off.y]],'#183e46',6);
      // Racket centre comes directly from the physics pose, not a separate animation.
      const racket=B.racket(p),r={x:racket.x,y:racket.y-cheer};
      if(celebration){r.x=p.x+face*32;r.y=y-146;}
      const dx=r.x-shoulder.x,dy=r.y-shoulder.y,len=Math.hypot(dx,dy)||1;
      const hand={x:shoulder.x+dx*.56,y:shoulder.y+dy*.56};
      const elbow={x:(shoulder.x+hand.x)/2+face*(backhand?20:-8),y:(shoulder.y+hand.y)/2+(backhand?4:14)};
      if(p.swing>0){
        c.save();c.globalAlpha=.22;c.strokeStyle=p.swingType==='smash'?'#ffbe70':'#faffd9';c.lineWidth=17;c.beginPath();
        const angle=Math.atan2(r.y-(p.y-72),r.x-p.x),direction=face*(backhand?-1:1);c.arc(p.x,p.y-72,C.arm,angle-direction*.55,angle,direction<0);c.stroke();c.restore();
      }
      this.line([[shoulder.x,shoulder.y],[elbow.x,elbow.y],[hand.x,hand.y]],'#173d45',6);
      this.line([[hand.x,hand.y],[r.x-dx/len*18,r.y-dy/len*18]],'#e7eee0',4);
      this.line([[hand.x,hand.y],[hand.x+dx/len*10,hand.y+dy/len*10]],'#1a444b',6);
      this.circle(r.x,r.y,23,'#204954');this.circle(r.x,r.y,19,'#d8f1d253');
      c.save();c.beginPath();c.arc(r.x,r.y,18,0,7);c.clip();
      for(let a=-16;a<20;a+=7){this.line([[r.x+a,r.y-22],[r.x+a,r.y+22]],'#faffdaa0',1);this.line([[r.x-22,r.y+a],[r.x+22,r.y+a]],'#faffdaa0',1);}c.restore();
      c.beginPath();c.arc(r.x,r.y,21,0,7);c.strokeStyle=p.hitFlash>0?'#fffcca':color;c.lineWidth=3;c.stroke();
      if(p.charging){c.beginPath();c.arc(r.x,r.y,28,-Math.PI/2,-Math.PI/2+Math.PI*2*B.powerFromHold(p.chargeSeconds));c.strokeStyle=p.chargeSeconds>=C.chargeTime?'#ffffb0':color;c.lineWidth=3;c.stroke();}
      if(!menu){this.circle(p.x,C.ground+19,8,color);this.text(String(p.id+1),p.x,C.ground+22,9,'#173d43');}
    }
    net(){
      const c=this.ctx,w=Math.sin(this.clock*70)*this.netShake*8;
      c.save();c.fillStyle='#1e514f44';c.fillRect(594,C.netY,12,C.ground-C.netY);
      for(let y=C.netY;y<C.ground;y+=9)this.line([[594+w,y],[606+w,y]],'#e8f3d4b0',1);
      for(let x=594;x<=606;x+=4)this.line([[x+w,C.netY],[x+w,C.ground]],'#daf4d487',1);
      this.line([[592,C.ground],[592,C.netY-3]],'#184b4d',5);this.line([[608,C.ground+10],[608,C.netY+8]],'#184b4d',5);
      this.line([[591,C.netY-3],[609,C.netY+8]],'#ffffdd',6);this.line([[592,C.netY],[608,C.netY+11]],'#d4f279',2);
      this.ellipse(600,C.ground+10,17,4,'#174f4d66');c.restore();
    }
    shuttle(b){
      const c=this.ctx;
      if(b.trail.length>1){c.save();for(let i=1;i<b.trail.length;i++){c.globalAlpha=i/b.trail.length*(b.kind==='smash'?.65:.3);this.line([[b.trail[i-1].x,b.trail[i-1].y],[b.trail[i].x,b.trail[i].y]],b.kind==='smash'?'#ffedb3':'#ffffff',b.kind==='smash'?5:3);}c.restore();}
      if(b.y<15){this.text('▼',B.clamp(b.x,20,1180),24,15,'#254e50');return;}
      this.ellipse(B.clamp(b.x,0,1200),C.ground+4,7,2,'#173f4330');
      c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));
      c.shadowColor='#21505066';c.shadowBlur=4;
      c.beginPath();c.moveTo(3,0);c.lineTo(-17,-9);c.quadraticCurveTo(-22,0,-17,9);c.closePath();c.fillStyle='#fffde1';c.fill();c.strokeStyle='#376363';c.lineWidth=1.1;c.stroke();
      for(const y of [-5,0,5])this.line([[-15,y],[1,0]],'#94a99e',.8);
      this.circle(2,0,4.5,'#f7c86c');c.restore();
    }
    draw(g,dt,menu=false){
      const c=this.ctx;this.clock+=dt;
      const scale=this.canvas.width/1200;c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,1200,675);
      c.save();if(this.shake>0)c.translate(Math.sin(this.clock*135)*this.shake*16,Math.cos(this.clock*100)*this.shake*10);
      this.background();
      let players=g.players,b=g.shuttle;
      if(menu){players=[{...g.players[0],x:375},{...g.players[1],x:899,y:490,grounded:false,swing:.09,swingAim:-1.7}];b={...g.shuttle,x:856+Math.sin(this.clock*1.2)*30,y:280+Math.cos(this.clock*1.2)*24,vx:-190,vy:30,trail:[]};}
      players.forEach(p=>this.player(p,g,menu));this.net();this.shuttle(b);
      if(g.phase==='serve'&&!menu){const p=g.players[g.server];this.line([[p.x-35,565],[p.x+35,565]],'#d9f57d',4);}
      if(g.phase==='point'&&!menu){c.save();c.globalAlpha=B.clamp(g.timer,0,1);c.strokeStyle='#faf6b4';c.lineWidth=2;c.beginPath();c.ellipse(g.pointX,C.ground+3,15+(1.85-g.timer)*14,4,0,0,7);c.stroke();c.restore();}
      for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*260;c.save();c.globalAlpha=Math.max(0,p.life/p.max);if(p.confetti){c.translate(p.x,p.y);c.rotate(p.life*4);c.fillStyle=p.color;c.fillRect(-3,-2,6,4);}else this.circle(p.x,p.y,2.5,p.color);c.restore();}
      this.particles=this.particles.filter(p=>p.life>0);
      for(const r of this.rings){r.life-=dt;c.save();c.globalAlpha=B.clamp(r.life/r.max,0,1);c.beginPath();c.arc(r.x,r.y,10+Math.max(0,r.max-r.life)*120,0,7);c.strokeStyle='#ffffcf';c.lineWidth=2;c.stroke();c.restore();}
      this.rings=this.rings.filter(r=>r.life>0);this.shake=Math.max(0,this.shake-dt);this.netShake=Math.max(0,this.netShake-dt);c.restore();
    }
  };
})(globalThis.Badminton);
