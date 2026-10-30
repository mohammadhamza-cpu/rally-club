"""Real-key charging and automatic-stroke regression cases, called by browser_test.
Contact placement is an explicit fixture; hold/release goes through Chromium input.
"""
import json
import time


def run_power_checks(c, check, artifacts):
    G = 'RallyClub.game'
    def down(code):
        c.call('Input.dispatchKeyEvent',type='keyDown',code=code,key=' ' if code=='Space' else code,windowsVirtualKeyCode={'Space':32,'Enter':13}.get(code,0))
    def up(code):
        c.call('Input.dispatchKeyEvent',type='keyUp',code=code,key=' ' if code=='Space' else code,windowsVirtualKeyCode={'Space':32,'Enter':13}.get(code,0))
    c.js('RallyClub.start()')
    check('Two independent accessible power bars exist',c.js("document.querySelectorAll('[role=progressbar]').length===2 && document.getElementById('power-0').getAttribute('aria-valuenow')==='0'"))
    down('Space');c.wait(f'{G}.players[0].chargeSeconds>.25')
    check('Held Space fills power meter without swinging or serving',c.js(f"{G}.players[0].swings===0 && {G}.phase==='serve' && Number(document.getElementById('power-0').getAttribute('aria-valuenow'))>40"))
    c.call('Input.dispatchKeyEvent',type='keyDown',code='Space',key=' ',windowsVirtualKeyCode=32,autoRepeat=True)
    c.wait(f'{G}.players[0].chargeSeconds>=Badminton.C.chargeTime')
    check('Holding to full caps at 100 percent and waits for release',c.js(f"{G}.players[0].swings===0 && document.getElementById('power-0').getAttribute('aria-valuenow')==='100'"))
    up('Space');c.wait(f'{G}.totalHits===1')
    check('Release fires one full-power serve and names it on screen',c.js(f"{G}.players[0].swingPower===1 && {G}.players[0].swings===1 && document.getElementById('shot-style-0').textContent==='FLICK SERVE' && document.getElementById('toast').textContent.includes('100% POWER')"))
    c.js('neutral()');down('Space');c.wait(f'{G}.players[0].chargeSeconds>.2');down('Enter');c.wait(f'{G}.players[1].chargeSeconds>.15')
    check('Both local players charge at once with different durations',c.js(f"{G}.players.every(p=>p.charging && p.swings===0) && {G}.players[0].chargeSeconds>{G}.players[1].chargeSeconds+.12"))
    c.screenshot(artifacts/'power-bars-desktop.png')
    up('Enter');c.wait(f'{G}.players[1].swings===1')
    check('Releasing Enter does not fire or drain Player 1 charge',c.js(f'{G}.players[0].charging && {G}.players[0].swings===0'))
    up('Space');c.wait(f'{G}.players[0].swings===1')
    check('Longer local hold produces stronger shot than shorter hold',c.js(f'{G}.players[0].swingPower>{G}.players[1].swingPower'))
    c.js('neutral()');down('Space');c.wait(f'{G}.players[0].charging');c.key('KeyP');up('Space');c.click('#resume');time.sleep(.1)
    check('Pause while charging cancels power and pending release',c.js(f'!{G}.players[0].charging && {G}.players[0].chargeSeconds===0 && {G}.players[0].swings===0'))
    c.js('neutral()');down('Space');c.wait(f'{G}.players[0].charging');c.js("window.dispatchEvent(new Event('blur'))");up('Space');c.click('#resume')
    check('Focus loss cancels a charge without a delayed shot',c.js(f'{G}.players[0].chargeSeconds===0 && {G}.players[0].swings===0'))
    c.js('neutral()');down('Space');c.wait(f'{G}.players[0].charging');c.click('#help');up('Space');c.click('#close-help')
    check('Opening help while charging safely cancels the stroke',c.js(f'{G}.players[0].swings===0 && !{G}.players[0].charging'))
    c.js('neutral()');down('Space');c.wait(f'{G}.players[0].charging');c.js(f'Object.assign({G}.shuttle,{{x:800,y:543,vx:0,vy:100,lastHitter:0}})');c.wait(f"{G}.phase==='point'");up('Space');c.wait(f"{G}.phase==='serve'")
    check('A point cancels held charge before the next serve',c.js(f'!{G}.players[0].charging && {G}.players[0].swings===0 && RallyClub.controls.held.size===0'))
    # Contact fixtures are installed only just before release, after physical charge.
    c.js("""window.strokeFixture=(id,setup)=>{const g=RallyClub.game,p=g.players[id],f=p.face;Object.assign(p,{x:id===0?setup.x:1200-setup.x,y:setup.feet,grounded:setup.feet===548,vy:0,vx:(setup.move||0)*335*f});Object.assign(g.shuttle,{x:p.x+setup.dx*f,y:p.y+setup.dy,vx:(setup.dx<0?40:-40)*f,vy:0,lastHitter:1-id,live:true});};""")
    fixtures=[('BACKHAND DRIVE',dict(x=300,feet=548,dx=-90,dy=-140),0),('REVERSE FLICK',dict(x=300,feet=548,dx=-90,dy=-140),.6),('NET BRUSH',dict(x=485,feet=548,dx=55,dy=-140),0),('THUNDER SMASH',dict(x=300,feet=437,dx=-90,dy=-110),.9)]
    for id in [0,1]:
        key='Space' if id==0 else 'Enter'
        for name,setup,hold in fixtures:
            c.js('neutral()');down(key)
            if hold:c.wait(f'{G}.players[{id}].chargeSeconds>={min(hold,.85)}')
            c.js(f'strokeFixture({id},{json.dumps(setup)})');up(key);c.wait(f'{G}.players[{id}].hits===1')
            check(f'Actual {key} release triggers and displays {name}',c.js(f"{G}.players[{id}].lastShot==={json.dumps(name)} && document.getElementById('shot-style-{id}').textContent==={json.dumps(name)} && document.getElementById('toast').textContent.includes({json.dumps(name)})"))
            if name=='REVERSE FLICK' and id==0:
                c.key('KeyP');c.js("document.getElementById('overlay').hidden=true")
                c.screenshot(artifacts/'trickshot-backhand.png')
                c.key('Escape')
    # Solo aliases are one logical charge, not two queued hits.
    c.click('#pause');c.click('#main-menu');c.click('#mode-ai');c.click('#start')
    down('Space');c.wait(f'{G}.players[0].chargeSeconds>.15');down('Enter');up('Space');time.sleep(.1)
    check('Solo Space + Enter share charge until BOTH are released',c.js(f'{G}.players[0].charging && {G}.players[0].swings===0'))
    up('Enter');c.wait(f'{G}.totalHits===1')
    check('Solo alias release makes one shot, not a duplicate',c.js(f'{G}.players[0].swings===1'))
    c.js('RallyClub.start()');c.key('Enter');c.wait(f'{G}.totalHits===1')
    check('A quick solo Enter tap still serves without holding',c.js(f'{G}.players[0].swingPower<.5'))
    c.js(f'{G}.server=1;{G}.prepareServe()');c.wait(f'{G}.players[1].chargeSeconds>.25')
    check('Computer opponent also fills its visible power bar',c.js("Number(document.getElementById('power-1').getAttribute('aria-valuenow'))>35"))
    c.wait(f"{G}.phase==='rally'")
    check('AI releases charged serve through ordinary physics',c.js(f'{G}.shuttle.lastHitter===1 && {G}.players[1].swingPower>.7'))
    c.click('#pause');c.click('#main-menu');c.click('#mode-local');c.click('#start')
