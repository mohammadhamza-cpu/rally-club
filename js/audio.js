/* Original synthesized cues, generated locally on the first gesture.
 * No audio assets, autoplay exceptions or network. Unsupported audio fails silent. */
(function(B){
  'use strict';
  B.Sound=class{
    constructor(){this.context=null;this.enabled=true;this.voices=new Set();this.buffers=new Map();this.played={};try{this.enabled=localStorage.getItem('rally-club.sound')!=='off';}catch(_){}}
    unlock(){
      if(!this.enabled)return;
      try{if(!this.context){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=.24;this.master.connect(this.context.destination);this.build();}if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch(_){this.context=null;}
    }
    build(){
      const definitions={swing:[.16,170,90,'noise'],hit:[.16,1050,420,'pluck'],smash:[.25,240,65,'smash'],net:[.15,95,55,'noise'],jump:[.12,220,440,'tone'],serve:[.3,440,660,'chime'],point:[.42,523,784,'chime'],over:[1.1,392,784,'melody'],start:[.45,330,660,'chime']};
      for(const[name,[duration,f1,f2,kind]]of Object.entries(definitions)){
        const buffer=this.context.createBuffer(1,Math.ceil(duration*this.context.sampleRate),this.context.sampleRate),data=buffer.getChannelData(0);let phase=0,noise=0;
        for(let i=0;i<data.length;i++){
          const t=i/data.length,seconds=i/this.context.sampleRate;
          let f=f1+(f2-f1)*t;
          if(kind==='chime')f=t<.48?f1:f2;
          if(kind==='melody')f=[392,494,587,784][Math.min(3,Math.floor(t*4))];
          phase+=2*Math.PI*f/this.context.sampleRate;noise=noise*.5+(Math.random()*2-1)*.5;
          const env=Math.min(1,t*45)*Math.pow(1-t,kind==='noise'?1.5:2);
          let sample=Math.sin(phase)*.55+Math.sin(phase*2)*.12;
          if(kind==='noise')sample=noise*.9+Math.sin(phase)*.08;
          if(kind==='pluck')sample=sample*.65+noise*Math.exp(-seconds*65)*.6;
          if(kind==='smash')sample=sample*.5+noise*.6;
          data[i]=sample*env;
        }
        data[0]=0;data[data.length-1]=0;this.buffers.set(name,buffer);
      }
    }
    play(name){
      if(!this.enabled||!this.context||this.context.state!=='running'||!this.buffers.has(name))return;
      if(this.voices.size>12)return;
      const source=this.context.createBufferSource();source.buffer=this.buffers.get(name);source.connect(this.master);this.voices.add(source);source.onended=()=>{source.disconnect();this.voices.delete(source);};source.start();this.played[name]=(this.played[name]||0)+1;
    }
    stop(){for(const voice of this.voices){try{voice.stop();voice.disconnect();}catch(_){}}this.voices.clear();}
    toggle(){this.enabled=!this.enabled;if(!this.enabled)this.stop();else this.unlock();try{localStorage.setItem('rally-club.sound',this.enabled?'on':'off');}catch(_){}return this.enabled;}
  };
})(globalThis.Badminton);
