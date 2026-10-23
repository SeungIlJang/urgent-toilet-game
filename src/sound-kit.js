// Original procedural SFX: soft water drops, bubble pops and a cartoon flush.
// One renderer drives both the in-game buffers and downloadable WAV previews.

// 실제 음원(src/assets/sfx/*.m4a). 파일명이 그대로 효과음 이름이 된다(shoot.m4a → 'shoot').
// vite 가 base64 로 인라인하므로 단일 HTML 안에 들어가고, 폴더가 비면 아래 renderSound() 합성음이 그대로 쓰인다.
// scripts/build-sfx.mjs 가 WAV 를 여기로 변환해 넣는다.
const SFX = import.meta.glob('./assets/sfx/*.m4a', { eager: true, query: '?url', import: 'default' });
// 파일은 이름당 한 개라, 연사되는 소리는 재생 속도를 조금씩 흔들어 기계음처럼 들리지 않게 한다
// (합성음 시절에는 variant 3종을 돌려썼다).
const VARY = new Set(['shoot', 'hit', 'kill']);
export const SOUND_NAMES = ['shoot','hit','kill','boom','coin','hurt','win','warn','rain','bolt','freeze','heal','boss'];
const LENGTH = {shoot:.095,hit:.075,kill:.18,boom:.68,coin:.25,hurt:.27,win:.66,warn:.7,rain:.46,bolt:.34,freeze:.55,heal:.65,boss:1.05};
export function renderSound(name, rate=44100, variant=0) {
  if (!LENGTH[name]) throw new Error(`Unknown sound: ${name}`);
  const out = new Float32Array(Math.ceil(LENGTH[name]*rate));
  let seed = 173 + variant*7919;
  const random = () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  const pitch = 1 + (variant-1)*.035;
  function drop(start,duration,from,to,volume=.25) {
    let phase=0;
    const begin=Math.floor(start*rate),len=Math.floor(duration*rate);
    for(let i=0;i<len&&begin+i<out.length;i++) {
      const u=i/len,t=i/rate;
      phase+=2*Math.PI*(to+(from-to)*Math.exp(-u*6))*pitch/rate;
      const env=Math.min(1,t/.003)*Math.pow(1-u,2.5);
      out[begin+i]+=volume*env*(Math.sin(phase)+.12*Math.sin(phase*2));
    }
  }
  function note(start,duration,freq,volume=.19) {
    const begin=Math.floor(start*rate),len=Math.floor(duration*rate);
    for(let i=0;i<len&&begin+i<out.length;i++) {
      const t=i/rate,u=i/len,p=2*Math.PI*freq*t;
      out[begin+i]+=volume*Math.min(1,t/.006)*Math.pow(1-u,1.8)*(Math.sin(p)+.16*Math.sin(2*p));
    }
  }
  function water(start,duration,volume,cutoff=1100) {
    let low=0;
    const begin=Math.floor(start*rate),len=Math.floor(duration*rate),a=1-Math.exp(-2*Math.PI*cutoff/rate);
    for(let i=0;i<len&&begin+i<out.length;i++) {
      const u=i/len;
      low+=a*(random()-low);
      out[begin+i]+=low*volume*Math.sin(Math.PI*u)**1.3;
    }
  }
  switch(name) {
    case 'shoot': drop(0,.085,1050,430,.20); break;
    case 'hit': drop(0,.07,510,170,.17); water(0,.045,.10,2100); break;
    case 'kill': drop(0,.095,480,930,.24); drop(.055,.12,1380,650,.17); break;
    case 'boom':
      drop(0,.24,180,68,.40);water(.015,.60,.65,1400);
      for(let i=0;i<7;i++)drop(.08+i*.066,.12,480+i*72,160+i*32,.12);
      break;
    case 'coin': note(0,.13,1046.5,.19);note(.085,.16,1567.98,.14);break;
    case 'hurt': drop(0,.20,290,125,.30);drop(.08,.18,220,90,.17);break;
    case 'win': [523.25,659.25,783.99,1046.5].forEach((f,i)=>note(i*.115,.27,f,.19));break;
    case 'warn': [392,523.25,392,587.33].forEach((f,i)=>{note(i*.15,.13,f,.22);drop(i*.15,.09,130,80,.11);});break;
    case 'rain': for(let i=0;i<8;i++)drop(i*.043,.13,950+i*83,390+i*29,.13);break;
    case 'bolt': water(0,.10,.47,4200);drop(0,.14,1500,130,.21);note(.10,.23,783.99,.15);break;
    case 'freeze': [1046.5,1567.98,2093,1318.51].forEach((f,i)=>note(i*.065,.32,f,.13));water(.025,.38,.10,3200);break;
    case 'heal': [523.25,659.25,783.99].forEach((f,i)=>{note(i*.13,.35,f,.16);drop(i*.13,.12,600,1100,.07);});break;
    case 'boss':
      water(0,.75,.5,1100);drop(0,.34,210,70,.33);
      [523.25,659.25,783.99,1046.5].forEach((f,i)=>note(.32+i*.13,.34,f,.19));break;
  }
  // Fixed headroom preserves the intended loudness hierarchy; no per-file normalization.
  for(let i=0;i<out.length;i++) out[i]=Math.tanh(out[i]*1.15)*.78;
  return out;
}

export class SoundKit {
  constructor(settings={}) {
    this.ctx=null;this.soundOn=settings.soundOn!==false;this.vibrationOn=settings.vibrationOn!==false;
    this.buffers=new Map();this.last=new Map();this.voices=new Set();this.disposed=false;
    this.files=new Map();this.loading=false; // 디코드된 음원. 아직 안 끝났으면 합성음으로 재생된다.
  }
  // 음원을 디코드해 올린다. 비동기라 끝나기 전에는 renderSound() 합성음이 대신 나간다.
  async loadFiles(){
    if(this.loading||!this.ctx||this.disposed)return;this.loading=true;
    for(const [p,url] of Object.entries(SFX)){
      const name=p.split('/').pop().replace(/\.\w+$/,'');
      try{
        const buf=await (await fetch(url)).arrayBuffer();
        const audio=await this.ctx.decodeAudioData(buf);
        if(this.disposed)return;
        this.files.set(name,audio);
      }catch{/* 못 읽으면 그 소리만 합성음으로 남는다 */}
    }
  }
  unlock() {
    if(!this.soundOn||this.disposed)return;
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)return;
    if(!this.ctx) {
      try {
        this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.7;
        this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-12;this.limiter.knee.value=12;
        this.limiter.ratio.value=8;this.limiter.attack.value=.003;this.limiter.release.value=.12;
        this.master.connect(this.limiter).connect(this.ctx.destination);
      } catch {this.ctx=null;return;}
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    this.loadFiles();
  }
  play(name, gap=.055, priority=false) {
    if(!this.soundOn||this.disposed)return;
    this.unlock();if(!this.ctx||this.ctx.state!=='running')return;
    const now=this.ctx.currentTime;
    if(now-(this.last.get(name)??-Infinity)<gap)return;
    if(this.voices.size>=12) {
      if(!priority)return;
      const oldest=this.voices.values().next().value;
      oldest.stop();this.voices.delete(oldest);
    }
    this.last.set(name,now);
    let buffer=this.files.get(name),rate=1;
    if(buffer) {
      if(VARY.has(name))rate=.94+Math.random()*.12; // 같은 파일이라도 매번 조금 다르게 들리도록
    } else {
      const variant=VARY.has(name)?Math.floor(Math.random()*3):1,key=`${name}:${variant}`;
      buffer=this.buffers.get(key);
      if(!buffer) {
        const data=renderSound(name,this.ctx.sampleRate,variant);
        buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(key,buffer);
      }
    }
    const voice=this.ctx.createBufferSource();voice.buffer=buffer;voice.playbackRate.value=rate;voice.connect(this.master);
    this.voices.add(voice);voice.onended=()=>{this.voices.delete(voice);voice.disconnect();};voice.start();
  }
  shoot(){this.play('shoot',.065)}
  hit(){this.play('hit',.075)}
  kill(boss=false){this.play(boss?'boss':'kill',boss?.5:.065,boss)}
  boom(){this.play('boom',.15,true)}
  coin(){this.play('coin',.10)}
  hurt(){this.play('hurt',.20,true)}
  win(){this.play('win',.40,true)}
  warn(){this.play('warn',.65,true)}
  special(id){if(['rain','bolt','freeze','heal'].includes(id))this.play(id,.20,true)}
  vibrate(pattern){if(this.vibrationOn)globalThis.navigator?.vibrate?.(pattern)}
  destroy(){
    this.disposed=true;
    for(const voice of this.voices){voice.onended=null;try{voice.stop()}catch{}voice.disconnect()}
    this.voices.clear();this.buffers.clear();this.files.clear();this.last.clear();
    if(this.ctx&&this.ctx.state!=='closed')this.ctx.close().catch(()=>{});
  }
}
