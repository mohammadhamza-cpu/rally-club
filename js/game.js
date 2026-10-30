/* UI and the sole animation loop. Fixed 1/120 s simulation, capped catch-up on
 * long stalls; pause/focus changes clear held keys and reset accumulated time. */
(function(B){
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('court'),overlay=$('overlay'),hud=$('hud');
  const sound=new B.Sound(),renderer=new B.Renderer(canvas);
  let mode='ai',difficulty='medium',screen='menu',helpReturn='menu',game=new B.Game(),last=0,accumulator=0,hudKey='',toastTime=0;
  const diagnostics={frames:0,steps:0,maxFrame:0};
  const controls=new B.Controls(canvas,()=>pause(),()=>sound.unlock(),()=>game.cancelCharges());
  const label=id=>id===0?'PLAYER 1':mode==='ai'?`${difficulty.toUpperCase()} AI`:'PLAYER 2';
  function button(selector,fn){overlay.querySelector(selector)?.addEventListener('click',fn);}
  function showToast(text,duration=1.2){$('toast').textContent=text;$('toast').classList.add('visible');toastTime=duration;}
  function soundUI(){$('sound').textContent=sound.enabled?'♪ SOUND ON':'♪ SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound.enabled));}
  function guide(){
    document.querySelector('.control-strip').innerHTML=mode==='local'
      ?'<div><span class="control-label">P1</span><kbd>A</kbd><kbd>D</kbd><kbd>W</kbd><kbd>SPACE</kbd></div><div><span class="control-label">P2</span><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>ENTER</kbd></div><div><span class="control-label">PAUSE</span><kbd>P</kbd><kbd>ESC</kbd></div>'
      :'<div><span class="control-label">MOVE</span><kbd>A</kbd><kbd>D</kbd><span class="or">/</span><kbd>←</kbd><kbd>→</kbd></div><div><span class="control-label">JUMP</span><kbd>W</kbd><span class="or">/</span><kbd>↑</kbd></div><div><span class="control-label">SWING</span><kbd>SPACE</kbd><span class="or">/</span><kbd>ENTER</kbd></div><div><span class="control-label">PAUSE</span><kbd>P</kbd><kbd>ESC</kbd></div>';
    $('shot-guide').textContent=screen==='menu'?'Hold to charge. Release to hit. Find your trick shot.':'HOLD SPACE / ENTER → charge · RELEASE → swing · styles follow timing + position';
    $('touch-controls').style.visibility=mode==='local'?'hidden':'visible';
  }
  function menu(){
    canvas.parentElement.classList.remove('playing');renderer.resize();
    screen='menu';game.paused=true;controls.clear();sound.stop();renderer.particles=[];overlay.hidden=false;overlay.className='overlay';hud.hidden=true;$('pause').hidden=true;$('toast').classList.remove('visible');
    overlay.innerHTML=`<div class="menu"><p class="eyebrow">YOUR NEW COURT ADDICTION</p><h1>SMALL STICKS.<br><em>BIG RALLIES.</em></h1><p class="intro">A little footwork. A perfectly timed smash.<br>Take the court and make every shot count.</p><div class="segment" aria-label="Game mode"><button id="mode-ai" class="${mode==='ai'?'active':''}" aria-pressed="${mode==='ai'}">↗ PLAYER vs AI</button><button id="mode-local" class="${mode==='local'?'active':''}" aria-pressed="${mode==='local'}">↔ TWO PLAYERS</button></div><div class="option-row"><span>${mode==='ai'?'CHALLENGER':'SAME KEYBOARD'}</span><div class="difficulty">${mode==='ai'?['easy','medium','hard'].map(d=>`<button data-level="${d}" aria-pressed="${d===difficulty}" class="${d===difficulty?'active':''}">${d[0].toUpperCase()+d.slice(1)}</button>`).join(''):'<span style="font-size:11px;color:#d6f574">YOU vs YOUR FRIEND</span>'}</div></div><button id="start" class="primary">LET’S RALLY <span>↗</span></button><p class="menu-foot">FIRST TO 11 · WIN BY TWO · CAP AT 15</p></div>`;
    button('#mode-ai',()=>{mode='ai';menu();});button('#mode-local',()=>{mode='local';menu();});
    overlay.querySelectorAll('[data-level]').forEach(el=>el.addEventListener('click',()=>{difficulty=el.dataset.level;menu();}));button('#start',start);guide();
  }
  function event(e){
    renderer.event(e);
    if(e.type==='hit'){sound.play(e.kind==='smash'?'smash':'hit');showToast(`${e.trick?'✦ ':''}${e.name} · ${Math.round(e.power*100)}% POWER`,e.trick?1.2:.95);}
    else if(e.type==='swing')sound.play('swing');
    else if(e.type==='net'){sound.play('net');showToast('INTO THE NET',.7);}
    else if(e.type==='serve'){sound.play('serve');hudKey='';}
    else if(e.type==='point'){controls.clear();sound.play('point');showToast(`${label(e.winner)} +1 · ${e.reason}`,1.75);hudKey='';}
    else if(e.type==='over'){sound.play('over');screen='over';controls.clear();showEnd();}
  }
  function start(){
    canvas.parentElement.classList.add('playing');renderer.resize();
    sound.stop();sound.unlock();controls.mode=mode;controls.clear();
    game=new B.Game({mode,difficulty});game.onEvent=event;screen='play';accumulator=0;last=performance.now();
    renderer.particles=[];renderer.rings=[];overlay.hidden=true;hud.hidden=false;$('pause').hidden=false;$('pause').textContent='Ⅱ PAUSE';hudKey='';toastTime=0;guide();sound.play('start');canvas.focus();updateHUD();
  }
  function pause(force=false){
    if(screen==='help'){closeHelp();return;}
    if(screen==='menu'||screen==='over')return;
    if(screen==='pause'&&!force){resume();return;}
    game.paused=true;screen='pause';controls.clear();sound.stop();accumulator=0;
    overlay.hidden=false;overlay.className='overlay centered';$('pause').textContent='▶ RESUME';
    overlay.innerHTML='<div class="panel"><p class="eyebrow">TAKE A BREATHER</p><h2>Rally on hold.</h2><p>Your score is safe. The court will wait.</p><button id="resume" class="primary">BACK TO THE COURT <span>↗</span></button><button id="restart" class="secondary">RESTART MATCH</button><button id="main-menu" class="secondary">CHANGE MODE / MAIN MENU</button></div>';
    button('#resume',resume);button('#restart',start);button('#main-menu',menu);
  }
  function resume(){game.paused=false;screen='play';overlay.hidden=true;controls.clear();accumulator=0;last=performance.now();$('pause').textContent='Ⅱ PAUSE';sound.unlock();canvas.focus();}
  function showEnd(){
    updateHUD();
    overlay.hidden=false;overlay.className='overlay centered';
    overlay.innerHTML=`<div class="panel"><p class="eyebrow">THAT’S A MATCH</p><h2>${label(game.winner)} wins!</h2><div class="result-score">${game.scores[0]} : ${game.scores[1]}</div><p>${game.totalHits} successful hits · longest rally: ${game.bestRally} hits<br>Good rallies deserve a rematch.</p><button id="rematch" class="primary">RUN IT BACK <span>↗</span></button><button id="main-menu" class="secondary">CHANGE MODE / MAIN MENU</button></div>`;
    button('#rematch',start);button('#main-menu',menu);$('pause').hidden=true;
  }
  function help(){
    if(screen==='help'){closeHelp();return;}helpReturn=screen;if(screen==='play'){game.paused=true;controls.clear();sound.stop();}screen='help';overlay.hidden=false;overlay.className='overlay centered';
    overlay.innerHTML='<div class="panel"><p class="eyebrow">POWER + FINESSE</p><h2>Hold. Time. Release.</h2><ul><li><strong>P1:</strong> A / D move · W jump · Space swing.<br><strong>P2:</strong> ← / → move · ↑ jump · Enter swing.<br>Solo: either keyboard layout controls Player 1.</li><li><strong>HOLD Space / Enter / Hit to charge.</strong> RELEASE beside the shuttle to swing. A quick tap gives 25% power; 0.85 seconds fills the bar. Full charge waits for release. More power adds pace and depth, not extra reach.</li><li><strong>Automatic style:</strong> a shuttle behind you triggers a backhand. A timed soft touch near the net makes a Net Brush or Reverse Slice. A low medium-power contact makes a Flick Lift. A clean charged backhand makes a Reverse Flick; a running charged forehand makes a Slice Drive. A perfectly timed full-power jumping smash becomes a Thunder Smash.</li><li><strong>Shortcuts still work:</strong> hold W / ↑ at release for a clear, or S / ↓ for a drop. Jump, release Up, then release swing high for a smash. Touch: Jump or Drop + release Hit.</li><li><strong>Serve:</strong> highlighted player holds/releases swing. Point winner serves next. First to 11, win by two, cap 15. Lines are in; hitting out loses the point.</li><li><strong>P / Esc</strong> pauses. Pause, focus loss, touch cancellation and new points cancel stored charge. Local mode requires a keyboard.</li></ul><button id="close-help" class="primary">GOT IT <span>↗</span></button></div>';
    button('#close-help',closeHelp);
  }
  function closeHelp(){if(helpReturn==='play')resume();else if(helpReturn==='pause'){screen='play';pause(true);}else if(helpReturn==='over'){screen='over';showEnd();}else menu();}
  function updateHUD(){
    const key=[...game.scores,game.server,game.phase,game.rallyHits,mode,difficulty].join('|');if(key===hudKey)return;hudKey=key;
    hud.innerHTML=`<div class="player-label"><i class="${game.server===0?'server-dot':''}"></i><div>PLAYER 1<small>${mode==='ai'?'YOU · CORAL':'A / D · W · SPACE'}</small></div></div><div class="scoreboard"><div class="score"><b>${game.scores[0]}</b><span>:</span><b>${game.scores[1]}</b></div><small>${game.phase==='rally'?`RALLY ${String(game.rallyHits).padStart(2,'0')}`:'FIRST TO 11 · WIN BY 2'}</small></div><div class="player-label right"><div>${label(1)}<small>${mode==='ai'?'CPU · AZURE':'← / → · ↑ · ENTER'}</small></div><i class="${game.server===1?'server-dot':''}"></i></div>`;
    hud.querySelectorAll('.player-label').forEach((row,i)=>{
      const card=document.createElement('div');card.className=`power-card power-${i}`;
      card.innerHTML=`<div class="power-caption"><span>POWER</span><b id="power-value-${i}">READY</b></div><div id="power-${i}" class="power-track" role="progressbar" aria-label="Player ${i+1} shot power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="power-fill"></div><i></i></div><div id="shot-style-${i}" class="shot-style"></div>`;
      row.appendChild(card);
    });
    updatePowerHUD();
  }
  function updatePowerHUD(){game.players.forEach((p,i)=>{
    const bar=$(`power-${i}`);if(!bar)return;
    const value=Math.round(100*(p.charging?B.powerFromHold(p.chargeSeconds):p.powerFlash>0?p.swingPower:0));
    if(bar.getAttribute('aria-valuenow')!==String(value)){bar.setAttribute('aria-valuenow',String(value));bar.querySelector('.power-fill').style.transform=`scaleX(${value/100})`;}
    bar.classList.toggle('charging',p.charging);bar.classList.toggle('full',value>=95);
    const caption=p.charging?(value===100?'MAX · RELEASE':`${value}% · HOLD`):value?`${value}%`:'READY';
    if($(`power-value-${i}`).textContent!==caption)$(`power-value-${i}`).textContent=caption;
    const text=p.shotLabelTime>0?p.lastShot:p.charging?'RELEASE TO SWING':i===1&&mode==='ai'?'CPU CHARGES TOO':`HOLD ${i===0?'SPACE':'ENTER'} · RELEASE`;
    if($(`shot-style-${i}`).textContent!==text)$(`shot-style-${i}`).textContent=text;
  });}
  function frame(now){
    const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;diagnostics.frames++;diagnostics.maxFrame=Math.max(diagnostics.maxFrame,dt);
    if(screen==='play'){
      accumulator+=dt;while(accumulator>=B.C.step){const oldJumps=game.players.map(p=>p.jumps);game.step(B.C.step,controls.sample());game.players.forEach((p,i)=>{if(p.jumps!==oldJumps[i])sound.play('jump');});accumulator-=B.C.step;diagnostics.steps++;if(screen!=='play')break;}
    }else{controls.pressed.clear();accumulator=0;if(screen==='over')game.step(dt);}
    const visualDt=screen==='pause'||screen==='help'?0:dt;
    renderer.draw(game,visualDt,screen==='menu');
    if(screen==='play'){
      if(game.phase==='serve'){showToast(`${label(game.server)} TO SERVE · ${game.server===1&&mode==='ai'?'GET READY':game.server===0?'HOLD SPACE · RELEASE':'HOLD ENTER · RELEASE'}`,.1);}
      else{toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
      updateHUD();
      updatePowerHUD();
    }
    requestAnimationFrame(frame);
  }
  $('pause').addEventListener('click',()=>pause());$('sound').addEventListener('click',()=>{sound.toggle();soundUI();if(screen==='play')canvas.focus();});$('help').addEventListener('click',help);
  window.addEventListener('blur',()=>{if(screen==='play')pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='play')pause(true);});
  // Readable live state also supports the dependency-free regression harness.
  globalThis.RallyClub={get game(){return game;},get screen(){return screen;},controls,sound,renderer,diagnostics,start,menu,pause};
  soundUI();menu();requestAnimationFrame(frame);
})(globalThis.Badminton);
