/* No trick-shot buttons. Release power + actual contact timing/position choose
 * the stroke. Classify ONLY after swept racket contact, never on a near miss.
 * Styles change launch trajectories as well as names/poses; no midair homing. */
(function(B){
  'use strict';const C=B.C;
  B.shotStyle=(p,b,serve=false)=>{
    const power=p.swingPower,hand=p.swingHand==='backhand'?'BACKHAND':'FOREHAND';
    const timing=B.clamp(1-Math.abs(p.swing-.085)/.105,0,1);
    if(serve)return {name:power>.72?'FLICK SERVE':'UNDERHAND SERVE',kind:'serve',trick:false,timing,power};
    let kind=p.swingType,name='',trick=false;
    if(kind==='smash'&&b.y>365)kind='normal';
    // Existing clear/net modifiers remain shortcuts, but tricks require none.
    if(kind==='normal'){
      if(!p.grounded&&b.y<365&&power>=.68)kind='smash';
      else if(Math.abs(b.x-C.netX)<185&&power<.52){kind='net';if(timing>=.55){name=hand==='BACKHAND'?'REVERSE SLICE':'NET BRUSH';trick=true;}}
      else if(b.y>p.y-50&&power>=.4&&timing>=.45){kind='clear';name='FLICK LIFT';trick=true;}
      else if(power>=.72&&timing>=.6&&(p.swingHand==='backhand'||Math.abs(p.vx)>130)){name=p.swingHand==='backhand'?'REVERSE FLICK':'SLICE DRIVE';trick=true;}
      else if(b.y<p.y-125&&power>.5&&power<.72)kind='clear';
    }
    if(kind==='smash'&&power>=.95&&timing>=.65){name='THUNDER SMASH';trick=true;}
    if(!name)name=kind==='smash'?(hand==='BACKHAND'?'BACKHAND SMASH':'JUMP SMASH'):`${hand} ${kind==='clear'?'CLEAR':kind==='net'?'DROP':'DRIVE'}`;
    return {name,kind,trick,timing,power};
  };
  B.shotLaunch=(p,b,shot)=>{
    const face=p.face,kind=shot.kind,power=shot.power;
    // A quick tap remains a useful return; additional charge adds genuine pace,
    // depth and (for clears) height. Full power is not best for every situation.
    const strength=(power-C.minPower)/(1-C.minPower);
    let target,vy;
    if(kind==='serve'){target=C.netX+face*(250+145*strength);vy=-455-85*strength;}
    else if(kind==='clear'){target=C.netX+face*(350+125*strength);vy=-565-115*strength;}
    else if(kind==='net'){target=C.netX+face*(88+115*strength);vy=-275-35*strength;}
    else if(kind==='smash'){target=C.netX+face*(400+85*strength);vy=30-70*strength;}
    else{target=C.netX+face*(280+195*strength);vy=-385+55*strength;}
    if(shot.name==='NET BRUSH'||shot.name==='REVERSE SLICE'){target=C.netX+face*(68+65*strength);vy=-265;}
    if(shot.name==='FLICK LIFT'){target=C.netX+face*(315+130*strength);vy=-525-65*strength;}
    if(shot.name==='SLICE DRIVE'){target=C.netX+face*(245+100*strength);vy=-285;}
    if(shot.name==='REVERSE FLICK'){target=C.netX+face*(330+125*strength);vy=-430;}
    if(shot.name==='THUNDER SMASH'){target=C.netX+face*490;vy=-55;}
    // Far, low contact needs lift; close-net poor timing can still hit the tape.
    if(kind!=='smash'&&b.y>350&&Math.abs(b.x-C.netX)>130)vy=Math.min(vy,-400);
    return {...B.launchForTarget(b,target,vy),target};
  };
})(globalThis.Badminton);
