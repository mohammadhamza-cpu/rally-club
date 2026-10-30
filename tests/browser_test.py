"""Rally Club real Chromium regression tests. Python standard library only.
Uses a private headless profile, file:// or --base-url, real input events, and
explicit fixtures for contact, net/out/deuce states. Audio is inspected, not heard.
Run: python3 badminton/tests/browser_test.py [--browser /path/to/chrome]
"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request
from devtools import DevTools
from power_browser import run_power_checks

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'tests' / 'artifacts'
G = 'RallyClub.game'


def main():
    global ARTIFACTS
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser')
    parser.add_argument('--base-url', help='Test a hosted copy; no authentication is sent to the browser')
    args = parser.parse_args()
    base_url = args.base_url.rstrip('/') + '/' if args.base_url else None
    if base_url:
        if urllib.parse.urlparse(base_url).scheme != 'https':
            raise SystemExit('Hosted verification requires HTTPS')
        ARTIFACTS = ROOT / 'deployment' / 'github-pages' / 'artifacts'
    browser = next((p for p in [args.browser, shutil.which('chromium'), shutil.which('google-chrome'), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] if p and Path(p).is_file()), None)
    if not browser:
        raise SystemExit('Supply --browser /path/to/chrome')
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    results, simulations = [], []
    def check(name, condition):
        results.append({'name': name, 'passed': bool(condition)})
        print(('PASS ' if condition else 'FAIL ') + name, flush=True)
        if not condition:
            raise AssertionError(name)
    with tempfile.TemporaryDirectory(prefix='rally-club-regression-') as profile:
        with open(ARTIFACTS / 'chrome.log', 'w') as log:
            process = subprocess.Popen([browser, '--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--disable-background-networking', '--disable-sync', '--disable-component-update', '--disable-features=MediaRouter', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', f'--user-data-dir={profile}', 'about:blank'], stdout=log, stderr=log)
            c = None
            try:
                port_file = Path(profile) / 'DevToolsActivePort'
                deadline = time.monotonic() + 25
                while not port_file.exists():
                    if process.poll() is not None or time.monotonic() > deadline:
                        raise RuntimeError('Chrome startup failed')
                    time.sleep(.1)
                port = int(port_file.read_text().splitlines()[0])
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list', timeout=5) as response:
                    pages = json.load(response)
                c = DevTools(next(p['webSocketDebuggerUrl'] for p in pages if p['type'] == 'page'))
                for domain in ['Page', 'Runtime', 'Log', 'Network']:
                    c.call(domain + '.enable')
                c.call('Emulation.setFocusEmulationEnabled', enabled=True)
                c.call('Emulation.setDeviceMetricsOverride', width=1360, height=1000, deviceScaleFactor=1, mobile=False)
                c.call('Page.addScriptToEvaluateOnNewDocument', source="""
                  window.rafAudit={pending:new Set(),max:0};
                  const nativeRAF=requestAnimationFrame.bind(window);
                  window.requestAnimationFrame=fn=>{let id=nativeRAF(t=>{rafAudit.pending.delete(id);fn(t)});rafAudit.pending.add(id);rafAudit.max=Math.max(rafAudit.max,rafAudit.pending.size);return id;};
                """)
                def navigate(file, ready):
                    url = urllib.parse.urljoin(base_url, file.relative_to(ROOT).as_posix()) if base_url else file.as_uri()
                    c.call('Page.navigate', url=url)
                    time.sleep(.35)  # Allow the old execution context to be destroyed.
                    c.wait(ready)
                def down(code):
                    v={'Space':32,'Enter':13,'ArrowUp':38,'ArrowLeft':37,'ArrowRight':39,'ArrowDown':40}.get(code,ord(code[-1]))
                    c.call('Input.dispatchKeyEvent', type='keyDown', code=code, key=' ' if code=='Space' else code, windowsVirtualKeyCode=v)
                def up(code):
                    c.call('Input.dispatchKeyEvent', type='keyUp', code=code, key=code)
                navigate(ROOT/'tests/index.html', 'Boolean(window.BadmintonTestResults)')
                engine = c.js('BadmintonTestResults')
                (ARTIFACTS/'engine-results.json').write_text(json.dumps(engine,indent=2))
                check(f'All {len(engine)} deterministic engine tests pass', all(r['passed'] for r in engine))
                # Whole matches: no manual points, teleports or altered collision rules.
                for mode in ['ai','local']:
                    for level in ['easy','medium','hard']:
                        sim = c.js("""(()=>{const B=Badminton;let seed=37;
                          const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
                          const events=[];const mode=MODE,level=LEVEL;
                          const g=new B.Game({mode,difficulty:level,random,onEvent:e=>events.push(e)});
                          const left=new B.AI('hard',random),right=new B.AI(level,random);let steps=0;
                          for(;steps<120*2400&&g.phase!=='over';steps++)g.step(B.C.step,[left.decide(g,0,B.C.step),mode==='local'?right.decide(g,1,B.C.step):{}]);
                          return {mode,level,seconds:steps/120,phase:g.phase,score:g.scores,hits:g.totalHits,bestRally:g.bestRally,
                            players:g.players.map(p=>({swings:p.swings,hits:p.hits,jumps:p.jumps})),
                            shots:events.filter(e=>e.type==='hit').reduce((m,e)=>(m[e.kind]=(m[e.kind]||0)+1,m),{}),
                            nets:events.filter(e=>e.type==='net').length,points:events.filter(e=>e.type==='point').length};})()""".replace('MODE',json.dumps(mode)).replace('LEVEL',json.dumps(level)))
                        simulations.append(sim)
                        check(f'{mode}/{level}: full match finishes with both sides returning',sim['phase']=='over' and all(p['hits']>5 for p in sim['players']) and sim['points']==sum(sim['score']))
                        check(f'{mode}/{level}: rallies include all four shot types',all(sim['shots'].get(k,0)>0 for k in ['normal','clear','net','smash']) and sim['bestRally']>=3)
                (ARTIFACTS/'simulation-results.json').write_text(json.dumps(simulations,indent=2))
                check('Seeded AI difficulty gives progressively stronger opposition', simulations[0]['score'][1]<simulations[1]['score'][1]<=simulations[2]['score'][1])
                navigate(ROOT/'index.html', 'Boolean(window.RallyClub)')
                check('Game page loads menu without creating audio context', c.js("RallyClub.screen==='menu' && RallyClub.sound.context===null && document.querySelectorAll('[data-level]').length===3"))
                c.screenshot(ARTIFACTS/'desktop-menu.png')
                c.click('[data-level="easy"]')
                check('Difficulty selector changes selected button',c.js("document.querySelector('[data-level=easy]').getAttribute('aria-pressed')==='true'"))
                c.click('#start')
                check('Start enters AI/easy service and focuses canvas',c.js(f"RallyClub.screen==='play' && {G}.mode==='ai' && {G}.difficulty==='easy' && {G}.phase==='serve' && document.activeElement.id==='court'"))
                c.wait("RallyClub.sound.context && RallyClub.sound.context.state==='running'")
                check('Gesture unlocks audio and match-start cue',c.js("RallyClub.sound.played.start===1 && RallyClub.sound.buffers.size===9"))
                c.key('Space');c.wait(f'{G}.totalHits===1')
                check('Space physically serves with swing and hit cues',c.js(f"{G}.phase==='rally' && {G}.shuttle.vx>0 && RallyClub.sound.played.swing===1 && RallyClub.sound.played.hit===1"))
                c.screenshot(ARTIFACTS/'desktop-play.png')
                c.js("""window.neutral=()=>{const g=RallyClub.game;g.phase='rally';g.players.forEach((p,i)=>Object.assign(p,Badminton.makePlayer(i)));Object.assign(g.shuttle,{x:1100,y:-700,vx:0,vy:0,live:true,lastHitter:0,trail:[]});RallyClub.controls.clear();};
                  window.contact=(id=0,kind='normal')=>{neutral();const g=RallyClub.game,p=g.players[id];if(kind==='smash')Object.assign(p,{y:437,vy:0,grounded:false});Object.assign(g.shuttle,{x:p.x+p.face*70,y:p.y-105,vx:-p.face*40,vy:0,lastHitter:1-id});};
                """)
                c.js('neutral()');x=c.js(f'{G}.players[0].x');c.key('KeyD',hold=.25)
                check('AI mode D moves player 1 right',c.js(f'{G}.players[0].x')>x+35)
                time.sleep(.2);x=c.js(f'{G}.players[0].x');time.sleep(.12)
                check('Key release brakes then stops movement',abs(c.js(f'{G}.players[0].x')-x)<.1)
                c.js('neutral()');c.key('ArrowLeft',hold=.25)
                check('AI mode arrows also move player 1',c.js(f'{G}.players[0].x<265'))
                c.js('neutral()');c.key('KeyW');time.sleep(.1)
                check('W jumps and changes airborne animation state',c.js(f'!{G}.players[0].grounded && {G}.players[0].y<490 && {G}.players[0].jumps===1'))
                c.wait(f'{G}.players[0].grounded')
                c.key('ArrowUp');time.sleep(.08)
                check('AI mode ArrowUp also jumps',c.js(f'!{G}.players[0].grounded && {G}.players[0].jumps===2'))
                c.js('contact()');hits=c.js(f'{G}.totalHits');c.key('Enter');c.wait(f'{G}.totalHits>{hits}')
                check('AI mode Enter swings player 1 and returns shuttle',c.js(f'{G}.shuttle.lastHitter===0 && {G}.shuttle.kind==="normal"'))
                c.js('neutral()');c.key('Space');time.sleep(.12)
                check('Far-away swings execute but cannot hit',c.js(f'{G}.players[0].swings===1 && {G}.players[0].hits===0'))
                c.key('Space',repeat=True)
                check('OS repeat cannot queue extra swings',c.js(f'{G}.players[0].swings===1'))
                for kind,modifier in [('clear','KeyW'),('net','KeyS'),('smash',None)]:
                    c.js(f'contact(0,{json.dumps(kind)})');hits=c.js(f'{G}.totalHits')
                    if modifier:down(modifier)
                    c.key('Space')
                    if modifier:up(modifier)
                    c.wait(f'{G}.totalHits>{hits}')
                    check(f'Actual keyboard input produces {kind} shot',c.js(f'{G}.shuttle.kind==={json.dumps(kind)}'))
                c.js('neutral()');c.key('KeyP');snapshot=c.js(f'JSON.stringify({G}.players)+JSON.stringify({G}.shuttle)+{G}.time');time.sleep(.3);c.key('Space')
                check('P freezes physics and actions during pause',c.js("RallyClub.screen==='pause'") and snapshot==c.js(f'JSON.stringify({G}.players)+JSON.stringify({G}.shuttle)+{G}.time'))
                check('Pause cancels outstanding audio voices',c.js('RallyClub.sound.voices.size===0'))
                c.key('KeyP',repeat=True);check('Pause ignores autorepeat',c.js("RallyClub.screen==='pause'"))
                c.key('Escape');check('Escape resumes without stale input',c.js("RallyClub.screen==='play' && !RallyClub.game.paused && RallyClub.controls.held.size===0"))
                c.click('#pause');c.click('#resume');check('Pause/resume buttons restore canvas focus',c.js("RallyClub.screen==='play' && document.activeElement.id==='court'"))
                c.js("document.getElementById('pause').focus()");c.key('Space');check('Focused toolbar button activates natively with Space',c.js("RallyClub.screen==='pause'"));c.click('#resume')
                c.js("window.dispatchEvent(new Event('blur'))");check('Focus loss pauses and clears held keys',c.js("RallyClub.screen==='pause' && RallyClub.controls.held.size===0"));c.click('#resume')
                c.js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden")
                check('Hidden tab automatically pauses',c.js("RallyClub.screen==='pause'"));c.click('#resume')
                c.click('#help');check('Help pauses a live rally',c.js("RallyClub.screen==='help' && RallyClub.game.paused"));c.click('#close-help');check('Closing help restores live rally',c.js("RallyClub.screen==='play' && !RallyClub.game.paused"))
                c.click('#sound');check('Mute cancels voices and persists setting',c.js("!RallyClub.sound.enabled && RallyClub.sound.voices.size===0 && localStorage.getItem('rally-club.sound')==='off'"));c.click('#sound')
                # Inspect PCM and real source-node state; speaker output is muted.
                audio=c.js("Array.from(RallyClub.sound.buffers,([name,b])=>{const s=b.getChannelData(0);let peak=0,sum=0,finite=true;for(const x of s){finite=finite&&Number.isFinite(x);peak=Math.max(peak,Math.abs(x));sum+=x*x;}return {name,finite,peak,rms:Math.sqrt(sum/s.length),start:s[0],end:s[s.length-1],duration:b.duration};})")
                (ARTIFACTS/'audio-results.json').write_text(json.dumps(audio,indent=2))
                check('All nine generated cues contain finite non-silent unclipped PCM',all(a['finite'] and .01<a['peak']<1 and a['rms']>.005 and a['start']==0 and a['end']==0 for a in audio))
                # Local mode uses actual independent simultaneous keyboard events.
                c.click('#pause');c.click('#main-menu');c.click('#mode-local');c.click('#start')
                check('Local mode shows separate player controls',c.js(f"{G}.mode==='local' && document.querySelector('.control-strip').textContent.includes('P2')"))
                c.js('neutral()');down('KeyD');down('ArrowLeft');c.wait(f'{G}.players[0].x>335 && {G}.players[1].x<865');up('KeyD');up('ArrowLeft')
                check('Two players move simultaneously and independently',c.js(f'{G}.players[0].x>330 && {G}.players[1].x<870'))
                c.js('neutral()');down('KeyW');down('ArrowUp');time.sleep(.14);up('KeyW');up('ArrowUp')
                check('Both players can jump at once',c.js(f'{G}.players.every(p=>!p.grounded && p.y<490)'))
                c.js('neutral()');down('Space');down('Enter');time.sleep(.08);up('Space');up('Enter')
                c.wait(f'{G}.players.every(p=>p.swings===1)')
                check('Both players release-swing independently on same keyboard',c.js(f'{G}.players.every(p=>p.swings===1)'))
                c.js('contact(1)');hits=c.js(f'{G}.totalHits');c.key('Enter');c.wait(f'{G}.totalHits>{hits}')
                check('Local Enter returns from player 2 toward player 1',c.js(f'{G}.shuttle.lastHitter===1 && {G}.shuttle.vx<0'))
                c.js('neutral()');c.key('ArrowRight',hold=.15)
                check('Local arrow keys do not move player 1',c.js(f'{G}.players[0].x===300 && {G}.players[1].x>915'))
                # Real physics crosses net/ground; no direct scoring calls here.
                c.js(f'neutral();{G}.scores=[0,0];Object.assign({G}.shuttle,{{x:570,y:430,vx:900,vy:50,lastHitter:0}})');c.wait(f'{G}.scores[1]===1')
                check('Net collision makes sound and awards opponent automatically',c.js("RallyClub.sound.played.net>=1 && RallyClub.sound.played.point>=1"))
                c.wait(f"{G}.phase==='serve'");check('Point winner receives next local serve',c.js(f'{G}.server===1'))
                c.key('Enter');c.wait(f"{G}.phase==='rally'");check('Player 2 can serve using Enter',c.js(f'{G}.shuttle.lastHitter===1'))
                c.js(f'neutral();Object.assign({G}.shuttle,{{x:1130,y:542,vx:30,vy:90,lastHitter:1}})');c.wait(f'{G}.scores[0]===1');check('Out-of-bounds faults last hitter',c.js(f"{G}.pointReason==='OUT'"))
                c.js(f'neutral();{G}.scores=[10,10];Object.assign({G}.shuttle,{{x:800,y:542,vx:0,vy:100,lastHitter:0}})');c.wait(f'{G}.scores[0]===11')
                check('Deuce 11–10 continues instead of ending match',c.js(f"{G}.phase==='point'"))
                c.js(f'neutral();Object.assign({G}.shuttle,{{x:800,y:542,vx:0,vy:100,lastHitter:0}})');c.wait("RallyClub.screen==='over'")
                check('12–10 ends match with winner/rematch UI and finale cue',c.js(f"{G}.scores[0]===12 && document.querySelector('#rematch')!==null && RallyClub.sound.played.over===1"))
                check('Final HUD score agrees with match result',c.js("Array.from(document.querySelectorAll('.score b'),e=>e.textContent).join(':')==='12:10'"))
                time.sleep(.1);c.screenshot(ARTIFACTS/'desktop-game-over.png')
                before=c.js('RallyClub.sound.played.over');time.sleep(.2);check('Finale sound never repeats after game over',c.js('RallyClub.sound.played.over')==before)
                c.click('#rematch');check('Rematch resets score, service and player stats',c.js(f"{G}.scores.join()==='0,0' && {G}.totalHits===0 && {G}.phase==='serve'"))
                c.js('for(let i=0;i<20;i++)RallyClub.start()');check('Twenty restarts keep exactly one animation chain',c.js('rafAudit.pending.size===1 && rafAudit.max===1'))
                c.key('Space');c.wait(f'{G}.totalHits===1');check('Repeated restarts do not duplicate input handlers',c.js(f'{G}.players[0].swings===1'))
                run_power_checks(c,check,ARTIFACTS)
                # Responsive portrait and emulated multi-touch.
                c.click('#pause');c.click('#main-menu');c.click('#mode-ai')
                c.call('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=2,mobile=True)
                c.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=5)
                time.sleep(.2);c.screenshot(ARTIFACTS/'mobile-menu.png')
                check('Portrait menu has no horizontal page overflow',c.js('document.documentElement.scrollWidth<=window.innerWidth'))
                c.click('#start');c.js('neutral()');c.call('Runtime.evaluate',expression="document.querySelector('#touch-controls').scrollIntoView({block:'nearest'})")
                time.sleep(.15)
                right=c.point('[data-control="right"]');jump=c.point('[data-control="jump"]')
                def touch(kind,points):c.call('Input.dispatchTouchEvent',type=kind,touchPoints=[dict(**p,id=i+1,radiusX=4,radiusY=4,force=1) for i,p in enumerate(points)])
                touch('touchStart',[right]);time.sleep(.20);touch('touchEnd',[])
                check('Touch movement drives player 1',c.js(f'{G}.players[0].x>325'))
                time.sleep(.2);c.js('neutral()');touch('touchStart',[jump,right]);time.sleep(.12);touch('touchEnd',[])
                check('Multi-touch jump plus movement works',c.js(f'!{G}.players[0].grounded && {G}.players[0].x>305'))
                c.js(f'{G}.prepareServe()');hit=c.point('[data-control="swing"]');touch('touchStart',[hit]);time.sleep(.05);touch('touchEnd',[]);c.wait(f"{G}.phase==='rally'")
                check('Touch Hit serves through the same racket collision path',c.js(f'{G}.shuttle.lastHitter===0'))
                check('Touch release clears held controls',c.js('RallyClub.controls.held.size===0'))
                c.js('RallyClub.start()');touch('touchStart',[hit]);c.wait(f'{G}.players[0].chargeSeconds>.3')
                check('Touch hold fills power without swinging',c.js(f'{G}.players[0].swings===0 && {G}.players[0].charging'))
                c.screenshot(ARTIFACTS/'power-bars-mobile.png')
                touch('touchCancel',[]);c.wait(f'!{G}.players[0].charging')
                check('Touch cancellation discards charged hit without firing',c.js(f'{G}.players[0].swings===0 && {G}.players[0].chargeSeconds===0'))
                for kind,modifier in [('net','drop'),('clear','jump')]:
                    c.js(f'contact(0,{json.dumps(kind)})');hits=c.js(f'{G}.totalHits')
                    touch('touchStart',[c.point(f'[data-control="{modifier}"]'),hit]);time.sleep(.07);touch('touchEnd',[]);c.wait(f'{G}.totalHits>{hits}')
                    check(f'Touch modifier plus Hit makes a {kind} shot',c.js(f'{G}.shuttle.kind==={json.dumps(kind)}'))
                c.js('neutral()');touch('touchStart',[right]);touch('touchCancel',[]);check('Touch cancellation does not leave sticky movement',c.js('RallyClub.controls.held.size===0'))
                c.screenshot(ARTIFACTS/'mobile-play.png')
                c.click('#help');check('Mobile help is scrollable inside its panel',c.js("(()=>{const p=document.querySelector('.panel');return p.clientHeight<=document.querySelector('.overlay').clientHeight && getComputedStyle(p).overflowY==='auto'})()"))
                c.key('Escape')
                c.call('Emulation.setDeviceMetricsOverride',width=844,height=390,deviceScaleFactor=2,mobile=True);time.sleep(.2);c.screenshot(ARTIFACTS/'mobile-landscape.png')
                check('Landscape play remains within viewport width',c.js('document.documentElement.scrollWidth<=window.innerWidth'))
                check('Landscape touch controls do not cover pause button',c.js("(()=>{const p=document.getElementById('pause').getBoundingClientRect();return [...document.querySelectorAll('[data-control]')].every(e=>{const r=e.getBoundingClientRect();return r.right<=p.left||r.left>=p.right||r.bottom<=p.top||r.top>=p.bottom})})()"))
                # Storage unavailable must not break boot or sound toggling.
                c.call('Page.addScriptToEvaluateOnNewDocument',source="Object.defineProperty(window,'localStorage',{get(){throw new Error('test storage blocked')}})")
                navigate(ROOT/'index.html','Boolean(window.RallyClub)');c.click('#start');c.click('#sound');check('Game works when browser storage is blocked',c.js("RallyClub.screen==='play' && RallyClub.game.phase==='serve'"))
                errors=[e for e in c.events if e['method']=='Runtime.exceptionThrown' or (e['method']=='Log.entryAdded' and e['params']['entry']['level']=='error') or (e['method']=='Runtime.consoleAPICalled' and e['params']['type']=='error')]
                remote=[e['params']['request']['url'] for e in c.events if e['method']=='Network.requestWillBeSent' and e['params']['request']['url'].startswith(('http://','https://'))]
                (ARTIFACTS/'console-errors.json').write_text(json.dumps(errors,indent=2))
                check('No JavaScript exceptions or console errors in browser run',not errors)
                if base_url:
                    check('Hosted game requests only its own static site files',bool(remote) and all(url.startswith(base_url) for url in remote))
                else:
                    check('Game makes zero HTTP/HTTPS requests',not remote)
            except Exception:
                if c:
                    try:
                        c.screenshot(ARTIFACTS/'failure.png')
                        state=c.js('({screen:RallyClub.screen,game:RallyClub.game,held:[...RallyClub.controls.held],focus:document.activeElement.id,diagnostics:RallyClub.diagnostics})')
                        (ARTIFACTS/'failure-state.json').write_text(json.dumps(state,indent=2))
                        print('FAILURE STATE',json.dumps(state),flush=True)
                    except Exception:pass
                raise
            finally:
                (ARTIFACTS/'browser-results.json').write_text(json.dumps(results,indent=2))
                (ARTIFACTS/'simulation-results.json').write_text(json.dumps(simulations,indent=2))
                if c:
                    c.socket.close()
                process.terminate()
                try:process.wait(timeout=7)
                except subprocess.TimeoutExpired:process.kill();process.wait()
    print(f'COMPLETE: {len(results)} browser checks, {len(engine)} engine tests, {len(simulations)} full simulated matches.',flush=True)

if __name__=='__main__':
    main()
