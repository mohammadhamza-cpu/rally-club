/* Hold Space/Enter/Hit to charge, RELEASE to swing. Physical press duration is
 * preserved even for a tap entirely between simulation frames. Solo aliases form
 * one logical button: releasing just one of Space + Enter must not fire twice. */
(function(B){
  'use strict';
  B.Controls=class{
    constructor(canvas,onPause,onGesture,onCancel=()=>{}){
      this.held=new Set();this.keyboard=new Set();this.pressed=new Set();this.pointers=new Map();this.mode='ai';this.onCancel=onCancel;
      this.strokes=[this.newStroke(),this.newStroke()];this.releasedAt=new Map();
      const codes=['KeyA','KeyD','KeyW','KeyS','Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'];
      window.addEventListener('keydown',e=>{
        if(e.code==='KeyP'||e.code==='Escape'){if(!e.repeat){e.preventDefault();onPause();}return;}
        if(!codes.includes(e.code)||e.target.closest('button,a,input,select,textarea'))return;
        e.preventDefault();if(e.repeat)return;onGesture();
        if(!this.held.has(e.code))this.pressed.add(e.code);
        this.keyboard.add(e.code);this.syncHeld(false,e.timeStamp);
      });
      window.addEventListener('keyup',e=>{this.keyboard.delete(e.code);this.syncHeld(false,e.timeStamp);});
      window.addEventListener('blur',()=>this.clear());
      canvas.addEventListener('pointerdown',()=>{canvas.focus();onGesture();});
      document.querySelectorAll('[data-control]').forEach(button=>{
        const code={left:'KeyA',right:'KeyD',jump:'KeyW',drop:'KeyS',swing:'Space'}[button.dataset.control];
        button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,code);if(!this.held.has(code))this.pressed.add(code);this.syncHeld();onGesture();});
        const release=(e,cancel)=>{if(!this.pointers.has(e.pointerId))return;this.pointers.delete(e.pointerId);this.syncHeld(cancel,e.timeStamp);};
        button.addEventListener('pointerup',e=>release(e,false));
        button.addEventListener('pointercancel',e=>release(e,true));
        button.addEventListener('lostpointercapture',e=>release(e,true));
      });
    }
    newStroke(){return {down:false,start:0,release:null,cancel:false};}
    syncHeld(cancel=false,stamp=performance.now()){
      const previous=this.held;
      this.held=new Set([...this.keyboard,...this.pointers.values()]);
      for(const key of previous)if(!this.held.has(key))this.releasedAt.set(key,stamp);
      const h=(...keys)=>keys.some(k=>this.held.has(k)),now=performance.now();
      // A single multitouch release dispatches several pointerup events with
      // the same timestamp: preserve its modifiers regardless of event order.
      const atRelease=(...keys)=>h(...keys)||keys.some(k=>this.releasedAt.get(k)===stamp);
      const down=[this.mode==='ai'?h('Space','Enter'):h('Space'),this.mode==='local'&&h('Enter')];
      this.strokes.forEach((s,i)=>{
        if(down[i]&&!s.down){s.start=now;s.cancel=false;}
        if(!down[i]&&s.down){
          if(cancel){s.cancel=true;s.release=null;}
          else s.release={holdSeconds:Math.max(0,(now-s.start)/1000),
            up:i===0?(this.mode==='ai'?atRelease('KeyW','ArrowUp'):atRelease('KeyW')):atRelease('ArrowUp'),
            down:i===0?(this.mode==='ai'?atRelease('KeyS','ArrowDown'):atRelease('KeyS')):atRelease('ArrowDown')};
        }
        s.down=down[i];
      });
    }
    clear(){this.keyboard.clear();this.held.clear();this.pressed.clear();this.pointers.clear();this.releasedAt.clear();this.strokes=[this.newStroke(),this.newStroke()];this.onCancel();}
    sample(){
      const h=(...keys)=>keys.some(k=>this.held.has(k)),p=(...keys)=>keys.some(k=>this.pressed.has(k));
      const a=this.mode==='ai'
        ?{move:Number(h('KeyD','ArrowRight'))-Number(h('KeyA','ArrowLeft')),jump:p('KeyW','ArrowUp'),up:h('KeyW','ArrowUp'),down:h('KeyS','ArrowDown')}
        :{move:Number(h('KeyD'))-Number(h('KeyA')),jump:p('KeyW'),up:h('KeyW'),down:h('KeyS')};
      const b={move:Number(h('ArrowRight'))-Number(h('ArrowLeft')),jump:p('ArrowUp'),up:h('ArrowUp'),down:h('ArrowDown')};
      const commands=[a,b].map((input,i)=>{const s=this.strokes[i];const command={...input,swingHeld:s.down,swingReleased:!!s.release,cancelCharge:s.cancel,...s.release};s.release=null;s.cancel=false;return command;});
      this.pressed.clear();return commands;
    }
  };
})(globalThis.Badminton);
