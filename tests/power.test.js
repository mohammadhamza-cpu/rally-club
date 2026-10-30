/* Charge/release and automatic strokes: explicit contact fixtures, no rendering
 * shortcuts or enlarged collision volumes. Appends to the existing engine suite. */
(function(){
  'use strict';const B=Badminton,C=B.C,results=globalThis.BadmintonTestResults;
  const ok=(v,m='assertion failed')=>{if(!v)throw Error(m);};
  const near=(a,b,t=.001)=>ok(Math.abs(a-b)<t,`${a} != ${b}`);
  const test=(name,fn)=>{try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}};
  const fresh=()=>new B.Game({mode:'local',random:()=>.5});
  const frames=(g,n,input)=>{for(let i=0;i<n;i++)g.step(C.step,input);};
  test('holding swing charges without starting a swing or serving',()=>{const g=fresh();frames(g,60,[{swingHeld:true},{}]);ok(g.players[0].charging&&g.players[0].chargeSeconds>.49);ok(g.totalHits===0&&g.players[0].swings===0&&g.phase==='serve');});
  test('power increases monotonically and caps at 100 percent',()=>{near(B.powerFromHold(0),.25);ok(B.powerFromHold(.2)<B.powerFromHold(.6));near(B.powerFromHold(.85),1);near(B.powerFromHold(30),1);near(B.powerFromHold(-1),.25);});
  test('full power does not auto-swing after an extended hold',()=>{const g=fresh();frames(g,600,[{swingHeld:true},{}]);near(g.players[0].chargeSeconds,C.chargeTime);ok(g.phase==='serve'&&g.players[0].swings===0);});
  test('release consumes charge exactly once',()=>{const g=fresh();frames(g,102,[{swingHeld:true},{}]);g.step(C.step,[{swingReleased:true},{}]);frames(g,50);ok(g.players[0].swings===1&&g.players[0].hits===1);near(g.players[0].swingPower,1);ok(!g.players[0].charging&&g.players[0].chargeSeconds===0);});
  test('between-frame tap uses captured press duration',()=>{const g=fresh();g.step(C.step,[{swingReleased:true,holdSeconds:.037},{}]);near(g.players[0].swingPower,B.powerFromHold(.037));ok(g.players[0].swings===1);});
  test('simultaneous players charge independently',()=>{const g=fresh();g.phase='rally';Object.assign(g.shuttle,{x:600,y:-1500,live:true,lastHitter:0});frames(g,30,[{swingHeld:true},{}]);frames(g,30,[{swingHeld:true},{swingHeld:true}]);ok(g.players[0].chargeSeconds>g.players[1].chargeSeconds+.24);g.step(C.step,[{swingHeld:true},{swingReleased:true}]);ok(g.players[0].charging&&g.players[0].swings===0&&g.players[1].swings===1);});
  test('cleared hold is not mistaken for a release',()=>{const g=fresh();frames(g,30,[{swingHeld:true},{}]);g.step(C.step);ok(!g.players[0].charging&&g.players[0].swings===0&&g.totalHits===0);});
  test('cancel signal discards charge without swinging',()=>{const g=fresh();frames(g,40,[{swingHeld:true},{}]);g.step(C.step,[{cancelCharge:true},{}]);ok(!g.players[0].charging&&g.players[0].chargeSeconds===0&&g.players[0].swings===0);});
  test('pause cancels pending charge and resumes uncharged',()=>{const g=fresh();frames(g,40,[{swingHeld:true},{}]);g.togglePause();ok(!g.players[0].charging&&g.players[0].chargeSeconds===0);g.togglePause();frames(g,20);ok(g.players[0].swings===0);});
  test('new point discards both charges',()=>{const g=fresh();g.phase='rally';Object.assign(g.shuttle,{x:600,y:-1500,live:true,lastHitter:0});frames(g,40,[{swingHeld:true},{swingHeld:true}]);B.awardPoint(g,0,'TEST',800);ok(g.players.every(p=>!p.charging&&p.chargeSeconds===0));frames(g,230);ok(g.phase==='serve'&&g.totalHits===0);});
  test('restart clears power flash and prior shot labels',()=>{const g=fresh();frames(g,60,[{swingHeld:true},{}]);g.step(C.step,[{swingReleased:true},{}]);frames(g,20);g.reset();ok(g.players.every(p=>p.powerFlash===0&&p.lastShot===''&&!p.charging));});
  test('non-server cannot build charge',()=>{const g=fresh();frames(g,70,[{},{swingHeld:true}]);ok(!g.players[1].charging&&g.players[1].chargeSeconds===0);});
  const serve=hold=>{const g=fresh();frames(g,hold,[{swingHeld:true},{}]);g.step(C.step,[{swingReleased:true},{}]);for(let i=0;i<40&&!g.totalHits;i++)g.step(C.step);ok(g.totalHits===1);return {...g.shuttle};};
  test('charged serve has more speed and depth than a tap',()=>{const low=serve(0),high=serve(102);ok(Math.abs(high.vx)>Math.abs(low.vx));ok(B.predict(high).x>B.predict(low).x+100);ok(low.style==='UNDERHAND SERVE'&&high.style==='FLICK SERVE');});
  test('all four shot families respond to power in their launch',()=>{const p=B.makePlayer(0),b={x:350,y:310};for(const kind of ['normal','clear','net','smash']){const low=B.shotLaunch(p,b,{kind,name:'',power:.25}),high=B.shotLaunch(p,b,{kind,name:'',power:1});ok(Math.abs(high.vx)>Math.abs(low.vx),kind);ok(Math.abs(high.target-600)>Math.abs(low.target-600),kind);}});
  test('AI charges through normal input rather than injecting strength',()=>{const g=new B.Game({mode:'ai',random:()=>.5});g.server=1;g.prepareServe();frames(g,70);ok(g.players[1].charging&&g.players[1].chargeSeconds>.3&&g.totalHits===0);frames(g,75);ok(g.totalHits===1&&g.players[1].swingPower>.7);});
  const strike=(id,{x=300,feet=548,dx=55,dy=-140,hold=0,move=0}={})=>{
    const g=fresh(),p=g.players[id],face=p.face;g.phase='rally';
    Object.assign(p,{x:id===0?x:1200-x,y:feet,grounded:feet===548,vx:move*C.playerSpeed*face});
    Object.assign(g.shuttle,{x:p.x+dx*face,y:feet+dy,vx:(dx<0?40:-40)*face,vy:0,lastHitter:1-id,live:true});
    const input={swingReleased:true,holdSeconds:hold,move:move*face};g.step(C.step,id===0?[input,{}]:[{},input]);
    for(let i=0;i<30&&!g.totalHits;i++)g.step(C.step,id===0?[{move:move*face},{}]:[{},{move:move*face}]);
    return {g,p};
  };
  const fixtures=[
    ['BACKHAND DRIVE',{dx:-90,dy:-140}],['FOREHAND DRIVE',{}],
    ['REVERSE FLICK',{dx:-90,dy:-140,hold:.55}],
    ['FLICK LIFT',{dx:-90,dy:-35,hold:.25}],
    ['NET BRUSH',{x:485}],['REVERSE SLICE',{x:485,dx:-70}],['SLICE DRIVE',{hold:.7,move:1}],
    ['THUNDER SMASH',{feet:437,dx:-90,dy:-110,hold:.85}]
  ];
  for(const id of [0,1])for(const [name,fixture]of fixtures)test(`P${id+1}: ${name} follows real swept contact without special keys`,()=>{const {g,p}=strike(id,fixture);ok(p.hits===1,'no real contact');ok(p.lastShot===name,`got ${p.lastShot}`);ok(g.shuttle.vx*p.face>0);ok(p.shotLabelTime>0);});
  test('backhand swing uses a distinct reversed racket sweep',()=>{const p=B.makePlayer(0);p.swing=.06;p.swingAim=-2;const fore=B.racket(p);p.swingHand='backhand';const back=B.racket(p);ok(Math.hypot(fore.x-back.x,fore.y-back.y)>30);});
  test('trick classification depends on timing, not only power',()=>{const p=B.makePlayer(0);Object.assign(p,{swingType:'normal',swingHand:'backhand',swingPower:.85,swing:.085});const b={x:225,y:420};ok(B.shotStyle(p,b).name==='REVERSE FLICK');p.swing=.23;ok(B.shotStyle(p,b).name==='BACKHAND DRIVE');});
  test('running charged forehand selects a Slice Drive with different trajectory',()=>{const p=B.makePlayer(0);Object.assign(p,{vx:250,swingType:'normal',swingPower:.85,swing:.085});const b={x:370,y:420};const shot=B.shotStyle(p,b);ok(shot.name==='SLICE DRIVE'&&shot.trick);const slice=B.shotLaunch(p,b,shot),plain=B.shotLaunch(p,b,{...shot,name:'FOREHAND DRIVE'});ok(Math.abs(slice.target-plain.target)>60);});
  test('a fully charged out-of-range release never creates a style or contact',()=>{const {g,p}=strike(0,{dx:-240,hold:.85});ok(p.swings===1&&g.totalHits===0&&p.lastShot==='');});
  test('charging still allows normal running and jumping',()=>{const g=fresh();g.phase='rally';Object.assign(g.shuttle,{x:600,y:-1500,live:true,lastHitter:1});g.step(C.step,[{move:1,jump:true,swingHeld:true},{}]);frames(g,20,[{move:1,swingHeld:true},{}]);ok(g.players[0].x>320&&!g.players[0].grounded&&g.players[0].charging&&g.players[0].swings===0);});
  document.getElementById('results').textContent=JSON.stringify(results,null,2);
})();
