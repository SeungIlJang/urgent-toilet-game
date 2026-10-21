import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import './style.css';
import { waveSpawnCount, waveSpawnGap, enemyHpMul, enemySpeedMul, bossKind, SPAWN_TOP, RUSH_FROM, RUSH_MUL,
  DOUBLE_FROM, DOUBLE_PCT, TRIPLE_FROM, TRIPLE_PCT } from './balance.js';

// AdMob. 실광고는 `VITE_REAL_ADS=1` 로 빌드했을 때만 켜진다(= npm run build:release).
// 손으로 플래그를 뒤집던 방식은 개발 중 실광고를 눌러 계정이 정지될 위험이 있어 빌드 환경으로 옮겼다.
// `import.meta.env.VITE_REAL_ADS` 는 vite 가 빌드 때 리터럴로 치환한다.
// optional chaining(`import.meta.env?.`)을 쓰면 치환이 안 되고 빈 객체가 남아 항상 테스트 광고가 되니 주의.
const USE_TEST_ADS = import.meta.env.VITE_REAL_ADS !== '1';
// 빌드 산출물이 어느 모드로 굳었는지 확인용. scripts/sync-www.mjs 가 이 문자열을 검사한다.
const AD_MODE = USE_TEST_ADS ? 'ad-mode:test' : 'ad-mode:real';
if (typeof window !== 'undefined') window.__AD_MODE__ = AD_MODE;
const ADMOB_REWARD_ID = 'ca-app-pub-9017259597860535/5418809176';
const ADMOB_TEST_REWARD_ID = 'ca-app-pub-3940256099942544/5224354917';
// 전면광고(게임오버 다시도전 3회당 1번).
const ADMOB_INTER_ID = 'ca-app-pub-9017259597860535/6246963624';
const ADMOB_TEST_INTER_ID = 'ca-app-pub-3940256099942544/1033173712';
// 하단 배너. 시작·게임오버 화면에서만 띄우고 플레이 중에는 내린다(하단 조작 버튼을 가리므로).
const ADMOB_BANNER_ID = 'ca-app-pub-9017259597860535/3698103162';
const ADMOB_TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
import { RunDiagnostics } from './run-diagnostics.js';

// Never register a service worker. In an APK, purge leftovers from older builds.
if (Capacitor.isNativePlatform()) {
  navigator.serviceWorker?.getRegistrations?.().then(items => items.forEach(item => item.unregister()));
  globalThis.caches?.keys?.().then(keys => Promise.all(keys.map(key => caches.delete(key))));
}

const W = 540, H = 960, BASE_LINE = 812, SAVE_KEY = 'urgentDefenseV1';
// 버전은 package.json 하나만 고치면 되도록 vite define(__APP_VERSION__)으로 주입한다.
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { return {}; } };
const save = value => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(value)); } catch {} };
const todayKey = () => new Date().toLocaleDateString('sv-SE');

// Hero skins: mint/sunset/night unlock via missions; the rest are bought with coins.
const LOOKS = {
  classic: { name: '기본 수비대', tint: 0xffffff, perk: '', desc: '균형 잡힌 기본형' },
  mint: { name: '민트 사수', tint: 0xb9ffe2, perk: 'rate', desc: '연사 속도 +' },
  sunset: { name: '노을 포병', tint: 0xffc0a8, perk: 'power', desc: '공격력 +' },
  night: { name: '밤하늘 요새', tint: 0xbcc8ff, perk: 'hp', desc: '기지 내구도 +' },
  speedster: { name: '기관총 사수', tint: 0xfff07a, perk: 'rate2', desc: '연사 대폭 +', gem: 120 },
  camel: { name: '폭격기', tint: 0xf2c48d, perk: 'bomb', desc: '폭탄 위력·범위 +', gem: 220 },
  golden: { name: '황금 수비대', tint: 0xffd24a, perk: 'gold', desc: '코인 획득 2배', gem: 400 },
};
const MISSIONS = [
  { id: 'kills', label: '적 60 처치', target: 60, reward: 'mint', value: s => s.kills },
  { id: 'wave', label: '웨이브 10 도달', target: 10, reward: 'sunset', value: s => s.wave },
  { id: 'bomb', label: '폭탄 25회 사용', target: 25, reward: 'night', value: s => s.bombsUsed },
];
const UPGRADES = [
  { id: 'power', name: '공격력', desc: '자동 발사 데미지 +', base: 45, max: 6 },
  { id: 'rate', name: '연사 속도', desc: '더 빠르게 발사', base: 55, max: 6 },
  { id: 'bomb', name: '폭탄 강화', desc: '폭탄 위력·범위 +', base: 60, max: 6 },
  { id: 'basehp', name: '기지 내구도', desc: '화장실 HP +', base: 70, max: 6 },
  { id: 'coin', name: '코인 부스트', desc: '코인 획득량 +', base: 70, max: 5 },
];
// 영구 강화는 💎보석으로 산다. 보석은 판이 끝나도 남으므로 코인보다 훨씬 천천히 들어오고, 가격 곡선도 완만하다.
const upgCost = (u, lvl) => Math.round(u.base * 0.25 * (lvl + 1) * (1 + lvl * 0.25));
// In-run promotion (전직): pick one at Lv5, its advancement at Lv10.
const JOBS1 = [
  { id: 'warrior', name: '전사', desc: '변기가 투구를 쓴다! 공격력 대폭↑ · 기지 최대체력↑' },
  { id: 'mage', name: '법사', desc: '변기가 마법사 모자를! 모든 탄이 착탄 시 폭발(범위)' },
  { id: 'archer', name: '궁수', desc: '변기가 두건을 두른다! 연사 대폭↑ · 관통(적 2명)' },
];
const JOBS2 = {
  warrior: { id: 'berserker', name: '광전사', desc: '공격력 폭증 · 처치할 때마다 기지 회복' },
  mage: { id: 'archmage', name: '대마법사', desc: '폭발 범위·위력 폭증' },
  archer: { id: 'sniper', name: '명사수', desc: '모든 적 관통 + 초고속 연사' },
};
// Level-up upgrade cards: pick 1 of 3 on each non-job level. Stacking, run-scoped.
// 희귀도에 따라 뽑힐 확률과 테두리 색이 달라진다. 전설은 판을 뒤집는 카드만 넣는다.
const RARITY = {
  common: { name:'일반', color:0x59c2ff, hex:'#59c2ff', weight:60 },
  rare:   { name:'희귀', color:0xb06bff, hex:'#b06bff', weight:30 },
  epic:   { name:'전설', color:0xffd24a, hex:'#ffd24a', weight:10 },
};
const UPCARDS = [
  { id:'dmg',    r:'common', icon:'🔥', name:'화력 강화', desc:'공격력 +30%',        apply:s=>{s.runDmg*=1.30} },
  { id:'fire',   r:'common', icon:'⚡', name:'속사',      desc:'연사 속도 +20%',     apply:s=>{s.runFire*=0.83} },
  { id:'heal',   r:'common', icon:'❤️', name:'기지 수리', desc:'기지 HP 50% 회복',   apply:s=>{s.baseHp=Math.min(s.baseMax,s.baseHp+Math.round(s.baseMax*0.5))} },
  { id:'coin',   r:'common', icon:'🪙', name:'황금 손',   desc:'코인 획득 +40%',     apply:s=>{s.runCoinMul*=1.4} },
  { id:'guard',  r:'common', icon:'🛡️', name:'방벽 보강', desc:'기지 최대 HP +25%',  apply:s=>{const add=Math.round(s.baseMax*0.25);s.baseMax+=add;s.baseHp+=add} },
  { id:'multi',  r:'rare',   icon:'➕', name:'멀티샷',    desc:'탄환 +1발',          apply:s=>{s.runBolts+=1} },
  { id:'pierce', r:'rare',   icon:'🎯', name:'관통탄',    desc:'적 관통 +1',         apply:s=>{s.runPierce+=1} },
  { id:'big',    r:'rare',   icon:'🔵', name:'대구경탄',  desc:'탄 크기↑ · 공격력 +12%', apply:s=>{s.runBoltSize+=3;s.runDmg*=1.12} },
  { id:'rapid',  r:'rare',   icon:'🌀', name:'연사 개조', desc:'연사 속도 +35%',     apply:s=>{s.runFire*=0.74} },
  { id:'explode',r:'epic',   icon:'💥', name:'폭발탄',    desc:'모든 탄이 착탄 시 폭발!', once:true, apply:s=>{s.runExplode=true} },
  { id:'over',   r:'epic',   icon:'☄️', name:'과부하',    desc:'공격력 +60%',        apply:s=>{s.runDmg*=1.60} },
  { id:'volley', r:'epic',   icon:'🎆', name:'일제 사격', desc:'탄환 +2발',          apply:s=>{s.runBolts+=2} },
];
// Left-slot special items. One is randomly assigned each run (right slot is always the bomb).
const SPECIALS = [
  { id:'rain',   name:'총알비', icon:'🌧️', cd:6000,  color:0x59c2ff },
  { id:'bolt',   name:'번개',   icon:'⚡',  cd:8000,  color:0xffe14d },
  { id:'freeze', name:'얼리기', icon:'❄️', cd:9000,  color:0x7fdfff },
  { id:'heal',   name:'회복',   icon:'❤️', cd:12000, color:0xff6b8a },
];
// Purchasable weapons change the firing pattern/feel. basic is free/default.
// gem = 영구 해금 가격(💎), up = 판 안에서만 유지되는 강화의 기준 가격(🪙).
const WEAPONS = [
  { id: 'basic', name: '기본 볼트', desc: '균형 잡힌 단발', gem: 0, up: 130, bolts: 1, spread: 0, pierce: 1, dmg: 1, fire: 1, color: 0xfff6cf, size: 8, upDesc: '데미지+ · 연사+' },
  { id: 'shotgun', name: '산탄총', desc: '3발 부채꼴 발사', gem: 90, up: 235, bolts: 3, spread: 0.22, pierce: 1, dmg: 0.75, fire: 1.2, color: 0xffb347, size: 7, upDesc: '데미지+ · 3Lv마다 탄+1' },
  { id: 'rapid', name: '기관총', desc: '작은 탄 초고속 연사', gem: 160, up: 323, bolts: 1, spread: 0, pierce: 1, dmg: 0.7, fire: 0.5, color: 0xff6b6b, size: 6, upDesc: '데미지+ · 연사 대폭+' },
  { id: 'laser', name: '관통 레이저', desc: '적 4명 관통 + 강력', gem: 250, up: 428, bolts: 1, spread: 0, pierce: 4, dmg: 1.6, fire: 1.25, color: 0x59c2ff, size: 11, upDesc: '데미지+ · 2Lv마다 관통+1' },
  { id: 'grenade', name: '유탄 발사기', desc: '착탄 시 소폭발(범위)', gem: 330, up: 515, bolts: 1, spread: 0, pierce: 1, dmg: 1.15, fire: 1.5, color: 0x9c5cff, size: 12, explode: true, upDesc: '데미지+ · 폭발 범위+' },
];
const WEP_MAX = 8; // per-weapon upgrade cap; each level = +12% that weapon's damage
const wepUpCost = (wp, lvl) => Math.round(wp.up * (lvl + 1) * (1 + lvl * 0.3));
/** 한 판을 마쳤을 때 받는 💎. 깊이 들어갈수록 영구 성장이 빨라진다. */
const gemPayout = (wave, score) => 5 + wave * 3 + Math.floor(score / 1200);
// Backgrounds shift by wave tier for a sense of escalation.
const THEMES = [
  { sky: 0xa9e8f3, ground: 0x577a45, edge: 0x31572c },
  { sky: 0xffd3a5, ground: 0x8a5a3c, edge: 0x5c3a26 },
  { sky: 0xb39ddb, ground: 0x4a3c6b, edge: 0x2f2647 },
  { sky: 0x2c3e70, ground: 0x22304f, edge: 0x121a30 },
  { sky: 0x0b1026, ground: 0x0e1430, edge: 0x060a1c },
];
// Enemy archetypes reuse the props spritesheet (0 cone,1 barrier,2 puddle,4 coffee).
const ENEMIES = {
  germ:  { tex:'e_germ',  tint:0x7ad64a, scale:.469, r:25, hp:3,  speed:58,  dmg:7,  reward:2 },
  spore: { tex:'e_spore', tint:0x4dd2c0, scale:.344, r:19, hp:5,  speed:92,  dmg:8,  reward:3, weave:2.6, weavePer:150 },
  fly:   { tex:'e_fly',   tint:0xff4d4d, scale:.406, r:22, hp:4,  speed:120, dmg:6,  reward:3, weave:1.4, weavePer:220, noSpin:true },
  paper: { tex:'e_paper', tint:0xdfe6ee, scale:.563, r:30, hp:15, speed:40,  dmg:16, reward:5, noSpin:true },
  fart:  { tex:'e_fart',  tint:0x9fce6a, scale:.5,   r:27, hp:6,  speed:46,  dmg:9,  reward:3, weave:3.0, weavePer:260, noSpin:true },
  slime: { tex:'e_slime', tint:0xb06bff, scale:.453, r:25, hp:9,  speed:48,  dmg:12, reward:5, split:true },
  roach: { tex:'e_roach', tint:0x8a5a2c, scale:.641, r:35, hp:20, speed:30,  dmg:22, reward:8, noSpin:true },
  truck: { tex:'e_truck', tint:0x9c7a34, scale:.72,  r:40, hp:30, speed:22,  dmg:26, reward:12, noSpin:true },
  roll:    { tex:'e_roll',        tint:0xf0f2f6, scale:.453, r:25, hp:8,  speed:60,  dmg:9,  reward:3 },
  plunger: { tex:'e_plunger',     tint:0xc0392b, scale:.469, r:26, hp:10, speed:112, dmg:14, reward:4, noSpin:true },
  sink:    { tex:'e_sink',        tint:0xdfe6ee, scale:.688, r:38, hp:28, speed:26,  dmg:24, reward:11, noSpin:true },
  soap:    { tex:'e_soap',        tint:0x53c9b6, scale:.359, r:20, hp:5,  speed:100, dmg:8,  reward:3, weave:3.0, weavePer:200 },
  mosquito:{ tex:'e_mosquito',    tint:0xff4d4d, scale:.344, r:19, hp:4,  speed:138, dmg:7,  reward:3, weave:1.8, weavePer:170, noSpin:true },
  tissuer: { tex:'e_tissue_red',  tint:0xff5c6e, scale:.406, r:22, hp:6,  speed:116, dmg:9,  reward:3, noSpin:true },
  tissueb: { tex:'e_tissue_blue', tint:0x5c8cff, scale:.438, r:24, hp:16, speed:42,  dmg:12, reward:5, noSpin:true },
};

class SoundKit {
  constructor(settings) { this.ctx = null; this.soundOn = settings.soundOn !== false; this.vibrationOn = settings.vibrationOn !== false; }
  unlock() { if (!this.soundOn) return; this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume?.(); }
  tone(freq, duration=.09, type='sine', gain=.05, slide=0) { if (!this.soundOn) return; this.unlock(); if (!this.ctx) return; const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+duration); }
  shoot(){this.tone(680+Math.random()*180,.05,'square',.022,-160)} boom(){this.tone(95,.28,'sawtooth',.07,-45);this.tone(210,.12,'square',.03,-120)} kill(){this.tone(520,.06,'sine',.04,180);this.tone(880,.05,'triangle',.02,140)} coin(){this.tone(900,.06,'sine',.035,160)} hurt(){this.tone(130,.22,'sawtooth',.06,-60)} win(){[520,660,820].forEach((f,i)=>setTimeout(()=>this.tone(f,.16),i*90))} warn(){[880,620,880,620].forEach((f,i)=>setTimeout(()=>this.tone(f,.13,'square',.05),i*120))} vibrate(p){if(this.vibrationOn)navigator.vibrate?.(p)}
}

class GameScene extends Phaser.Scene {
  constructor(){super('urgent-defense')}
  preload(){/* 외부 에셋 없음: 모든 텍스처는 코드로 생성(OTA 단일 HTML) */}
  create(data={}) {
    this.settings=load();this.settings.unlocked||=['classic'];this.settings.selected||='classic';this.settings.upgrades||={};
    // 지갑 두 개: 💎보석은 영구(영구 강화·스킨·무기 해금), 🪙코인은 그 판에서만 쓰고 사라진다(무기 강화).
    // 예전엔 코인 하나로 둘 다 사서, 죽을 때마다 전부 0이 되고 출석 보상도 의미가 없었다.
    this.settings.gems=+this.settings.gems||0;
    if(this.settings.coins)
      { this.settings.gems+=Math.round(this.settings.coins*0.3);this.settings.coins=0 } // v1.0 저장분 이관
    this.upg={};for(const u of UPGRADES)this.upg[u.id]=Math.min(u.max,+this.settings.upgrades[u.id]||0); // 영구 강화 (보석으로 구매)
    if(this.settings.missionDay!==todayKey()){this.settings.missionDay=todayKey();this.settings.dailyProgress={kills:0,wave:0,bomb:0};this.settings.completed={};save(this.settings)}
    this.settings.dailyProgress||={kills:0,wave:0,bomb:0};this.settings.weaponsOwned||=['basic'];this.settings.weapon||='basic';this.reducedMotion=matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
    // Derived stats from permanent upgrades + hero perk + selected weapon.
    const perk=LOOKS[this.settings.selected]?.perk;
    this.settings.weaponLevels={}; // 무기 강화는 판 단위. 씬이 새로 뜰 때마다(=새 판) 0부터 시작한다.
    this.boltDmg=4+this.upg.power*3+(perk==='power'?4:0);
    this.perkRate=perk==='rate';this.perkRate2=perk==='rate2';
    this.jobFireMul=1;this.jobDmgMul=1;this.jobPierceMin=0;this.jobExplode=false;this.jobExplodeBig=false;this.jobHeal=false;
    // Arsenal: ONE selected weapon is equipped (settings.weapon). After death you re-pick one of your owned weapons.
    {const _o=this.settings.weaponsOwned;let _id=this.settings.weapon;if(!_o.includes(_id))_id=_o[0]||'basic';this.settings.weapon=_id;const wp=WEAPONS.find(w=>w.id===_id)||WEAPONS[0],lv=this.settings.weaponLevels[_id]||0;this.arsenal=[{wp,lv,dmgMul:wp.dmg*(1+lv*0.10),bolts:wp.bolts+(_id==='shotgun'?Math.floor(lv/3):0),pierce:wp.pierce+(_id==='laser'?Math.floor(lv/2):0),miniR:72+(_id==='grenade'?lv*10:0),fireFactor:wp.fire*((_id==='basic'||_id==='rapid')?(1-lv*0.04):1),lvlFireMul:1,lastFire:0}];}
    this.bombDmg=7+this.upg.bomb*3+(perk==='bomb'?4:0);this.bombR=118+this.upg.bomb*16+(perk==='bomb'?30:0);this.bombCd=2500;
    this.coinMult=1+this.upg.coin*0.25+(perk==='gold'?1:0);
    this.baseMax=100+this.upg.basehp*30+(perk==='hp'?40:0);
    Object.assign(this,{state:'ready',score:0,coins:0,kills:0,bombsUsed:0,wave:0,baseHp:this.baseMax,toSpawn:0,spawnGap:900,lastSpawn:0,lastFire:0,bombReadyAt:0,specialReadyAt:0,freezeUntil:0,streak:0,streakAt:0,_lastWarn:0,level:1,xp:0,xpNext:10,job:'',job2:'',_settled:false,_settleResult:null,revived:false,runDmg:1,runFire:1,runBolts:0,runPierce:0,runExplode:false,runBoltSize:0,runCoinMul:1,upsTaken:[],upCounts:{},rerolls:1});
    this.enemies=[];this.bolts=[];
    this.bestScore=+this.settings.bestScore||0;this.bestWave=+this.settings.bestWave||0;this.sound=new SoundKit(this.settings);
    this.createWorld();this.createHero();this.createHud();this.createInput();this.showStart();this.initAdMob();
    this.diagnostics=new RunDiagnostics();window.__URGENT_DIAGNOSTICS__=this.diagnostics.report;
    this.onRuntimeError=e=>this.diagnostics.error(e?.error||e?.reason||e);
    window.addEventListener('error',this.onRuntimeError);window.addEventListener('unhandledrejection',this.onRuntimeError);
    this.events.once('shutdown',()=>{window.removeEventListener('error',this.onRuntimeError);window.removeEventListener('unhandledrejection',this.onRuntimeError)});
    if(data.autoStart)this.beginPlay();
  }
  makeTexFx(){
    if(!this.textures.exists('vgrad')){const cw=8,ch=256,t=this.textures.createCanvas('vgrad',cw,ch),ctx=t.getContext(),g=ctx.createLinearGradient(0,0,0,ch);g.addColorStop(0,'rgba(8,18,38,0.42)');g.addColorStop(.45,'rgba(8,18,38,0.0)');g.addColorStop(1,'rgba(0,0,0,0.30)');ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);t.refresh()}
    // 타이틀 제목 뒤 조명용 라디얼 글로우. 가산 합성으로 깔아야 어두운 배경에서 탁해지지 않는다.
    if(!this.textures.exists('glow')){const s=256,t=this.textures.createCanvas('glow',s,s),ctx=t.getContext(),g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,0.90)');g.addColorStop(.5,'rgba(255,255,255,0.26)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,s,s);t.refresh()}
    if(!this.textures.exists('btile')){const s=64,t=this.textures.createCanvas('btile',s,s),ctx=t.getContext();ctx.fillStyle='rgba(255,255,255,0.92)';ctx.fillRect(3,3,s-6,s-6);ctx.strokeStyle='rgba(90,120,150,0.95)';ctx.lineWidth=4;ctx.strokeRect(0,0,s,s);t.refresh()}
  }
  makeEnemyTextures(){
    if(this.textures.exists('e_germ'))return;
    const S=128,C=64,PI=Math.PI,mk=(key,draw,sz)=>{const g=this.add.graphics();draw(g);g.generateTexture(key,sz||S,sz||S);g.destroy()};
    const eyes=(g,cx,cy,sp,er,pc)=>{g.fillStyle(0xffffff,1);g.fillCircle(cx-sp,cy,er);g.fillCircle(cx+sp,cy,er);g.fillStyle(pc||0x201409,1);g.fillCircle(cx-sp,cy+er*.2,er*.5);g.fillCircle(cx+sp,cy+er*.2,er*.5);g.fillStyle(0xffffff,.9);g.fillCircle(cx-sp-er*.3,cy-er*.3,er*.18);g.fillCircle(cx+sp-er*.3,cy-er*.3,er*.18)};
    // germ — spiky green ball (angry)
    mk('e_germ',g=>{g.fillStyle(0x54ad2c,1);for(let i=0;i<11;i++){const a=i/11*PI*2;g.fillTriangle(C+Math.cos(a)*58,C+Math.sin(a)*58,C+Math.cos(a-.16)*38,C+Math.sin(a-.16)*38,C+Math.cos(a+.16)*38,C+Math.sin(a+.16)*38)}g.fillStyle(0x7ad64a,1);g.fillCircle(C,C,40);g.fillStyle(0x63c238,1);g.fillCircle(C,C-4,34);eyes(g,C,60,15,11);g.lineStyle(4,0x1a2a10,1);g.beginPath();g.arc(C,86,10,1.15*PI,1.85*PI,true);g.strokePath()});
    // fly — dark body + wings + red eyes
    mk('e_fly',g=>{g.fillStyle(0xbfe0ff,.5);g.fillEllipse(C-26,C-6,44,26);g.fillEllipse(C+26,C-6,44,26);g.fillStyle(0x33343f,1);g.fillEllipse(C,C+6,58,64);g.fillStyle(0x222330,1);g.fillEllipse(C,C+22,44,34);g.fillStyle(0xff4d4d,1);g.fillCircle(C-15,C-8,14);g.fillCircle(C+15,C-8,14);g.fillStyle(0xffffff,.85);g.fillCircle(C-19,C-12,4);g.fillCircle(C+11,C-12,4)});
    // paper — crumpled white wad
    mk('e_paper',g=>{g.fillStyle(0xe9edf2,1);g.fillCircle(C-16,C+6,30);g.fillCircle(C+18,C-2,30);g.fillCircle(C,C+18,28);g.fillCircle(C+2,C-14,26);g.fillStyle(0xffffff,1);g.fillCircle(C,C,30);g.lineStyle(3,0xc3ccd6,.9);g.lineBetween(C-24,C-6,C-2,C+8);g.lineBetween(C+6,C-16,C+20,C+2);g.lineBetween(C-6,C+18,C+14,C+20);eyes(g,C,C-2,14,9)});
    // fart — green gas cloud
    mk('e_fart',g=>{g.fillStyle(0x9fce6a,.95);g.fillCircle(C-22,C+4,24);g.fillCircle(C+22,C+4,24);g.fillCircle(C-6,C-16,24);g.fillCircle(C+14,C-14,22);g.fillCircle(C,C+14,26);g.fillStyle(0xb6e087,.95);g.fillCircle(C,C,24);g.fillStyle(0x2a3a18,1);g.fillEllipse(C-14,C,8,4);g.fillEllipse(C+14,C,8,4);g.lineStyle(3,0x2a3a18,1);g.beginPath();g.arc(C,C+10,8,.15*PI,.85*PI,false);g.strokePath()});
    // slime — purple droplet
    mk('e_slime',g=>{g.fillStyle(0x9b4dff,1);g.fillTriangle(C,C-40,C-26,C-2,C+26,C-2);g.fillCircle(C,C+8,36);g.fillStyle(0xb06bff,1);g.fillCircle(C,C+8,30);g.fillStyle(0xffffff,.35);g.fillEllipse(C-12,C-2,14,20);eyes(g,C,C+8,15,12);g.fillStyle(0x2a1440,1);g.fillEllipse(C,C+30,16,8)});
    // roach — brown beetle with legs
    mk('e_roach',g=>{g.lineStyle(5,0x3a2412,1);for(const s of[-1,1]){g.lineBetween(C+s*22,C-6,C+s*46,C-20);g.lineBetween(C+s*24,C+4,C+s*50,C+2);g.lineBetween(C+s*22,C+16,C+s*46,C+26)}g.fillStyle(0x6e451f,1);g.fillEllipse(C,C+4,74,84);g.fillStyle(0x8a5a2c,1);g.fillEllipse(C,C-6,66,60);g.fillStyle(0x5b3818,1);g.fillCircle(C,C-30,20);g.lineStyle(4,0x3a2412,1);g.lineBetween(C-8,C-46,C-16,C-58);g.lineBetween(C+8,C-46,C+16,C-58);eyes(g,C,C-30,9,7)});
    // spore — teal spiky diamond (fast)
    mk('e_spore',g=>{g.fillStyle(0x2fae9c,1);for(let i=0;i<7;i++){const a=i/7*PI*2;g.fillTriangle(C+Math.cos(a)*50,C+Math.sin(a)*50,C+Math.cos(a-.2)*26,C+Math.sin(a-.2)*26,C+Math.cos(a+.2)*26,C+Math.sin(a+.2)*26)}g.fillStyle(0x4dd2c0,1);g.fillCircle(C,C,28);eyes(g,C,C,11,9)});
    // 정화조 차 — cute septic tank truck (slow, tanky)
    mk('e_truck',g=>{g.fillStyle(0x1c1c22,1);g.fillCircle(C-42,104,15);g.fillCircle(C+42,104,15);g.fillStyle(0x555562,1);g.fillCircle(C-42,104,6);g.fillCircle(C+42,104,6);g.fillStyle(0x9c7a34,1);g.fillRoundedRect(C-54,40,108,60,18);g.fillStyle(0xb8933f,1);g.fillRoundedRect(C-54,40,108,22,12);g.fillStyle(0xffd24a,1);g.fillRect(C-54,74,108,8);g.fillStyle(0x3a2a12,1);for(let i=0;i<6;i++)g.fillRect(C-50+i*20,74,8,8);g.fillStyle(0x4f95cf,1);g.fillRoundedRect(C+16,8,42,42,10);g.fillStyle(0xcdeeff,1);g.fillRoundedRect(C+22,14,30,16,6);g.fillStyle(0x555562,1);g.fillRect(C-58,28,7,18);eyes(g,C-8,60,15,11);g.lineStyle(4,0x2a1c0c,1);g.beginPath();g.arc(C-8,80,10,.15*PI,.85*PI,false);g.strokePath();g.fillStyle(0x6b4226,1);g.fillCircle(C+30,63,9);g.fillStyle(0x8a5a34,1);g.fillCircle(C+30,60,6)});
    // 두루마리 휴지
    mk('e_roll',g=>{g.fillStyle(0xf0f2f6,1);g.fillRoundedRect(C-42,C-30,84,72,16);g.fillStyle(0xffffff,1);g.fillEllipse(C,C-30,84,26);g.fillStyle(0xd7dbe3,1);g.fillEllipse(C,C-30,42,12);g.fillStyle(0x9aa2b1,1);g.fillEllipse(C,C-30,16,6);g.fillStyle(0xffffff,1);g.fillRect(C-16,C+40,32,26);g.lineStyle(2,0xd0d5de,1);g.lineBetween(C-16,C+52,C+16,C+52);eyes(g,C,C+8,15,10);g.lineStyle(4,0x2a2f3a,1);g.beginPath();g.arc(C,C+26,9,.18*PI,.82*PI,false);g.strokePath()});
    // 뚜러뻥
    mk('e_plunger',g=>{g.fillStyle(0x6e451f,1);g.fillRect(C-5,C-52,10,48);g.fillStyle(0xa8712f,1);g.fillCircle(C,C-52,7);g.fillStyle(0xc0392b,1);g.fillEllipse(C,C+26,74,30);g.fillStyle(0xd0442f,1);g.fillRoundedRect(C-34,C-6,68,34,12);g.fillStyle(0x9c2b1e,1);g.fillEllipse(C,C+28,60,16);eyes(g,C,C+8,14,10)});
    // 세면대
    mk('e_sink',g=>{g.fillStyle(0xbfc6d0,1);g.fillRect(C-4,C-46,8,26);g.fillRect(C-4,C-46,22,7);g.fillStyle(0xffffff,1);g.fillRect(C-16,C+30,32,30);g.fillStyle(0xffffff,1);g.fillRoundedRect(C-52,C-8,104,46,16);g.fillStyle(0xeef2f7,1);g.fillEllipse(C,C-8,100,30);g.fillStyle(0xcfe6f2,1);g.fillEllipse(C,C-6,74,20);eyes(g,C,C+2,15,10);g.fillStyle(0xff9db0,.55);g.fillCircle(C-40,C+14,10);g.fillCircle(C+40,C+14,10)});
    // 비누
    mk('e_soap',g=>{g.fillStyle(0x53c9b6,1);g.fillRoundedRect(C-36,C-24,72,48,20);g.fillStyle(0x7fe0d0,1);g.fillRoundedRect(C-36,C-24,72,18,14);g.fillStyle(0xffffff,.85);g.fillCircle(C-46,C-18,6);g.fillCircle(C+40,C+20,5);g.fillCircle(C+48,C+2,4);eyes(g,C,C,13,9);g.lineStyle(3,0x123f39,1);g.beginPath();g.arc(C,C+12,8,.2*PI,.8*PI,false);g.strokePath()});
    // 모기
    mk('e_mosquito',g=>{g.fillStyle(0xbfe0ff,.45);g.fillEllipse(C-20,C-8,40,22);g.fillEllipse(C+20,C-8,40,22);g.fillStyle(0x3a3f4a,1);g.fillEllipse(C,C+4,26,52);g.fillStyle(0x2a2e37,1);g.fillEllipse(C,C+24,16,26);g.lineStyle(3,0x2a2e37,1);g.lineBetween(C,C+40,C,C+58);for(const s of[-1,1]){g.lineBetween(C+s*8,C+6,C+s*24,C+18);g.lineBetween(C+s*8,C+14,C+s*24,C+30)}g.fillStyle(0xff4d4d,1);g.fillCircle(C-9,C-16,10);g.fillCircle(C+9,C-16,10);g.fillStyle(0xffffff,.85);g.fillCircle(C-12,C-19,3);g.fillCircle(C+6,C-19,3)});
    // 빨간 휴지
    mk('e_tissue_red',g=>{g.fillStyle(0xff5c6e,1);g.fillRoundedRect(C-34,C-28,68,58,10);g.fillStyle(0xff8090,1);g.fillTriangle(C-34,C-28,C,C-46,C+34,C-28);g.lineStyle(3,0xd83a4d,1);g.lineBetween(C-20,C-10,C-20,C+22);g.lineBetween(C+2,C-14,C+2,C+22);g.lineBetween(C+22,C-10,C+22,C+22);eyes(g,C,C+2,14,10);g.lineStyle(4,0x7a1420,1);g.beginPath();g.arc(C,C+20,8,.15*PI,.85*PI,false);g.strokePath()});
    // 파란 휴지
    mk('e_tissue_blue',g=>{g.fillStyle(0x5c8cff,1);g.fillRoundedRect(C-34,C-28,68,58,10);g.fillStyle(0x8ab0ff,1);g.fillTriangle(C-34,C-28,C,C-46,C+34,C-28);g.lineStyle(3,0x3a5fd8,1);g.lineBetween(C-20,C-10,C-20,C+22);g.lineBetween(C+2,C-14,C+2,C+22);g.lineBetween(C+22,C-10,C+22,C+22);eyes(g,C,C+2,14,10);g.lineStyle(4,0x14265a,1);g.beginPath();g.arc(C,C+20,8,.15*PI,.85*PI,false);g.strokePath()});
    // bosses
    const BC=110,B=220;
    mk('e_boss',g=>{g.fillStyle(0xb01f7a,1);for(let i=0;i<14;i++){const a=i/14*PI*2;g.fillTriangle(BC+Math.cos(a)*100,BC+Math.sin(a)*100,BC+Math.cos(a-.13)*70,BC+Math.sin(a-.13)*70,BC+Math.cos(a+.13)*70,BC+Math.sin(a+.13)*70)}g.fillStyle(0xe23bb0,1);g.fillCircle(BC,BC,74);g.fillStyle(0xc72e97,1);g.fillCircle(BC,BC-6,64);g.fillStyle(0xffd24a,1);g.fillTriangle(BC-46,BC-58,BC-30,BC-92,BC-14,BC-58);g.fillTriangle(BC-16,BC-58,BC,BC-100,BC+16,BC-58);g.fillTriangle(BC+14,BC-58,BC+30,BC-92,BC+46,BC-58);g.fillRect(BC-48,BC-62,96,14);eyes(g,BC,BC-4,28,20,0x3a0a28);g.lineStyle(6,0x3a0a28,1);g.beginPath();g.arc(BC,BC+40,20,1.12*PI,1.88*PI,true);g.strokePath();g.fillStyle(0xffffff,1);g.fillTriangle(BC-12,BC+30,BC-4,BC+30,BC-8,BC+44);g.fillTriangle(BC+12,BC+30,BC+4,BC+30,BC+8,BC+44)},B);
    mk('e_bossbig',g=>{g.fillStyle(0x4a138f,1);for(let i=0;i<16;i++){const a=i/16*PI*2;g.fillTriangle(BC+Math.cos(a)*104,BC+Math.sin(a)*104,BC+Math.cos(a-.12)*72,BC+Math.sin(a-.12)*72,BC+Math.cos(a+.12)*72,BC+Math.sin(a+.12)*72)}g.fillStyle(0x7a1fff,1);g.fillCircle(BC,BC,78);g.fillStyle(0x611acc,1);g.fillCircle(BC,BC-6,66);g.fillStyle(0xffd24a,1);g.fillTriangle(BC-52,BC-60,BC-34,BC-100,BC-16,BC-60);g.fillTriangle(BC-18,BC-60,BC,BC-108,BC+18,BC-60);g.fillTriangle(BC+16,BC-60,BC+34,BC-100,BC+52,BC-60);g.fillRect(BC-54,BC-64,108,15);g.fillStyle(0xffffff,1);g.fillCircle(BC-30,BC,24);g.fillCircle(BC+30,BC,24);g.fillStyle(0xff3b3b,1);g.fillCircle(BC-28,BC+4,12);g.fillCircle(BC+32,BC+4,12);g.lineStyle(7,0x1a0530,1);g.lineBetween(BC-50,BC-24,BC-14,BC-12);g.lineBetween(BC+50,BC-24,BC+14,BC-12);g.beginPath();g.arc(BC,BC+46,24,1.1*PI,1.9*PI,true);g.strokePath();g.fillStyle(0xffffff,1);g.fillTriangle(BC-14,BC+34,BC-4,BC+34,BC-9,BC+50);g.fillTriangle(BC+14,BC+34,BC+4,BC+34,BC+9,BC+50)},B);
    // 웅장한 정화조 (최상위 보스, 10웨이브마다)
    mk('e_boss_septic',g=>{
      g.fillStyle(0x1c1c22,1);g.fillCircle(BC-72,192,26);g.fillCircle(BC+72,192,26);g.fillStyle(0x555562,1);g.fillCircle(BC-72,192,11);g.fillCircle(BC+72,192,11);
      g.fillStyle(0x7a5a26,1);g.fillRoundedRect(BC-98,72,196,122,28);
      g.fillStyle(0x9c7a34,1);g.fillRoundedRect(BC-98,72,196,42,22);
      g.fillStyle(0xffd24a,1);g.fillRect(BC-98,120,196,14);g.fillRect(BC-98,154,196,8);
      g.fillStyle(0x3a2a12,1);for(let i=0;i<10;i++)g.fillRect(BC-94+i*20,120,10,14);
      g.fillStyle(0xbfa04a,1);for(let i=0;i<6;i++)g.fillCircle(BC-80+i*32,84,4);
      g.fillStyle(0xffd24a,1);g.fillTriangle(BC-48,68,BC-31,24,BC-14,68);g.fillTriangle(BC-17,68,BC,14,BC+17,68);g.fillTriangle(BC+14,68,BC+31,24,BC+48,68);g.fillRect(BC-50,62,100,14);
      g.fillStyle(0xff5c7a,1);g.fillCircle(BC,30,6);
      g.fillStyle(0xffffff,1);g.fillCircle(BC-36,126,25);g.fillCircle(BC+36,126,25);
      g.fillStyle(0xff3b3b,1);g.fillCircle(BC-33,131,13);g.fillCircle(BC+39,131,13);
      g.lineStyle(9,0x2a1c0c,1);g.lineBetween(BC-60,104,BC-18,118);g.lineBetween(BC+60,104,BC+18,118);
      g.beginPath();g.arc(BC,168,28,1.1*PI,1.9*PI,true);g.strokePath();
      g.fillStyle(0xffffff,1);g.fillTriangle(BC-17,158,BC-6,158,BC-11,178);g.fillTriangle(BC+17,158,BC+6,158,BC+11,178);
      g.fillStyle(0x6b4226,1);g.fillEllipse(BC,182,42,20);g.fillStyle(0x8a5a34,1);g.fillCircle(BC,174,10);
    },B);
  }
  makeBaseTexture(){if(this.textures.exists('toiletbase'))return;const g=this.add.graphics(),cx=170,PI=Math.PI;
    // floor plate + pedestal
    g.fillStyle(0xd7dee6,1);g.fillRoundedRect(cx-104,300,208,30,14);
    g.fillStyle(0xffffff,1);g.fillRoundedRect(cx-66,244,132,74,16);
    g.fillStyle(0xe6ebf1,1);g.fillRoundedRect(cx-66,244,132,20,10);
    // bowl
    g.fillStyle(0xffffff,1);g.fillEllipse(cx,206,200,156);
    g.fillStyle(0xe3e8ef,1);g.fillEllipse(cx,162,190,64);
    g.fillStyle(0xffffff,1);g.fillEllipse(cx,162,154,46);
    g.fillStyle(0xbfe6f5,1);g.fillEllipse(cx,166,120,34);
    g.lineStyle(6,0xffd24a,1);g.strokeEllipse(cx,162,190,64); // 금테 (웅장)
    // 물방울 반짝
    g.fillStyle(0xffffff,.85);g.fillCircle(cx-22,160,5);
    // tank
    g.fillStyle(0xffffff,1);g.fillRoundedRect(cx-82,66,164,116,18);
    g.fillStyle(0xeef2f7,1);g.fillRoundedRect(cx-88,56,176,22,11);
    g.lineStyle(4,0xffd24a,1);g.strokeRoundedRect(cx-82,66,164,116,18);
    g.fillStyle(0xffd24a,1);g.fillCircle(cx,72,7); // 물내림 버튼(금)
    // 왕관 (웅장)
    g.fillStyle(0xffd24a,1);g.fillTriangle(cx-42,52,cx-27,16,cx-12,52);g.fillTriangle(cx-15,52,cx,8,cx+15,52);g.fillTriangle(cx+12,52,cx+27,16,cx+42,52);g.fillRect(cx-44,46,88,12);
    g.fillStyle(0xff5c7a,1);g.fillCircle(cx,22,5);g.fillStyle(0x5ce1ff,1);g.fillCircle(cx-27,26,4);g.fillCircle(cx+27,26,4);
    // 귀여운 얼굴 (탱크)
    g.fillStyle(0xffffff,1);g.fillCircle(cx-30,120,20);g.fillCircle(cx+30,120,20);
    g.fillStyle(0x2a2f3a,1);g.fillCircle(cx-27,124,10);g.fillCircle(cx+33,124,10);
    g.fillStyle(0xffffff,1);g.fillCircle(cx-33,116,4);g.fillCircle(cx+27,116,4);
    g.fillStyle(0xff9db0,.6);g.fillCircle(cx-48,140,11);g.fillCircle(cx+48,140,11);
    g.lineStyle(4,0x2a2f3a,1);g.beginPath();g.arc(cx,140,14,.18*PI,.82*PI,false);g.strokePath();
    // 반짝이
    const spk=(x,y,r)=>{g.fillStyle(0xffffff,.9);g.fillTriangle(x,y-r,x-2,y,x+2,y);g.fillTriangle(x,y+r,x-2,y,x+2,y);g.fillTriangle(x-r,y,x,y-2,x,y+2);g.fillTriangle(x+r,y,x,y-2,x,y+2);};
    spk(cx-98,110,7);spk(cx+104,150,6);spk(cx-92,232,5);spk(cx+96,250,5);
    g.generateTexture('toiletbase',340,346);g.destroy();}
  createWorld(){
    this.makeTexFx();this.makeEnemyTextures();this.makeBaseTexture();
    this.cameras.main.setBackgroundColor('#a9e8f3');this.sky=this.add.rectangle(W/2,H/2,W,H,0xa9e8f3).setDepth(0);
    this.wallTiles=this.add.tileSprite(W/2,(BASE_LINE-40)/2,W,BASE_LINE-40,'btile').setDepth(.4).setAlpha(.16);
    this.groundBand=this.add.rectangle(W/2,BASE_LINE+90,W,300,0x577a45).setDepth(1);this.groundEdge=this.add.rectangle(W/2,BASE_LINE+30,W,10,0x31572c).setDepth(1);
    this.floorTiles=this.add.tileSprite(W/2,BASE_LINE+90,W,300,'btile').setDepth(1.1).setAlpha(.12);
    this.atmos=this.add.image(W/2,H/2,'vgrad').setDisplaySize(W,H).setDepth(2);
    this.dangerLine=this.add.rectangle(W/2,BASE_LINE,W,4,0xff5470,.5).setDepth(2.5);
    this.bubbles=[];for(let i=0;i<7;i++){const b=this.add.circle(Phaser.Math.Between(30,W-30),Phaser.Math.Between(0,BASE_LINE),Phaser.Math.Between(6,16),0xffffff,.1).setDepth(3);this.bubbles.push(b);this.tweens.add({targets:b,y:-40,duration:Phaser.Math.Between(6500,11000),delay:i*760,repeat:-1,onRepeat:()=>{b.x=Phaser.Math.Between(30,W-30);b.y=BASE_LINE+40},ease:'Sine.easeInOut'});this.tweens.add({targets:b,alpha:{from:.04,to:.15},duration:1700,yoyo:true,repeat:-1})}
    this.fx=this.add.particles(0,0,'__DEFAULT',{lifespan:420,speed:{min:40,max:170},scale:{start:.6,end:0},alpha:{start:.9,end:0},emitting:false}).setDepth(12);
    this.base=this.add.sprite(W/2,BASE_LINE+96,'toiletbase').setScale(.66).setOrigin(.5,.82).setDepth(6);
    this.vignette=this.add.rectangle(W/2,H/2,W,H,0xff2b2b,0).setDepth(14);
    this.comboGlow=this.add.rectangle(W/2,H/2,W-6,H-6,0x000000,0).setStrokeStyle(12,0xffb03a,0).setDepth(13);
  }
  makePoopTexture(){if(this.textures.exists('poop'))return;const cx=120,PI=Math.PI,
    body=g=>{
      // 귀여운 아기 변기
      g.fillStyle(0x0a2a40,.10);g.fillEllipse(cx,252,148,24);
      g.fillStyle(0xe0e9f1,1);g.fillEllipse(cx-54,246,46,24);g.fillEllipse(cx+54,246,46,24);
      g.fillStyle(0xe6eef5,1);g.fillRoundedRect(cx-88,122,176,130,52);
      g.fillStyle(0xf9fcff,1);g.fillRoundedRect(cx-82,116,150,118,48);
      g.fillStyle(0x4fb8ec,1);g.fillEllipse(cx,110,192,62);
      g.fillStyle(0x86d2f6,1);g.fillEllipse(cx,106,188,54);
      g.fillStyle(0x2b6f9e,1);g.fillEllipse(cx,110,122,38);
      g.fillStyle(0x57a6d6,1);g.fillEllipse(cx,110,104,28);
      g.fillStyle(0xcdecfc,.75);g.fillEllipse(cx-22,104,32,12);
      g.fillStyle(0xff9d9d,.6);g.fillCircle(cx-54,188,14);g.fillCircle(cx+54,188,14);
      g.fillStyle(0xffffff,1);g.fillCircle(cx-30,178,20);g.fillCircle(cx+30,178,20);
      g.fillStyle(0x2a2030,1);g.fillCircle(cx-27,183,11);g.fillCircle(cx+33,183,11);
      g.fillStyle(0xffffff,1);g.fillCircle(cx-33,177,4);g.fillCircle(cx+27,177,4);
      g.lineStyle(5,0x2a2030,1);g.beginPath();g.arc(cx+2,194,17,.15*PI,.85*PI,false);g.strokePath();
    },
    make=(key,extra)=>{const g=this.add.graphics();body(g);if(extra)extra(g);g.generateTexture(key,240,270);g.destroy()};
    make('poop');
    // 전사 — steel helmet + red crest + angry brows
    make('poop_warrior',g=>{g.fillStyle(0x99a3b2,1);g.fillEllipse(cx,42,132,80);g.fillStyle(0x7c8797,1);g.fillEllipse(cx,42,132,40);g.fillStyle(0x6b7480,1);g.fillRect(cx-68,46,136,14);g.fillStyle(0xc23b3b,1);g.fillRoundedRect(cx-8,-4,16,52,6);g.fillStyle(0x241812,1);g.fillTriangle(cx-42,90,cx-12,82,cx-42,98);g.fillTriangle(cx+42,90,cx+12,82,cx+42,98)});
    // 법사 — purple wizard hat + gold star
    make('poop_mage',g=>{g.fillStyle(0x4a2578,1);g.fillEllipse(cx,60,152,30);g.fillStyle(0x6b3fb0,1);g.fillTriangle(cx+8,2,cx-52,62,cx+56,62);g.fillStyle(0x572f92,1);g.fillTriangle(cx+8,2,cx-52,62,cx+4,62);const sx=cx+8,sy=24;g.fillStyle(0xffd24a,1);g.fillTriangle(sx,sy-10,sx-3,sy,sx+3,sy);g.fillTriangle(sx,sy+10,sx-3,sy,sx+3,sy);g.fillTriangle(sx-10,sy,sx,sy-3,sx,sy+3);g.fillTriangle(sx+10,sy,sx,sy-3,sx,sy+3)});
    // 궁수 — green headband + feather
    make('poop_archer',g=>{g.fillStyle(0x2f9d55,1);g.fillRect(cx-64,76,128,16);g.fillStyle(0x257c43,1);g.fillRect(cx-64,86,128,6);g.fillStyle(0x2f9d55,1);g.fillTriangle(cx-64,76,cx-86,82,cx-64,92);g.fillStyle(0x8be36a,1);g.fillTriangle(cx+52,74,cx+60,24,cx+72,72);g.fillStyle(0x2f9d55,1);g.fillRect(cx+58,40,4,36)});
  }
  createHero(){this.makePoopTexture();this.heroX=W/2;this.turretBase=this.add.circle(this.heroX,BASE_LINE-6,26,0x3a3350).setDepth(6);this.turret=this.add.rectangle(this.heroX,BASE_LINE-22,18,46,0x5a5570).setOrigin(.5,1).setStrokeStyle(3,0x2a2740).setDepth(7);this.hero=this.add.sprite(this.heroX,BASE_LINE-2,'poop',0).setScale(.5).setOrigin(.5,.92).setDepth(8);this.hero.setTint(LOOKS[this.settings.selected]?.tint||0xffffff);this.muzzle=this.add.circle(this.heroX,BASE_LINE-70,0,0xfff1a8,0).setDepth(10);this.aura=this.add.ellipse(this.heroX,BASE_LINE-30,98,132,0xffef99,0).setDepth(7).setVisible(false);this.auraOn=false;this.hairFx=null}
  setJobLook(cls,big){const tex={warrior:'poop_warrior',mage:'poop_mage',archer:'poop_archer'}[cls]||'poop',color={warrior:0xff7b4a,mage:0xb46bff,archer:0x4ad06a}[cls]||0xffe14d;this.hero.setTexture(tex);this.hero.clearTint();this.jobColor=color;this.auraBig=big;this.aura.setVisible(true).setFillStyle(color,.35);this.auraOn=true;this.hairFx?.destroy();this.hairFx=null;if(big){const c=this.hairFx=this.add.container(this.heroX,BASE_LINE-128).setDepth(9),n=7,col=0xffe14d;for(let i=0;i<n;i++){const dx=(i-(n-1)/2)*9;c.add(this.add.triangle(dx,0,-6,10,6,10,0,-28,col).setStrokeStyle(2,0xffffff,.55))}}}
  nearestEnemy(){let best=null,bd=1e9;for(const e of this.enemies){if(!e.active||e.y<8)continue;const d=Phaser.Math.Distance.Between(this.heroX,BASE_LINE-40,e.x,e.y);if(d<bd){bd=d;best=e}}return best}
  createHud(){
    // 적은 y=-40 에서 내려와 상단 HUD(점수·기지HP·레벨·미션·무기Lv, y 18~202)를 그대로 통과한다.
    // 글자 뒤로 적이 지나가면 수치가 읽히지 않아, HUD 뒤에 밝은 패널을 깔아 띠로 분리한다.
    this.hudPanel=this.add.rectangle(W/2,104,W,208,0xf2fbff,.52).setDepth(14);
    this.hudEdge=this.add.rectangle(W/2,208,W,3,0xffffff,.38).setDepth(14);
    const hudTitle=this.add.text(20,18,'화장실 수비대',{fontSize:'30px',fontStyle:'900',color:'#15324a',stroke:'#fff',strokeThickness:6}).setDepth(15);
    this.scoreText=this.add.text(22,64,'점수 0',{fontSize:'20px',fontStyle:'bold',color:'#15324a'}).setDepth(15);
    this.waveText=this.add.text(W-22,20,'WAVE 0',{fontSize:'24px',fontStyle:'900',color:'#15324a',stroke:'#fff',strokeThickness:5}).setOrigin(1,0).setDepth(15);
    this.coinText=this.add.text(W-22,58,'🪙 0',{fontSize:'20px',fontStyle:'900',color:'#c88a00',stroke:'#fff',strokeThickness:4}).setOrigin(1,0).setDepth(15);
    this.comboText=this.add.text(W/2,178,'',{fontSize:'22px',fontStyle:'900',color:'#ff9e3d',stroke:'#fff',strokeThickness:5}).setOrigin(.5,0).setDepth(15);
    const baseLabel=this.add.text(22,100,'기지',{fontSize:'16px',fontStyle:'bold',color:'#15324a'}).setDepth(15);
    const hpBg=this.add.rectangle(120,110,300,22,0xffffff,.85).setOrigin(0,.5).setStrokeStyle(3,0x15324a).setDepth(15);
    this.hpBar=this.add.rectangle(122,110,296,16,0x37c871).setOrigin(0,.5).setDepth(16);
    this.levelText=this.add.text(22,130,'Lv.1',{fontSize:'16px',fontStyle:'900',color:'#2a6fb0'}).setDepth(15);const xpBg=this.add.rectangle(120,141,300,10,0xffffff,.7).setOrigin(0,.5).setStrokeStyle(2,0x2a6fb0).setDepth(15);this.xpBar=this.add.rectangle(122,141,0,7,0x59c2ff).setOrigin(0,.5).setDepth(16);
    this.pauseButton=this.add.text(W-52,96,'Ⅱ',{fontSize:'26px',fontStyle:'bold',color:'#15324a',backgroundColor:'#ffffffaa',padding:{x:10,y:5}}).setInteractive().setDepth(18);
    this.bombBtn=this.add.circle(W-62,892,42,0x9c5cff).setStrokeStyle(5,0xffffff).setDepth(15);this.bombArc=this.add.graphics().setDepth(16);this.bombIcon=this.add.text(W-62,892,'💣',{fontSize:'30px'}).setOrigin(.5).setDepth(17);this.bombLabel=this.add.text(W-62,930,'폭탄',{fontSize:'13px',fontStyle:'900',color:'#1a7a3a'}).setOrigin(.5).setDepth(16);
    this.itemBtn=this.add.circle(62,892,42,0x59c2ff).setStrokeStyle(5,0xffffff).setDepth(15);this.itemArc=this.add.graphics().setDepth(16);this.itemIcon=this.add.text(62,892,'🌧️',{fontSize:'30px'}).setOrigin(.5).setDepth(17);this.itemLabel=this.add.text(62,930,'아이템',{fontSize:'13px',fontStyle:'900',color:'#1a5a7a'}).setOrigin(.5).setDepth(16);
    // 좌우 버튼(x 20~104, 436~520)의 라벨을 가리지 않도록 폭을 줄이고, 익숙해질 때쯤 사라지게 한다.
    // 화면 맨 아래(y 952)에 두면 좌우 버튼 라벨(y 930)을 덮는다. 기지와 버튼 사이 빈 띠로 올린다.
    this.hint=this.add.text(W/2,864,'🖐️ 화면 탭 → 💣 폭탄',{fontSize:'16px',fontStyle:'900',color:'#fff',backgroundColor:'#102238cc',padding:{x:10,y:6}}).setOrigin(.5).setDepth(16);
    this.time.delayedCall(6000,()=>{if(!this.hint)return;this.tweens.add({targets:this.hint,alpha:0,duration:600,onComplete:()=>{this.hint?.destroy();this.hint=null}})});
    this.warnText=this.add.text(W/2,BASE_LINE-46,'⚠️ 기지 위험!',{fontSize:'27px',fontStyle:'900',color:'#ff3b3b',stroke:'#fff',strokeThickness:5}).setOrigin(.5).setDepth(15).setVisible(false);
    this.missionText=this.add.text(22,158,'',{fontSize:'13px',fontStyle:'bold',color:'#15324a',backgroundColor:'#ffffffaa',padding:{x:6,y:3}}).setDepth(15);this.wepHud=this.add.container(0,0).setDepth(15);this.buildWeaponHud();
    // 시작 오버레이는 y 0~360 만 반투명으로 덮어서, 그 뒤의 HUD가 비쳐 타이틀이 두 번 보이고
    // 하단 힌트·버튼까지 그대로 노출됐다. 오버레이 동안에는 HUD 전체를 숨긴다.
    this.hudItems=[this.hudPanel,this.hudEdge,hudTitle,this.scoreText,this.waveText,this.coinText,this.comboText,baseLabel,hpBg,this.hpBar,this.levelText,xpBg,this.xpBar,this.pauseButton,this.bombBtn,this.bombIcon,this.bombLabel,this.itemBtn,this.itemIcon,this.itemLabel,this.hint,this.missionText,this.wepHud];
    this.updateHud()}
  setHudVisible(on){this._hudShown=on;for(const o of (this.hudItems||[]))o?.setVisible?.(on);if(this.bombArc)this.bombArc.setVisible(on);if(this.itemArc)this.itemArc.setVisible(on)}
  // 레벨업·전직·상점·일시정지 오버레이는 HUD를 가리지 않아, 뒤로 WAVE·점수·기지HP·미션이 비쳐 지저분했다.
  // (타이틀과 종료 모달만 직접 숨기고 있었다.) 오버레이가 하나라도 열려 있으면 HUD 전체를 숨긴다.
  // update() 매 프레임 호출되므로 값이 바뀔 때만 실제로 적용한다.
  syncHud(){const want=this.state!=='ready'&&this.state!=='over'&&!this.overlayOpen()&&!this.reviveOverlay&&!this.adOverlay;
    if(want!==this._hudShown)this.setHudVisible(want)}
  buildWeaponHud(){if(!this.wepHud)return;this.wepHud.removeAll(true);(this.arsenal||[]).forEach((a,i)=>{const cx=34+i*70,cy=192;this.wepHud.add(this.add.circle(cx,cy,10,a.wp.color).setStrokeStyle(2,0xffffff));this.wepHud.add(this.add.text(cx+13,cy,'Lv'+a.lv,{fontSize:'12px',fontStyle:'900',color:'#15324a',stroke:'#fff',strokeThickness:3}).setOrigin(0,.5))})}
  rebuildArsenal(){const owned=this.settings.weaponsOwned||['basic'];let id=this.settings.weapon;if(!owned.includes(id))id=owned[0]||'basic';this.settings.weapon=id;const prev=(this.arsenal&&this.arsenal[0]&&this.arsenal[0].wp.id===id)?this.arsenal[0]:null,wp=WEAPONS.find(w=>w.id===id)||WEAPONS[0],lv=this.settings.weaponLevels[id]||0;this.arsenal=[{wp,lv,dmgMul:wp.dmg*(1+lv*0.10),bolts:wp.bolts+(id==='shotgun'?Math.floor(lv/3):0),pierce:wp.pierce+(id==='laser'?Math.floor(lv/2):0),miniR:72+(id==='grenade'?lv*10:0),fireFactor:wp.fire*((id==='basic'||id==='rapid')?(1-lv*0.04):1),lvlFireMul:prev?prev.lvlFireMul:1,lastFire:prev?prev.lastFire:0}];this.buildWeaponHud()}
  createInput(){this.input.on('pointerdown',p=>{this.sound.unlock();if(this._uiTap){this._uiTap=false;return}if(this.overlayOpen())return;if(this.state==='ready'||this.state==='over')return this.startGame();if(this.state!=='playing')return;if(p.y<150&&p.x>W-90)return;if(p.x<118&&p.y>848){this.activateSpecial();return}if(p.x>W-118&&p.y>848)return;this.throwBomb(p.x,Phaser.Math.Clamp(p.y,120,BASE_LINE-20))});this.pauseButton.on('pointerdown',e=>{this._uiTap=true;this._uiTap=true;e.event?.stopPropagation?.();this.state==='paused'?this.resumeGame():this.pauseGame()})}
  overlayOpen(){return !!(this.shopOverlay||this.charOverlay||this.lbOverlay||this.weaponOverlay||this.pauseOverlay||this.jobOverlay||this.upOverlay||this.resetOverlay)}
  addCoin(n){const amount=Math.max(1,Math.round(n*this.coinMult*(this.runCoinMul||1)));this.coins+=amount;return amount} // 🪙은 판 안에서만 쓰는 지갑이라 저장하지 않는다
  punch(s=1.04){if(this.reducedMotion)return;this.cameras.main.zoomTo(s,90,'Sine.easeInOut',true);this.time.delayedCall(120,()=>{if(this.state==='playing')this.cameras.main.zoomTo(1,110)})}
  gainXp(n){this.xp+=n;while(this.xp>=this.xpNext){this.xp-=this.xpNext;this.levelUp()}}
  // 5레벨마다 무료 리롤이 1회 쌓인다.
  // 레벨업 요구치는 x1.5 였는데, 적 수는 선형으로만 늘어나 WAVE 10~20 구간에서 레벨이 3번밖에 안 올랐다.
  // (= 카드 쌓는 재미가 깊이 들어갈수록 말라붙음) base 5→10, 배수 1.5→1.2 로 바꿔 같은 구간에서 7번 오르게 했다.
  levelUp(){this.level++;this.xpNext=Math.ceil(this.xpNext*1.2);this.boltDmg+=1;if(this.level%5===0)this.rerolls++;if(this.level%2===0)for(const a of this.arsenal)a.lvlFireMul=Math.max(0.5,a.lvlFireMul*0.94);this.baseHp=Math.min(this.baseMax,this.baseHp+Math.round(this.baseMax*0.05));this.sound.win();this.punch(1.05);this.banner(`LEVEL UP! Lv.${this.level} ⚡`,'#59c2ff');if(!this.reducedMotion)this.cameras.main.flash(160,120,200,255);const jobLvl=(this.level>=5&&!this.job)||(this.level>=10&&this.job&&!this.job2);if(jobLvl)this.offerJob();else this.offerUpgrade();this.updateHud()}
  // 희귀도 가중치로 서로 다른 n장을 뽑는다. 전설일수록 드물게 나온다.
  drawCards(n=3){const taken=this.upsTaken||(this.upsTaken=[]),pool=UPCARDS.filter(u=>!(u.once&&taken.includes(u.id))),pick=[];
    while(pick.length<n&&pool.length){const total=pool.reduce((s,u)=>s+RARITY[u.r].weight,0);let roll=Math.random()*total,i=0;
      for(;i<pool.length-1;i++){roll-=RARITY[pool[i].r].weight;if(roll<=0)break}
      pick.push(pool.splice(i,1)[0])}
    return pick}
  offerUpgrade(){this.state='choosing';this.upOverlay?.destroy();
    const pick=this.drawCards(3),c=this.upOverlay=this.add.container(0,0).setDepth(48);
    c.add(this.add.rectangle(W/2,H/2,W,H,0x102238,.9).setInteractive());
    c.add(this.add.text(W/2,150,'⚡ 레벨 업! 강화 선택',{fontSize:'30px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5));
    c.add(this.add.text(W/2,192,`Lv.${this.level} · 하나를 골라 더 강해지세요`,{fontSize:'15px',color:'#bfe8ff'}).setOrigin(.5));
    pick.forEach((u,i)=>{const R=RARITY[u.r],y=286+i*132,have=(this.upCounts||{})[u.id]||0;
      const card=this.add.rectangle(W/2,y,452,116,0x14304a,.97).setStrokeStyle(u.r==='epic'?5:3,R.color).setInteractive();
      card.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.takeUpgrade(u)});c.add(card);
      c.add(this.add.text(W/2-186,y+6,u.icon,{fontSize:'38px',padding:{x:8,y:14}}).setOrigin(.5));
      c.add(this.add.text(W/2-212,y-40,R.name,{fontSize:'12px',fontStyle:'900',color:R.hex}).setOrigin(0,.5));
      c.add(this.add.text(W/2+18,y-18,have?`${u.name} ×${have}`:u.name,{fontSize:'23px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
      c.add(this.add.text(W/2+18,y+22,u.desc,{fontSize:'15px',color:'#bfe8ff',align:'center',wordWrap:{width:300}}).setOrigin(.5))});
    // 리롤: 판당 1회 무료(5레벨마다 +1). 다 쓰면 광고로 한 번 더 뽑을 수 있다.
    const free=this.rerolls>0;
    const btn=this.add.text(W/2,702,free?`🎲 다시 뽑기 (${this.rerolls})`:'🎬 광고 보고 다시 뽑기',{fontSize:'19px',fontStyle:'900',color:free?'#102238':'#06301a',backgroundColor:free?'#9ad0ff':'#37e07a',padding:{x:20,y:11}}).setOrigin(.5).setInteractive();
    btn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();
      if(this.rerolls>0){this.rerolls--;this.sound.coin?.();this.offerUpgrade();return}
      btn.setText('광고 재생 중…');
      this.showAd(()=>this.offerUpgrade(),()=>btn.setText('⚠️ 광고 취소됨 · 다시 시도'))});
    c.add(btn)}
  takeUpgrade(u){this.upOverlay?.destroy();this.upOverlay=null;u.apply(this);if(u.once)(this.upsTaken||(this.upsTaken=[])).push(u.id);
    (this.upCounts||(this.upCounts={}))[u.id]=((this.upCounts[u.id]||0)+1); // 같은 카드를 몇 번 쌓았는지 카드에 ×N 으로 보여준다
    this.state='playing';this.lastSpawn=this.time.now;this.lastFire=this.time.now;for(const a of this.arsenal)a.lastFire=this.time.now;this.sound.win();this.punch(1.06);this.banner(`${u.icon} ${u.name}!`,RARITY[u.r].hex);if(!this.reducedMotion)this.cameras.main.flash(200,255,235,150);this.updateHud()}
  offerJob(){this.state='choosing';const first=!this.job,opts=first?JOBS1:[JOBS2[this.job]];const c=this.jobOverlay=this.add.container(0,0).setDepth(48);c.add(this.add.rectangle(W/2,H/2,W,H,0x102238,.9).setInteractive());c.add(this.add.text(W/2,210,first?'⚡ 전직! 하나를 선택':'⚡ 2차 전직!',{fontSize:'30px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5));c.add(this.add.text(W/2,252,'수비대를 강화할 길을 골라요',{fontSize:'16px',color:'#bfe8ff'}).setOrigin(.5));opts.forEach((o,i)=>{const y=350+i*126,card=this.add.rectangle(W/2,y,452,112,0x14304a,.97).setStrokeStyle(3,0x59c2ff).setInteractive();card.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.applyJob(o.id,first)});c.add(card);c.add(this.add.text(W/2,y-24,o.name,{fontSize:'25px',fontStyle:'900',color:'#fff'}).setOrigin(.5));c.add(this.add.text(W/2,y+20,o.desc,{fontSize:'16px',color:'#bfe8ff',align:'center',wordWrap:{width:420}}).setOrigin(.5))})}
  applyJob(id,first){if(first)this.job=id;else this.job2=id;
    if(id==='warrior'){this.jobDmgMul*=1.6;this.baseMax+=40;this.baseHp+=40}
    else if(id==='mage'){this.jobExplode=true}
    else if(id==='archer'){this.jobFireMul*=0.55;this.jobPierceMin=Math.max(this.jobPierceMin,2)}
    else if(id==='berserker'){this.jobDmgMul*=1.5;this.jobHeal=true}
    else if(id==='archmage'){this.jobExplode=true;this.jobExplodeBig=true;this.bombR=Math.round(this.bombR*1.2)}
    else if(id==='sniper'){this.jobPierceMin=99;this.jobFireMul*=0.7}
    this.jobOverlay?.destroy();this.jobOverlay=null;this.state='playing';this.lastSpawn=this.time.now;this.lastFire=this.time.now;
    this.setJobLook(first?id:this.job,!first);
    const nm=(JOBS1.find(j=>j.id===id)||Object.values(JOBS2).find(j=>j.id===id))?.name||'전직';this.banner('⚡ '+nm+' 각성!','#ffe14d');this.punch(1.06);if(!this.reducedMotion)this.cameras.main.flash(220,255,235,150);this.updateHud()}
  miniBlast(x,y,r){r=r||72;const ring=this.add.circle(x,y,8,0x9c5cff,.5).setStrokeStyle(4,0xd7b3ff).setDepth(13);this.tweens.add({targets:ring,radius:r,alpha:0,duration:260,onComplete:()=>ring.destroy()});if(!this.reducedMotion)this.fx.emitParticleAt(x,y,10);for(const e of[...this.enemies]){if(Phaser.Math.Distance.Between(x,y,e.x,e.y)<=r)this.hitEnemy(e,Math.max(1,Math.round(this.boltDmg*0.8)),e.x,e.y)}}
  killPop(x,y,color){if(this.reducedMotion)return;const ring=this.add.circle(x,y,6,color,0).setStrokeStyle(4,color,.95).setDepth(11);this.tweens.add({targets:ring,radius:36,alpha:0,duration:250,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()});const fl=this.add.circle(x,y,15,0xffffff,.85).setDepth(11);this.tweens.add({targets:fl,alpha:0,scale:1.9,duration:170,onComplete:()=>fl.destroy()})}
  explode(x,y){this.sound.boom();this.sound.vibrate([30,20,40]);this.punch(1.06);const ring=this.add.circle(x,y,10,0xffef99,.55).setStrokeStyle(6,0xff9c3d).setDepth(13),ring2=this.add.circle(x,y,10,0x000000,0).setStrokeStyle(3,0xffffff,.8).setDepth(13);this.tweens.add({targets:ring,radius:this.bombR,alpha:0,duration:340,onComplete:()=>ring.destroy()});this.tweens.add({targets:ring2,radius:this.bombR*1.15,alpha:0,duration:420,onComplete:()=>ring2.destroy()});if(!this.reducedMotion){this.fx.emitParticleAt(x,y,24);this.cameras.main.shake(150,.008);this.cameras.main.flash(90,255,220,140)}let hits=0;for(const e of[...this.enemies]){if(Phaser.Math.Distance.Between(x,y,e.x,e.y)<=this.bombR){this.hitEnemy(e,this.bombDmg,e.x,e.y);hits++}}if(hits>=3)this.floatText(x,y-30,`💥 ${hits}마리!`,0xffd24a)}
  // 배너는 depth 35 라 종료/부활 모달(30~32) 위에 그려진다. 죽는 순간 떠 있던 배너가
  // '기지 함락!' 제목과 겹쳐 보여서, 모달을 띄울 때 남은 배너를 먼저 치운다.
  // 웨이브 시작 배너와 '이번 판 아이템' 배너가 같은 틱에 둘 다 y=300 으로 떠서 글자가 겹쳐 읽히지 않았다.
  // y를 직접 준 배너는 그 자리에 두고, 기본 배너는 살아 있는 배너 수만큼 아래 슬롯으로 밀어 겹침을 막는다.
  banner(label,color,y){const live=(this.liveBanners||=[]).length,by=y||(300+Math.min(live,2)*54);const t=this.add.text(W/2,by,label,{fontSize:'34px',fontStyle:'900',color:color||'#70e1a1',stroke:'#102238',strokeThickness:7,align:'center'}).setOrigin(.5).setDepth(35);(this.liveBanners||=[]).push(t);const done=()=>{const i=this.liveBanners.indexOf(t);if(i>=0)this.liveBanners.splice(i,1);t.destroy()};this.tweens.add({targets:t,scale:{from:.6,to:1.1},duration:260,yoyo:true,onComplete:()=>this.tweens.add({targets:t,alpha:0,y:t.y-40,delay:450,duration:450,onComplete:done})})}
  clearBanners(){for(const t of [...(this.liveBanners||[])])t?.destroy?.();this.liveBanners=[]}
  floatText(x,y,label,color){const t=this.add.text(x,y,label,{fontSize:'19px',fontStyle:'900',color:`#${color.toString(16).padStart(6,'0')}`,stroke:'#fff',strokeThickness:4}).setOrigin(.5).setDepth(20);this.tweens.add({targets:t,y:y-46,alpha:0,duration:650,onComplete:()=>t.destroy()})}
  missionValue(m){const p=this.settings.dailyProgress||{};return (p[m.id]||0)+m.value(this)}
  updateHud(){this.scoreText.setText(`점수 ${this.score}`);this.waveText.setText(`WAVE ${this.wave}`);this.coinText.setText(`🪙 ${this.coins}`);const r=Phaser.Math.Clamp(this.baseHp/this.baseMax,0,1);this.hpBar.width=296*r;this.hpBar.setFillStyle(r>.5?0x37c871:r>.25?0xffb020:0xff5470);this.levelText?.setText('Lv.'+this.level);if(this.xpBar)this.xpBar.width=296*Phaser.Math.Clamp(this.xp/this.xpNext,0,1);this.comboText?.setText(this.streak>=3?`🔥 연속 ${this.streak}`:'');this.missionText?.setText('오늘 '+MISSIONS.map(m=>`${this.settings.completed?.[m.id]?'✓':Math.min(m.target,this.missionValue(m))+'/'+m.target}`).join(' · '))}
  // ---------- gameplay ----------
  addBars(e,w){e.barBg=this.add.rectangle(e.x,e.y,w+2,6,0x000000,.55).setDepth(8).setVisible(false);e.bar=this.add.rectangle(e.x,e.y,w,4,0x37c871).setOrigin(.5).setDepth(9).setVisible(false);e.barW=w}
  spawnEnemy(){const w=this.wave,pool=['germ','germ','spore'];if(w>=2)pool.push('fly','paper','roll','soap','tissuer');if(w>=3)pool.push('slime','fart','truck','mosquito','tissueb','plunger');if(w>=4)pool.push('roach','fly','sink','soap','mosquito');if(w>=6)pool.push('roach','slime','sink','plunger','tissuer');const key=Phaser.Utils.Array.GetRandom(pool),spec=ENEMIES[key],hp=Math.round(spec.hp*enemyHpMul(w)),e=this.add.sprite(Phaser.Math.Between(70,W-70),SPAWN_TOP,spec.tex).setScale(spec.scale).setDepth(7);e.spec=spec;e.tintColor=spec.tint;e.hp=hp;e.maxHp=hp;e.baseScale=spec.scale;e.speed=spec.speed*enemySpeedMul(w);e.seed=Phaser.Math.Between(0,628)/100;e.spin=spec.noSpin?0:Phaser.Math.Between(-14,14)/10;this.addBars(e,38);this.enemies.push(e);if(key==='truck')this.warnEntrance('⚠️ 정화조차 출현!','#ffd24a')}
  warnEntrance(label,color){const now=this.time.now;if(now-(this._lastWarnEnt||0)<2200)return;this._lastWarnEnt=now;this._slowUntil=now+450;this.sound.warn?.();this.sound.vibrate?.([40,30,40]);if(!this.reducedMotion){this.cameras.main.flash(200,255,60,60);this.cameras.main.shake(200,.006)}const t=this.add.text(W/2,220,label,{fontSize:'30px',fontStyle:'900',color:color||'#ff3b6b',stroke:'#2a0a12',strokeThickness:7}).setOrigin(.5).setDepth(30);(this.liveBanners||=[]).push(t);this.tweens.add({targets:t,scale:{from:1.3,to:1},duration:250,ease:'Back.easeOut'});this.tweens.add({targets:t,alpha:0,y:188,delay:750,duration:400,onComplete:()=>{const i=this.liveBanners.indexOf(t);if(i>=0)this.liveBanners.splice(i,1);t.destroy()}})}
  // kind: 'mini'(첫 보스) · 'big'(5웨이브마다) · 'septic'(10웨이브마다). balance.js 의 bossKind() 가 정한다.
  spawnBoss(kind){const w=this.wave,septic=kind==='septic',big=kind==='big'||septic;
    const tex=septic?'e_boss_septic':kind==='big'?'e_bossbig':'e_boss',sc=septic?.92:kind==='big'?.8:.58;
    const hp=septic?140+w*30:kind==='big'?90+w*22:28+w*12,tint=septic?0x9c7a34:kind==='big'?0x7a1fff:0xe23bb0;
    const e=this.add.sprite(W/2,-70,tex).setScale(sc).setDepth(7);
    e.spec={dmg:septic?60:kind==='big'?46:26,reward:septic?70+w*4:kind==='big'?45+w*3:16+w*2,r:septic?74:kind==='big'?62:46};
    e.tintColor=tint;e.hp=hp;e.maxHp=hp;e.baseScale=sc;e.speed=septic?26+w*0.5:kind==='big'?30+w*0.7:24+w*0.6;e.boss=true;e.big=big;e.kind=kind;
    this.addBars(e,septic?104:kind==='big'?92:62);this.enemies.push(e);
    this.warnEntrance(septic?'👑 웅장한 정화조 강림!':kind==='big'?'⚠️ 대형 보스 접근!':'⚠️ 보스 접근!',septic?'#ffd24a':'#ff3b6b')}
  fireWeapon(a){const best=this.nearestEnemy();if(!best)return;const n=a.bolts+(this.runBolts||0);for(let k=0;k<n;k++){const off=n>1?((k/(n-1))-0.5)*(a.wp.spread||0.24):0;this.fireBolt(a,best,off)}}
  fireBolt(a,best,spread){const wp=a.wp,sx=this.heroX,sy=BASE_LINE-46,ang=Phaser.Math.Angle.Between(sx,sy,best.x,best.y)+(spread||0),b=this.add.circle(sx,sy,wp.size+(this.runBoltSize||0),wp.color).setDepth(10);b.setStrokeStyle(3,0xffffff,.7);b.vx=Math.cos(ang)*940;b.vy=Math.sin(ang)*940;b.dmg=Math.max(1,Math.round(this.boltDmg*a.dmgMul*this.jobDmgMul*(this.runDmg||1)));b.pierceLeft=(Math.max(a.pierce,this.jobPierceMin)||1)+(this.runPierce||0);b.explode=wp.explode||this.runExplode;b.miniR=a.miniR;this.bolts.push(b);this.sound.shoot();if(!this.reducedMotion){this.muzzle.setPosition(sx+Math.cos(ang)*20,sy+Math.sin(ang)*20).setRadius(14).setFillStyle(wp.color,.95).setAlpha(1);this.tweens.add({targets:this.muzzle,alpha:0,duration:80,onComplete:()=>this.muzzle.setRadius(0)});this.tweens.add({targets:this.turret,scaleY:{from:.85,to:1},duration:90})}}
  hitEnemy(e,dmg,x,y){e.hp-=dmg;e.setTintFill(0xffffff);e.y-=e.boss?1:5;this.time.delayedCall(55,()=>{if(e.active)e.clearTint()});if(!this.reducedMotion){this.fx.emitParticleAt(x||e.x,y||e.y,2);if(e.active&&e.hp>0)this.tweens.add({targets:e,baseScale:{from:e.baseScale*1.16,to:e.baseScale},duration:110})}if(e.hp<=0)this.killEnemy(e)}
  killEnemy(e){const i=this.enemies.indexOf(e);if(i>=0)this.enemies.splice(i,1);e.bar?.destroy();e.barBg?.destroy();this.kills++;this.streak++;this.streakAt=this.time.now;// 보스가 5웨이브마다로 줄어든 만큼, 보스 1마리의 경험치·점수를 올려 성장 속도를 맞춘다.
    this.gainXp(e.boss?(e.kind==='septic'?14:e.kind==='big'?10:6):1);const mult=1+Math.floor(this.streak/5);
    this.score+=(e.boss?(e.kind==='septic'?320:e.kind==='big'?200:70):10)*mult;const c=this.addCoin(e.spec.reward);if(this.jobHeal)this.baseHp=Math.min(this.baseMax,this.baseHp+2);this.sound.kill();if(!this.reducedMotion){this.fx.emitParticleAt(e.x,e.y,e.boss?(e.big?30:18):12);this.killPop(e.x,e.y,e.tintColor||0xffffff);if(e.boss||this.streak%4===0)this.cameras.main.shake(70,e.boss?0.006:0.0028)}this.floatText(e.x,e.y-8,e.boss?`보스 처치! +🪙${c}`:`+🪙${c}`,e.boss?0xffd24a:0x9be7a0);if(this.streak>0&&this.streak%10===0){this.floatText(this.heroX,BASE_LINE-120,`🔥 ${this.streak}연속!`,0xff9e3d);this.punch(1.04)}if(e.boss){this.punch(e.big?1.07:1.04);if(e.big&&!this.reducedMotion)this.cameras.main.flash(180,255,240,150)}if(e.spec.split){const sp=ENEMIES.germ;for(let k=0;k<2;k++){const me=this.add.sprite(e.x+(k?22:-22),e.y,sp.tex).setScale(sp.scale*.66).setDepth(7);me.spec=sp;me.tintColor=sp.tint;me.hp=3;me.maxHp=3;me.baseScale=sp.scale*.66;me.speed=120;me.seed=Phaser.Math.Between(0,628)/100;me.spin=Phaser.Math.Between(-30,30)/10;this.addBars(me,26);this.enemies.push(me)}}e.destroy();this.updateHud()}
  throwBomb(x,y){if(this.time.now<this.bombReadyAt)return;if(this.bombTip){this.bombTip.destroy();this.bombTip=null;this.settings.seenBombTip=true;this.persistSettings()}this.bombReadyAt=this.time.now+this.bombCd;this.bombsUsed++;this.explode(x,y);this.updateHud()}
  baseHit(e){const i=this.enemies.indexOf(e);if(i>=0)this.enemies.splice(i,1);e.bar?.destroy();e.barBg?.destroy();this.baseHp-=e.spec.dmg;this.streak=0;this.sound.hurt();this.sound.vibrate([50,40,50]);if(!this.reducedMotion){this.cameras.main.shake(180,.014);this.cameras.main.flash(140,255,80,80)}this.floatText(this.base.x,BASE_LINE+10,`-${e.spec.dmg}`,0xff5470);e.destroy();this.updateHud();if(this.baseHp<=0)this.gameOver()}
  startWave(){this.wave++;this.state='playing';this.waveStartCoins=this.coins;const kind=bossKind(this.wave);this.toSpawn=waveSpawnCount(this.wave);this.spawnGap=waveSpawnGap(this.wave);this.lastSpawn=this.time.now;
    // 보스는 5웨이브마다만. 사이 웨이브는 잡졸만 나와 보스전이 '사건'으로 느껴진다.
    if(kind)this.spawnBoss(kind);
    this.banner(kind==='septic'?`👑 정화조 보스! WAVE ${this.wave}`:kind?`⚠️ 보스 등장! WAVE ${this.wave}`:`WAVE ${this.wave}`,kind==='septic'?'#ffd24a':kind?'#ff7b89':'#15324a');this.applyTheme(Math.floor((this.wave-1)/3));if(this.wave===1&&!this.settings.seenBombTip)this.showBombTip();this.updateHud()}
  showBombTip(){if(this.bombTip)return;const c=this.bombTip=this.add.container(W/2,470).setDepth(36);const t1=this.add.text(0,0,'👆',{fontSize:'56px'}).setOrigin(.5);const t2=this.add.text(0,66,'화면을 탭해\n💣 폭탄을 던져요!',{fontSize:'21px',fontStyle:'900',color:'#fff',stroke:'#102238',strokeThickness:6,align:'center',lineSpacing:6}).setOrigin(.5);c.add([t1,t2]);this.tweens.add({targets:c,scale:{from:.9,to:1.08},duration:600,yoyo:true,repeat:-1})}
  // 웨이브를 클리어하면 멈추지 않고 짧은 연출만 두고 다음 웨이브로 넘어간다.
  // 예전에는 정산 오버레이가 매 웨이브 흐름을 끊었다. 거기 있던 기능은 각자 제자리로 옮겼다:
  //   💎 영구 강화 → 타이틀 + 일시정지,  🔫 무기 → 일시정지(타이틀엔 이미 있음),
  //   🎬 광고 보상 → 게임오버의 '💎 2배'.
  betweenWaves(){this.state='intermission';this.bombTip?.destroy();this.bombTip=null;
    this.settings.dailyProgress.wave=Math.max(this.settings.dailyProgress.wave||0,this.wave);
    const heal=Math.round(this.baseMax*0.08);this.baseHp=Math.min(this.baseMax,this.baseHp+heal);save(this.settings);
    this.banner(`WAVE ${this.wave} 클리어!   ❤️+${heal}`,'#70e1a1',268);
    this.updateHud();
    // 이 1.15초 동안은 state 가 'intermission' 이라 update() 가 멈춰 있다(일시정지도 막힘).
    this.time.delayedCall(1150,()=>{if(this.state==='intermission')this.startWave()})}
  // ---------- flow ----------
  startGame(){if(this.state==='over')return this.scene.restart({autoStart:true});this.beginPlay()}
  beginPlay(){this.setHudVisible(true);this.hideBannerAd();this.shopOverlay?.destroy();this.shopOverlay=null;this.charOverlay?.destroy();this.charOverlay=null;this.lbOverlay?.destroy();this.lbOverlay=null;this.weaponOverlay?.destroy();this.weaponOverlay=null;this.overlay?.destroy();this.overlay=null;this.diagnostics.start();this.diagnosticTick||=this.time.addEvent({delay:100,loop:true,callback:()=>this.diagnostics.sample(this.wave,this.state==='playing'?'playing':this.state,false,this.score+this.kills*0.001+0.001)});this.settings.seenTutorial=true;this.persistSettings();this.pickSpecial();this.startWave()}
  pickSpecial(){this.special=SPECIALS[Math.floor(Math.random()*SPECIALS.length)];this.specialReadyAt=0;this.itemIcon?.setText(this.special.icon);this.itemLabel?.setText(this.special.name);this.itemBtn?.setFillStyle(this.special.color);this.banner('🎁 이번 판 아이템: '+this.special.name,'#59c2ff')}
  activateSpecial(){if(this.state!=='playing'||!this.special)return;if(this.time.now<this.specialReadyAt)return;this.specialReadyAt=this.time.now+this.special.cd;const id=this.special.id;this.sound.boom?.();this.punch(1.04);
    if(id==='rain'){for(let k=0;k<16;k++){const x=Phaser.Math.Between(40,W-40),b=this.add.circle(x,120,6,0x9ad0ff).setStrokeStyle(3,0xffffff,.8).setDepth(10);b.vx=0;b.vy=780;b.dmg=Math.max(2,Math.round(this.boltDmg*1.1));b.pierceLeft=1;this.bolts.push(b)}this.banner('🌧️ 총알비!','#59c2ff')}
    else if(id==='bolt'){if(!this.reducedMotion)this.cameras.main.flash(160,255,240,150);this.cameras.main.shake(160,.006);for(const e of[...this.enemies])this.hitEnemy(e,Math.max(3,Math.round(this.boltDmg*3)),e.x,e.y);this.banner('⚡ 번개!','#ffe14d')}
    else if(id==='freeze'){this.freezeUntil=this.time.now+3200;if(!this.reducedMotion)this.cameras.main.flash(140,150,220,255);this.banner('❄️ 얼리기!','#7fdfff')}
    else if(id==='heal'){this.baseHp=Math.min(this.baseMax,this.baseHp+Math.round(this.baseMax*0.3));this.floatText(this.base.x,BASE_LINE+6,'+체력!',0x5cff9e);this.banner('❤️ 회복!','#ff6b8a')}
    this.updateHud()}
  pauseGame(){if(this.state!=='playing')return;this.state='paused';this.pauseOverlay=this.add.container(0,0).setDepth(44);this.pauseOverlay.add(this.add.rectangle(W/2,H/2,W,H,0x102238,.72).setInteractive());this.pauseOverlay.add(this.add.text(W/2,352,'일시정지',{fontSize:'32px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
    // 웨이브 사이 정산 화면을 없앤 대신, 판 도중에 상점을 여는 곳은 여기다.
    // 무기 강화는 🪙(판 범위)라 판 중에 쓸 수 있어야 하고, 영구 강화는 어디서도 못 열면 안 된다.
    const btn=(y,label,bg,fn)=>{const t=this.add.text(W/2,y,label,{fontSize:'20px',fontStyle:'900',color:'#102238',backgroundColor:bg,padding:{x:20,y:10}}).setOrigin(.5).setInteractive();t.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();fn()});this.pauseOverlay.add(t);return t};
    btn(420,'계속하기 ▶','#ffe082',()=>this.resumeGame());
    btn(486,'💎 영구 강화','#bfe8ff',()=>this.showShop());
    btn(552,'🔫 무기 구매/강화','#9ad0ff',()=>this.showWeapons());
    const home=this.add.text(W/2,624,'🏠 처음으로',{fontSize:'19px',fontStyle:'900',color:'#fff',backgroundColor:'#7a2233',padding:{x:18,y:10}}).setOrigin(.5).setInteractive();home.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.quitToStart()});this.pauseOverlay.add(home);
    this.pauseOverlay.add(this.add.text(W/2,670,`지금 그만둬도 💎${gemPayout(this.wave,this.score)} 은 받아요`,{fontSize:'13px',color:'#9fb3c8'}).setOrigin(.5))}
  // 중도 포기도 '끝난 판'이다. 사망과 똑같이 정산해서 💎와 미션 진행을 받고 나간다.
  quitToStart(){this.pauseOverlay?.destroy();this.pauseOverlay=null;this.settleRun();this.state='over';this.scene.restart()}
  resumeGame(){if(this.state!=='paused')return;this.pauseOverlay?.destroy();this.pauseOverlay=null;this.state='playing';this.lastSpawn=this.time.now}
  gameOver(){if(this.state==='over'||this.state==='dying')return;this.bombTip?.destroy();this.bombTip=null;this.jobOverlay?.destroy();this.jobOverlay=null;this.upOverlay?.destroy();this.upOverlay=null;if(!this.revived){this.showReviveOffer();return}this.commitGameOver()}
  // 종료 모달은 y 215~645 만 덮어서 상단 점수·WAVE와 하단 버튼·힌트가 그대로 노출됐다.
  // 최종 기록은 모달이 다시 적어주므로 HUD는 숨긴다.
  // 카운트다운 만료와 '그만할래요' 탭이 같은 프레임에 겹치면 declineRevive()가 두 번 돌아
  // 모달이 겹쳐 그려지고 랭킹에도 같은 기록이 두 번 올라갔다.
  commitGameOver(){if(this.state==='over')return;this.state='over';this.setHudVisible(false);this.showBannerAd();this.clearBanners();for(const b of this.bolts)b.destroy();this.bolts=[];for(const e of this.enemies){e.bar?.destroy();e.barBg?.destroy()}this.showEnd()}
  showReviveOffer(){this.state='dying';this.setHudVisible(false);this.clearBanners();this.sound.hurt?.();this.sound.vibrate?.([60,40,120]);
    if(!this.reducedMotion){this.cameras.main.shake(320,.018);this.cameras.main.flash(280,255,40,40);this.vignette.setAlpha(.55)}
    // pick a taunt that stings (near-miss / loss) → 간절함·오기 자극
    const gap=this.bestScore-this.score,waveGap=this.bestWave-this.wave;let taunt;
    if(this.bestScore>0&&gap>0&&gap<=Math.max(300,this.bestScore*0.2))taunt=`😤 신기록까지 딱 ${gap.toLocaleString()}점!! 여기서 끝내면 평생 후회…`;
    else if(this.bestWave>0&&waveGap>0&&waveGap<=2)taunt=`😤 최고 WAVE ${this.bestWave} 코앞이잖아요! 한 번만 더!`;
    else if(this.streak>=8)taunt=`🔥 ${this.streak}연속 콤보가 아깝지도 않아요?!`;
    else if(this.wave>=5)taunt=`😱 WAVE ${this.wave}까지 왔는데… 진짜 포기?`;
    else taunt=`😤 벌써 포기라고요? 딱 한 번만 더!`;
    const ov=this.reviveOverlay=this.add.container(0,0).setDepth(46);
    ov.add(this.add.rectangle(W/2,H/2,W,H,0x0b1020,.86).setInteractive());
    const title=this.add.text(W/2,262,'💥 앗… 기지 함락 직전!',{fontSize:'33px',fontStyle:'900',color:'#ff5470',stroke:'#2a0a12',strokeThickness:7}).setOrigin(.5);ov.add(title);
    this.tweens.add({targets:title,scale:{from:1.14,to:1},duration:300,ease:'Back.easeOut'});
    ov.add(this.add.text(W/2,318,taunt,{fontSize:'19px',fontStyle:'900',color:'#ffe082',align:'center',wordWrap:{width:470}}).setOrigin(.5));
    ov.add(this.add.text(W/2,368,`💸 지금 포기하면  WAVE ${this.wave} · ${this.score.toLocaleString()}점 · 강화한 무기가\n전부 사라져요!`,{fontSize:'15px',fontStyle:'bold',color:'#ff9e9e',align:'center',lineSpacing:5}).setOrigin(.5));
    ov.add(this.add.text(W/2,414,'광고 딱 한 번이면 그 자리에서 되살아나요',{fontSize:'14px',color:'#bfe8ff'}).setOrigin(.5));
    const rv=this.add.text(W/2,484,'🎬  광고 보고 즉시 부활!',{fontSize:'27px',fontStyle:'900',color:'#06301a',backgroundColor:'#37e07a',padding:{x:30,y:18}}).setOrigin(.5).setDepth(47).setInteractive();
    rv.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.watchAdRevive()});ov.add(rv);
    this.tweens.add({targets:rv,scale:{from:.98,to:1.1},duration:520,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const free=this.add.text(W/2+150,452,'무료!',{fontSize:'16px',fontStyle:'900',color:'#fff',backgroundColor:'#ff3b6b',padding:{x:9,y:5}}).setOrigin(.5).setDepth(48);ov.add(free);this.tweens.add({targets:free,angle:{from:-8,to:8},duration:420,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    let t=7;const cd=this.add.text(W/2,556,`${t}`,{fontSize:'40px',fontStyle:'900',color:'#9fb3c8'}).setOrigin(.5);ov.add(cd);
    this.reviveTimer=this.time.addEvent({delay:1000,repeat:7,callback:()=>{t--;if(t<=0){this.reviveTimer=null;this.declineRevive();return}cd.setText(`${t}`);if(t<=3){cd.setColor('#ff3b3b');this.sound.vibrate?.(50);this.tweens.add({targets:cd,scale:{from:1.5,to:1},duration:300,ease:'Back.easeOut'})}}});
    ov.add(this.add.text(W/2,596,'초 뒤 자동 종료',{fontSize:'12px',color:'#7a8aa0'}).setOrigin(.5));
    const giveup=this.add.text(W/2,656,'😢 아니요, 그만할래요…',{fontSize:'14px',color:'#8090a0',backgroundColor:'#ffffff14',padding:{x:14,y:8}}).setOrigin(.5).setDepth(47).setInteractive();
    giveup.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.declineRevive()});ov.add(giveup)}
  declineRevive(){this.reviveTimer?.remove();this.reviveTimer=null;this.reviveOverlay?.destroy();this.reviveOverlay=null;this.commitGameOver()}
  watchAdRevive(){if(this.state!=='dying')return;this.reviveTimer?.remove();this.reviveTimer=null;this.reviveOverlay?.destroy();this.reviveOverlay=null;this.showAd(()=>this.doRevive(),()=>{this.commitGameOver();this.banner('광고를 끝까지 봐야 부활돼요','#ffd24a',170)})}
  async initAdMob(){this.admobReady=false;try{if(Capacitor.isNativePlatform()){await AdMob.initialize({initializeForTesting:USE_TEST_ADS});this.admobReady=true;if(this.state==='ready')this.showBannerAd()}}catch(e){this.admobReady=false}}
  // 제스처 바(홈 인디케이터) 높이. index.html 의 viewport-fit=cover 가 있어야 값이 잡힌다.
  // 이걸 margin 으로 넘기지 않으면 배너가 제스처 바와 겹친다.
  bottomInset(){try{const p=document.createElement('div');p.style.cssText='position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';document.body.appendChild(p);const h=Math.round(p.getBoundingClientRect().height);p.remove();return h}catch(e){return 0}}
  // 배너는 시작·게임오버 화면에서만. 플레이 중에는 하단 폭탄/아이템 버튼(y>848)을 가리므로 내린다.
  async showBannerAd(){if(!(this.admobReady&&Capacitor.isNativePlatform())||this.bannerShown)return;const adId=USE_TEST_ADS?ADMOB_TEST_BANNER_ID:ADMOB_BANNER_ID;if(!adId)return;this.bannerShown=true;try{await AdMob.showBanner({adId,adSize:BannerAdSize.ADAPTIVE_BANNER,position:BannerAdPosition.BOTTOM_CENTER,margin:this.bottomInset()})}catch(e){this.bannerShown=false}}
  async hideBannerAd(){if(!this.bannerShown)return;this.bannerShown=false;try{await AdMob.hideBanner()}catch(e){}}
  // 전면광고: 네이티브에서만, 실패 시 조용히 넘어감. 게임오버 "다시 도전" 3회당 1번.
  async showInterstitial(){if(!(this.admobReady&&Capacitor.isNativePlatform()))return;const adId=USE_TEST_ADS?ADMOB_TEST_INTER_ID:ADMOB_INTER_ID;if(!adId)return;try{await AdMob.prepareInterstitial({adId});await AdMob.showInterstitial()}catch(e){}}
  // Real AdMob rewarded ad on device; simulated overlay on web/dev or if the ad fails.
  // onNoReward: 광고를 끝까지 보지 않았을 때의 처리. 호출한 쪽이 정한다.
  // (예전에는 여기서 무조건 commitGameOver()를 불러서, 웨이브 사이 '코인 2배' 광고를 닫아도 게임이 끝났다.)
  async showAd(cb,onNoReward){
    if(this.admobReady&&Capacitor.isNativePlatform()){
      let got=false,rl=null;
      try{
        rl=await AdMob.addListener(RewardAdPluginEvents.Rewarded,()=>{got=true});
        const adId=USE_TEST_ADS?ADMOB_TEST_REWARD_ID:ADMOB_REWARD_ID;
        await AdMob.prepareRewardVideoAd({adId});
        await AdMob.showRewardVideoAd();
        rl&&rl.remove&&rl.remove();
        if(got){cb&&cb()}else if(onNoReward){onNoReward()}else{this.banner('광고를 끝까지 봐야 보상이 지급돼요','#ffd24a',170)}
        return;
      }catch(e){rl&&rl.remove&&rl.remove()/* fall back to simulated */}
    }
    this.showAdFallback(cb)}
  showAdFallback(cb){const ov=this.adOverlay=this.add.container(0,0).setDepth(60);ov.add(this.add.rectangle(W/2,H/2,W,H,0x05060c,.96).setInteractive());ov.add(this.add.text(W/2,H/2-70,'📺 광고',{fontSize:'42px',fontStyle:'900',color:'#fff'}).setOrigin(.5));ov.add(this.add.text(W/2,H/2-16,'광고 재생 중…',{fontSize:'18px',color:'#bfe8ff'}).setOrigin(.5));let t=3;const c2=this.add.text(W/2,H/2+44,`${t}`,{fontSize:'28px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5);ov.add(c2);this.adTimer=this.time.addEvent({delay:1000,repeat:3,callback:()=>{t--;c2.setText(t>0?`${t}`:'✓');if(t<=0){this.adTimer=null;this.adOverlay?.destroy();this.adOverlay=null;cb&&cb()}}})}
  doRevive(){this.revived=true;this.setHudVisible(true);this.baseHp=Math.max(1,Math.round(this.baseMax*0.5));for(const e of[...this.enemies]){e.bar?.destroy();e.barBg?.destroy();if(!this.reducedMotion)this.fx.emitParticleAt(e.x,e.y,6);e.destroy()}this.enemies=[];if(!this.reducedMotion)this.cameras.main.flash(320,120,255,180);this.sound.win?.();this.punch(1.06);this.banner('✨ 부활! WAVE 다시 시작','#59c2ff');this.toSpawn=0;this.wave--;this.startWave();this.lastFire=this.time.now;this.updateHud()}
  applyTheme(tier){const t=THEMES[Phaser.Math.Clamp(tier,0,THEMES.length-1)];if(!t)return;this.cameras.main.setBackgroundColor(t.sky);this.sky?.setFillStyle(t.sky);this.groundBand?.setFillStyle(t.ground);this.groundEdge?.setFillStyle(t.edge)}
  persistSettings(){save({...this.settings,soundOn:this.sound.soundOn,vibrationOn:this.sound.vibrationOn})}
  settingButton(y,label,onClick){const t=this.add.text(W/2,y,label,{fontSize:'18px',color:'#fff',backgroundColor:'#ffffff22',padding:{x:12,y:7}}).setOrigin(.5).setInteractive();t.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();onClick()});this.overlay.add(t);return t}
  dailyCheckIn(){const t=todayKey(),s=this.settings;if(s.lastAttend===t)return{reward:0,streak:s.attendStreak||1};const y=new Date(Date.now()-864e5).toLocaleDateString('sv-SE');s.attendStreak=(s.lastAttend===y?(s.attendStreak||0)+1:1);s.lastAttend=t;// 출석 보상은 💎로 준다. 예전엔 코인이라 다음 죽음에 전부 날아가 의미가 없었다.
    const reward=15+Math.min(s.attendStreak,7)*5;s.gems=(+s.gems||0)+reward;save(s);this.updateHud?.();return{reward,streak:s.attendStreak}}
  showStart(){this.setHudVisible(false);this.showBannerAd();this.overlay=this.add.container(0,0).setDepth(20);
    this.overlay.add(this.add.rectangle(W/2,H/2,W,H,0x0b1730,.92).setInteractive());
    this.overlay.add(this.add.rectangle(W/2,180,W,360,0x15408a,.45));
    // 예전엔 큰 반투명 원 두 개(노랑·파랑)를 깔았는데, 어두운 배경과 섞여 '회색 얼룩'처럼 보였다.
    // 가산 합성 글로우로 바꿔 제목 뒤 조명으로 읽히게 한다.
    this.overlay.add(this.add.image(W/2,124,'glow').setDisplaySize(620,300).setTint(0x59c2ff).setAlpha(.34).setBlendMode(Phaser.BlendModes.ADD));
    // 예전엔 색 점 3개가 부제(y168)·조작 설명(y200) 글자 위에 겹쳐 글씨를 가렸다.
    // 아래 빈 띠로 내리고, 밋밋한 원 대신 실제 적 스프라이트를 써서 '기지로 몰려오는 적'으로 읽히게 한다.
    // 화장실 실루엣의 얼굴(x 230~310)은 피해서 배치한다.
    // 어두운 배경이라 밝은 적만 쓴다(파리는 몸이 검어 거의 안 보였다).
    [['e_germ',70,824,.34],['e_tissue_red',168,850,.30],['e_slime',454,828,.34]].forEach(([tex,x,y,sc],i)=>{
      const e=this.add.image(x,y,tex).setScale(sc).setAlpha(.72);this.overlay.add(e);
      this.tweens.add({targets:e,y:y+16,duration:1500+i*320,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})});
    this.overlay.add(this.add.text(W/2+3,120,'🚽 화장실 수비대',{fontSize:'39px',fontStyle:'900',color:'#000'}).setOrigin(.5).setAlpha(.35));
    const tt=this.add.text(W/2,117,'🚽 화장실 수비대',{fontSize:'39px',fontStyle:'900',color:'#fff',stroke:'#2a6fb0',strokeThickness:8}).setOrigin(.5);this.overlay.add(tt);this.tweens.add({targets:tt,y:111,duration:1200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.overlay.add(this.add.text(W/2,168,'몰려오는 적을 막아 화장실을 지켜라!',{fontSize:'17px',fontStyle:'bold',color:'#bfe8ff'}).setOrigin(.5));
    this.overlay.add(this.add.text(W/2,200,'자동 발사 · 화면 탭 💣폭탄 · 무한 웨이브',{fontSize:'13px',color:'#8fc4ff'}).setOrigin(.5));
    this.overlay.add(this.add.text(W/2,254,MISSIONS.map(m=>`${this.settings.completed?.[m.id]?'✓':Math.min(m.target,this.missionValue(m))+'/'+m.target} ${m.label} → ${LOOKS[m.reward].name}`).join('\n'),{fontSize:'14px',color:'#bdf5ce',align:'center',lineSpacing:6}).setOrigin(.5));
    // 💎 영구 강화는 예전엔 웨이브 사이 정산 화면에서만 열 수 있었다. 그 화면을 없앴으니 여기가 제자리다.
    this.shopBtn=this.settingButton(322,`💎 영구 강화 (보유 ${this.settings.gems})`,()=>this.showShop());
    this.settingButton(362,`👤 수비대: ${LOOKS[this.settings.selected]?.name||'기본'}`,()=>this.showCharacters());
    this.settingButton(402,`🔫 무기 (장착: ${(WEAPONS.find(w=>w.id===this.settings.weapon)||WEAPONS[0]).name})`,()=>this.showWeapons());
    this.settingButton(442,'🏆 랭킹 보기',()=>this.showLeaderboard());
    this.soundBtn=this.settingButton(482,`소리 ${this.sound.soundOn?'켜짐':'꺼짐'}`,()=>{this.sound.soundOn=!this.sound.soundOn;this.soundBtn.setText(`소리 ${this.sound.soundOn?'켜짐':'꺼짐'}`);this.persistSettings()});
    this.vibeBtn=this.settingButton(522,`진동 ${this.sound.vibrationOn?'켜짐':'꺼짐'}`,()=>{this.sound.vibrationOn=!this.sound.vibrationOn;this.vibeBtn.setText(`진동 ${this.sound.vibrationOn?'켜짐':'꺼짐'}`);this.persistSettings()});
    this.overlay.add(this.add.text(W/2,588,`최고 ${this.bestScore.toLocaleString()}점 · 최고 WAVE ${this.bestWave}  ·  💎 ${this.settings.gems}`,{fontSize:'16px',color:'#ffe082',fontStyle:'bold',align:'center'}).setOrigin(.5));
    {const ci=this.dailyCheckIn();this.overlay.add(this.add.text(W/2,624,ci.reward>0?`🎁 출석 보상 +💎${ci.reward}  ·  연속 ${ci.streak}일!`:`✓ 오늘 출석 완료  ·  연속 ${ci.streak}일`,{fontSize:'15px',fontStyle:'bold',color:ci.reward>0?'#9be7a0':'#8fb3c8'}).setOrigin(.5));if(ci.reward>0)this.sound?.coin?.()}
    const start=this.add.text(W/2,672,'▶  게임 시작',{fontSize:'30px',fontStyle:'900',color:'#06301a',backgroundColor:'#37e07a',padding:{x:46,y:16}}).setOrigin(.5).setInteractive();start.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.startGame()});this.overlay.add(start);this.tweens.add({targets:start,scale:{from:1,to:1.06},duration:700,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.overlay.add(this.add.text(W/2,720,'(아무 곳이나 탭해도 시작)',{fontSize:'12px',color:'#8fb3c8'}).setOrigin(.5));
    this.overlay.add(this.add.text(W/2,752,`v${APP_VERSION}`,{fontSize:'12px',color:'#5f7a90'}).setOrigin(.5));
    // 메인 한가운데 붉은 버튼으로 두면 시작 버튼 바로 아래라 잘못 누르기 쉽다.
    // 맨 아래 작고 차분한 링크로 내린다(확인 모달은 그대로).
    const reset=this.add.text(W/2,912,'⟲ 데이터 초기화',{fontSize:'13px',color:'#8090a0',backgroundColor:'#ffffff14',padding:{x:12,y:7}}).setOrigin(.5).setInteractive();reset.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.confirmReset()});this.overlay.add(reset)}
  confirmReset(){this.resetOverlay?.destroy();const c=this.resetOverlay=this.add.container(0,0).setDepth(55);c.add(this.add.rectangle(W/2,H/2,W,H,0x000000,.82).setInteractive());c.add(this.add.text(W/2,380,'⟲ 데이터 초기화',{fontSize:'30px',fontStyle:'900',color:'#ff9e9e'}).setOrigin(.5));c.add(this.add.text(W/2,442,'코인·강화·무기·전직 해금·랭킹이\n모두 사라져요. 계속할까요?',{fontSize:'18px',color:'#fff',align:'center',lineSpacing:8}).setOrigin(.5));const yes=this.add.text(W/2-82,536,'초기화',{fontSize:'22px',fontStyle:'900',color:'#fff',backgroundColor:'#c0392b',padding:{x:20,y:12}}).setOrigin(.5).setInteractive();yes.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();try{localStorage.removeItem(SAVE_KEY)}catch{}this.resetOverlay=null;this.scene.restart()});c.add(yes);const no=this.add.text(W/2+82,536,'취소',{fontSize:'22px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:22,y:12}}).setOrigin(.5).setInteractive();no.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.resetOverlay?.destroy();this.resetOverlay=null});c.add(no)}
  // 한 판의 정산: 일일 미션 진행 · 미션 해금 · 기록 · 💎 보상 · 런 범위 초기화.
  // 예전에는 showEnd() 안에만 있어서, 일시정지 → 처음으로 로 나가면 그 판의 💎도 미션 진행도 통째로 사라졌다.
  // 사망과 중도 포기 양쪽에서 부르고, 한 판에 한 번만 실행되게 막는다.
  settleRun(){
    if(this._settled)return this._settleResult;
    this._settled=true;
    const final=this.score,isBest=final>this.bestScore;
    this.bestScore=Math.max(this.bestScore,final);this.bestWave=Math.max(this.bestWave,this.wave);
    const entry={score:final,wave:this.wave,date:todayKey()};
    this.settings.scores=Array.isArray(this.settings.scores)?this.settings.scores:[];
    this.settings.scores.push(entry);this.settings.scores.sort((a,b)=>b.score-a.score);this.settings.scores=this.settings.scores.slice(0,10);
    const rank=this.settings.scores.indexOf(entry)+1,ranked=rank>0&&rank<=10;
    const newly=[];this.settings.completed||={};
    const p=this.settings.dailyProgress;p.kills=(p.kills||0)+this.kills;p.bomb=(p.bomb||0)+this.bombsUsed;p.wave=Math.max(p.wave||0,this.wave);
    for(const m of MISSIONS){if((p[m.id]||0)>=m.target&&!this.settings.completed[m.id]){this.settings.completed[m.id]=todayKey();if(!this.settings.unlocked.includes(m.reward))this.settings.unlocked.push(m.reward);newly.push(LOOKS[m.reward].name)}}
    // 🪙과 무기 강화는 판과 함께 사라지고, 성과만큼 💎로 환산해 영구 지갑에 넣는다.
    // 영구 강화(settings.upgrades)와 해금한 무기·스킨은 그대로 둔다.
    const earned=this.coins,gems=gemPayout(this.wave,final);
    this.settings.gems=(+this.settings.gems||0)+gems;this.settings.weaponLevels={};
    Object.assign(this.settings,{bestScore:this.bestScore,bestWave:this.bestWave,soundOn:this.sound.soundOn,vibrationOn:this.sound.vibrationOn});
    save(this.settings);
    return this._settleResult={final,isBest,rank,ranked,newly,gems,earned}}
  showEnd(){const {final,isBest,rank,ranked,newly,gems,earned}=this.settleRun();const grade=this.wave>=25?'S':this.wave>=16?'A':this.wave>=8?'B':'C',share=`화장실 수비대 ${grade}등급 · WAVE ${this.wave} · ${final.toLocaleString()}점 · 🪙${this.coins}!`;this.add.rectangle(W/2,488,486,546,0x102238,.96).setStrokeStyle(6,0xffffff).setDepth(30);this.add.text(W/2,270,'기지 함락!',{fontSize:'38px',fontStyle:'900',color:'#ff7b89'}).setOrigin(.5).setDepth(31);this.add.text(W/2,420,`WAVE ${this.wave} 방어 · 등급 ${grade}\n${final.toLocaleString()}점${isBest?' · 신기록!':''}${ranked?` · 🏆${rank}위`:''}\n처치 ${this.kills} · 폭탄 ${this.bombsUsed}회\n💎 +${gems} 획득 (보유 ${this.settings.gems})\n🪙 ${earned}과 무기 강화는 이번 판과 함께 사라져요\n영구 강화·해금한 무기는 그대로 유지${newly.length?'\n해금: '+newly.join(', '):''}`,{fontSize:'19px',color:'#fff',align:'center',lineSpacing:8}).setOrigin(.5).setDepth(31);// 웨이브마다 뜨던 '코인 2배' 광고를 여기로 옮겼다. 흐름을 끊지 않고, 판 보상(💎)을 2배로 준다.
    {let used=false;const dbl=this.add.text(W/2,548,`🎬 광고 보고 💎 2배! (+${gems})`,{fontSize:'20px',fontStyle:'900',color:'#06301a',backgroundColor:'#37e07a',padding:{x:18,y:11}}).setOrigin(.5).setDepth(32).setInteractive();
      this.tweens.add({targets:dbl,scale:{from:1,to:1.05},duration:620,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      dbl.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();if(used)return;used=true;this.tweens.killTweensOf(dbl);dbl.setScale(1).setText('광고 재생 중…');
        this.showAd(()=>{this.settings.gems=(+this.settings.gems||0)+gems;save(this.settings);this.sound.coin?.();dbl.setText(`✓ 💎 2배 완료! (보유 ${this.settings.gems})`).setBackgroundColor('#33465a')},
          ()=>{used=false;dbl.setText('⚠️ 광고 취소됨 · 다시 시도')})});}
    const rankBtn=this.add.text(W/2,608,'🏆 랭킹 보기',{fontSize:'20px',fontStyle:'900',color:'#102238',backgroundColor:'#9ad0ff',padding:{x:14,y:9}}).setOrigin(.5).setDepth(32).setInteractive();rankBtn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.showLeaderboard()});const again=this.add.text(W/2,662,'다시 도전 ▶',{fontSize:'21px',fontStyle:'900',color:'#fff',backgroundColor:'#37c871',padding:{x:18,y:10}}).setOrigin(.5).setDepth(32).setInteractive();again.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this._interCount=(this._interCount||0)+1;if(this._interCount%3===0)this.showInterstitial();this.startGame()});const shareBtn=this.add.text(W/2,714,'기록 공유/복사',{fontSize:'16px',color:'#fff',backgroundColor:'#ffffff22',padding:{x:12,y:7}}).setOrigin(.5).setDepth(32).setInteractive();shareBtn.on('pointerdown',async e=>{this._uiTap=true;e.event?.stopPropagation?.();try{if(navigator.share)await navigator.share({title:'화장실 수비대',text:share});else await navigator.clipboard.writeText(share);shareBtn.setText('복사 완료 ✓')}catch{shareBtn.setText('취소됨')}})}
  showShop(){this.shopOverlay?.destroy();const c=this.shopOverlay=this.add.container(0,0).setDepth(50);c.add(this.add.rectangle(W/2,H/2,W,H,0x0b1a2b,.95).setInteractive());c.add(this.add.text(W-34,52,'✖',{fontSize:'30px',fontStyle:'900',color:'#fff',backgroundColor:'#00000066',padding:{x:12,y:6}}).setOrigin(.5).setDepth(52).setInteractive().on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.shopOverlay?.destroy();this.shopOverlay=null}));c.add(this.add.text(W/2,80,'💎 영구 강화',{fontSize:'32px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5));c.add(this.add.text(W/2,122,`보유 💎 ${this.settings.gems}`,{fontSize:'21px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));c.add(this.add.text(W/2,150,'죽어도 사라지지 않아요',{fontSize:'13px',color:'#8fb3c8'}).setOrigin(.5));UPGRADES.forEach((u,idx)=>{const y=185+idx*95,lvl=this.upg[u.id],maxed=lvl>=u.max,cost=upgCost(u,lvl);c.add(this.add.rectangle(W/2,y+18,486,84,0x14304a,.9).setStrokeStyle(2,0x2f597d));c.add(this.add.text(50,y-10,`${u.name}  Lv.${lvl}/${u.max}`,{fontSize:'20px',fontStyle:'900',color:'#fff'}));c.add(this.add.text(50,y+20,u.desc,{fontSize:'15px',color:'#bfe8ff'}));const afford=this.settings.gems>=cost,btn=this.add.text(W-52,y+8,maxed?'MAX':`${cost}💎`,{fontSize:'19px',fontStyle:'900',color:maxed?'#9fb3c8':(afford?'#102238':'#9fb3c8'),backgroundColor:maxed?'#33465a':(afford?'#ffe082':'#33465a'),padding:{x:12,y:9}}).setOrigin(1,.5);c.add(btn);if(!maxed&&afford){btn.setInteractive();btn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();const cc=upgCost(u,this.upg[u.id]);if(this.settings.gems<cc)return;this.settings.gems-=cc;this.upg[u.id]++;this.settings.upgrades[u.id]=this.upg[u.id];save(this.settings);this.sound.coin();this.applyUpgrades();this.showShop();this.shopBtn?.setText(`💎 영구 강화 (보유 ${this.settings.gems})`);})}});const close=this.add.text(W/2,700,'✖ 닫기',{fontSize:'24px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:34,y:15}}).setOrigin(.5).setInteractive();close.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.shopOverlay?.destroy();this.shopOverlay=null});c.add(close)}
  applyUpgrades(){const perk=LOOKS[this.settings.selected]?.perk;this.boltDmg=4+this.upg.power*3+(perk==='power'?4:0);this.perkRate=perk==='rate';this.perkRate2=perk==='rate2';this.bombDmg=7+this.upg.bomb*3+(perk==='bomb'?4:0);this.bombR=118+this.upg.bomb*16+(perk==='bomb'?30:0);this.coinMult=1+this.upg.coin*0.25+(perk==='gold'?1:0);const newMax=100+this.upg.basehp*30+(perk==='hp'?40:0),add=newMax-this.baseMax;this.baseMax=newMax;if(add>0)this.baseHp+=add;this.updateHud()}
  // 전직 중에는 setJobLook()이 전용 텍스처 + clearTint()로 외형을 잡아둔다.
  // 그 상태에서 스킨을 고르면 투구/모자 위에 스킨 색이 덧씌워져 외형이 깨지므로, 선택만 저장하고 틴트는 다음 판부터 적용한다.
  showCharacters(){this.charOverlay?.destroy();const c=this.charOverlay=this.add.container(0,0).setDepth(50);c.add(this.add.rectangle(W/2,H/2,W,H,0x0b1a2b,.94).setInteractive());c.add(this.add.text(W-34,52,'✖',{fontSize:'30px',fontStyle:'900',color:'#fff',backgroundColor:'#00000066',padding:{x:12,y:6}}).setOrigin(.5).setDepth(52).setInteractive().on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.charOverlay?.destroy();this.charOverlay=null}));c.add(this.add.text(W/2,70,'👤 수비대',{fontSize:'32px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5));c.add(this.add.text(W/2,112,`보유 💎 ${this.settings.gems}`,{fontSize:'19px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));Object.keys(LOOKS).forEach((id,idx)=>{const L=LOOKS[id],y=166+idx*92,owned=this.settings.unlocked.includes(id),sel=this.settings.selected===id;c.add(this.add.rectangle(W/2,y+18,486,82,sel?0x1d4a3a:0x14304a,.92).setStrokeStyle(2,sel?0x70e1a1:0x2f597d));c.add(this.add.circle(70,y+18,20,L.tint));c.add(this.add.text(105,y-8,L.name,{fontSize:'19px',fontStyle:'900',color:'#fff'}));c.add(this.add.text(105,y+22,L.desc||'기본',{fontSize:'14px',color:'#bfe8ff'}));let btn;if(sel){btn=this.add.text(W-52,y+8,'선택됨',{fontSize:'16px',fontStyle:'900',color:'#70e1a1'}).setOrigin(1,.5)}else if(owned){btn=this.add.text(W-52,y+8,'선택',{fontSize:'16px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:12,y:8}}).setOrigin(1,.5).setInteractive();btn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.settings.selected=id;if(!this.job)this.hero?.setTint(L.tint);save(this.settings);this.applyUpgrades();this.sound.coin();this.showCharacters()})}else if(L.gem){const afford=this.settings.gems>=L.gem;btn=this.add.text(W-52,y+8,`${L.gem}💎`,{fontSize:'16px',fontStyle:'900',color:afford?'#102238':'#9fb3c8',backgroundColor:afford?'#ffd24a':'#33465a',padding:{x:12,y:8}}).setOrigin(1,.5);if(afford){btn.setInteractive();btn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();if(this.settings.gems<L.gem)return;this.settings.gems-=L.gem;this.settings.unlocked.push(id);this.settings.selected=id;if(!this.job)this.hero?.setTint(L.tint);save(this.settings);this.applyUpgrades();this.sound.coin();this.showCharacters()})}}else{btn=this.add.text(W-52,y+8,'미션 잠금',{fontSize:'14px',fontStyle:'900',color:'#9fb3c8'}).setOrigin(1,.5)}c.add(btn)});const close=this.add.text(W/2,H-56,'닫기',{fontSize:'22px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:24,y:11}}).setOrigin(.5).setInteractive();close.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.charOverlay?.destroy();this.charOverlay=null});c.add(close)}
  showWeapons(){this.weaponOverlay?.destroy();const c=this.weaponOverlay=this.add.container(0,0).setDepth(50);c.add(this.add.rectangle(W/2,H/2,W,H,0x0b1a2b,.96).setInteractive());c.add(this.add.text(W-34,52,'✖',{fontSize:'30px',fontStyle:'900',color:'#fff',backgroundColor:'#00000066',padding:{x:12,y:6}}).setOrigin(.5).setDepth(52).setInteractive().on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.weaponOverlay?.destroy();this.weaponOverlay=null}));c.add(this.add.text(W/2,54,'🔫 무기',{fontSize:'32px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5));c.add(this.add.text(W/2,88,`💎 ${this.settings.gems}  ·  🪙 ${this.coins}`,{fontSize:'18px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
    // 부제가 첫 무기 카드(위쪽 y124)에 가려 안 보였다. 머리말 전체를 위로 올려 띄운다.
    c.add(this.add.text(W/2,112,'해금은 💎 영구 · 강화는 🪙 이번 판만',{fontSize:'13px',color:'#8fb3c8'}).setOrigin(.5));WEAPONS.forEach((wp,idx)=>{const y=156+idx*112,owned=this.settings.weaponsOwned.includes(wp.id),sel=this.settings.weapon===wp.id,lv=this.settings.weaponLevels[wp.id]||0;c.add(this.add.rectangle(W/2,y+18,486,100,owned?0x1d4a3a:0x14304a,.92).setStrokeStyle(2,owned?0x70e1a1:0x2f597d));c.add(this.add.circle(50,y+18,15,wp.color));c.add(this.add.text(78,y-16,`${wp.name}${owned?`  Lv.${lv}`:''}`,{fontSize:'19px',fontStyle:'900',color:'#fff'}));c.add(this.add.text(78,y+8,wp.desc,{fontSize:'13px',color:'#bfe8ff'}));if(owned)c.add(this.add.text(78,y+30,`강화효과: ${wp.upDesc}`,{fontSize:'11px',color:'#8be28b'}));if(!owned){const afford=this.settings.gems>=wp.gem,btn=this.add.text(W-48,y+18,`${wp.gem}💎`,{fontSize:'17px',fontStyle:'900',color:afford?'#102238':'#9fb3c8',backgroundColor:afford?'#ffd24a':'#33465a',padding:{x:12,y:10}}).setOrigin(1,.5);if(afford){btn.setInteractive();btn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();if(this.settings.gems<wp.gem)return;this.settings.gems-=wp.gem;this.settings.weaponsOwned.push(wp.id);this.settings.weapon=wp.id;save(this.settings);this.sound.coin();this.rebuildArsenal();this.showWeapons()})}c.add(btn)}else{if(sel){c.add(this.add.text(W-48,y-6,'✓ 장착중',{fontSize:'15px',fontStyle:'900',color:'#70e1a1'}).setOrigin(1,.5))}else{const selBtn=this.add.text(W-48,y-6,'장착',{fontSize:'15px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:12,y:6}}).setOrigin(1,.5).setInteractive();selBtn.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.settings.weapon=wp.id;save(this.settings);this.sound.coin();this.rebuildArsenal();this.showWeapons()});c.add(selBtn)}const maxed=lv>=WEP_MAX,uc=wepUpCost(wp,lv),aff=this.coins>=uc,up=this.add.text(W-48,y+30,maxed?'강화 MAX':`강화 ${uc}🪙`,{fontSize:'15px',fontStyle:'900',color:maxed?'#9fb3c8':(aff?'#0b2b12':'#9fb3c8'),backgroundColor:maxed?'#33465a':(aff?'#8be28b':'#33465a'),padding:{x:11,y:6}}).setOrigin(1,.5);if(!maxed&&aff){up.setInteractive();up.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();const cc=wepUpCost(wp,this.settings.weaponLevels[wp.id]||0);if(this.coins<cc)return;this.coins-=cc;this.updateHud();this.settings.weaponLevels[wp.id]=(this.settings.weaponLevels[wp.id]||0)+1;save(this.settings);this.sound.coin();this.rebuildArsenal();this.showWeapons()})}c.add(up)}});const close=this.add.text(W/2,724,'✖ 닫기',{fontSize:'24px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:34,y:15}}).setOrigin(.5).setDepth(52).setInteractive();close.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.weaponOverlay?.destroy();this.weaponOverlay=null});c.add(close)}
  showLeaderboard(){this.lbOverlay?.destroy();const c=this.lbOverlay=this.add.container(0,0).setDepth(50);c.add(this.add.rectangle(W/2,H/2,W,H,0x0b1a2b,.95).setInteractive());c.add(this.add.text(W-34,52,'✖',{fontSize:'30px',fontStyle:'900',color:'#fff',backgroundColor:'#00000066',padding:{x:12,y:6}}).setOrigin(.5).setDepth(52).setInteractive().on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.lbOverlay?.destroy();this.lbOverlay=null}));c.add(this.add.text(W/2,92,'🏆 랭킹',{fontSize:'34px',fontStyle:'900',color:'#ffe082'}).setOrigin(.5));c.add(this.add.text(W/2,134,'내 최고 기록 TOP 10',{fontSize:'18px',color:'#bfe8ff'}).setOrigin(.5));const scores=Array.isArray(this.settings.scores)?this.settings.scores:[];if(!scores.length){c.add(this.add.text(W/2,320,'아직 기록이 없어요.\n한 판 지켜내고 첫 기록을 세워보세요!',{fontSize:'20px',color:'#fff',align:'center',lineSpacing:8}).setOrigin(.5))}else{scores.slice(0,10).forEach((s,i)=>{const y=185+i*58,medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;c.add(this.add.text(58,y,medal,{fontSize:'22px',fontStyle:'900',color:'#fff'}));c.add(this.add.text(112,y,`${(s.score||0).toLocaleString()}점`,{fontSize:'22px',fontStyle:'900',color:i<3?'#ffe082':'#fff'}));c.add(this.add.text(322,y,`WAVE ${s.wave||1}`,{fontSize:'17px',color:'#bfe8ff'}));c.add(this.add.text(W-38,y,(s.date||'').slice(5),{fontSize:'15px',color:'#9fb3c8'}).setOrigin(1,0))})}const close=this.add.text(W/2,H-70,'닫기',{fontSize:'22px',fontStyle:'900',color:'#102238',backgroundColor:'#ffe082',padding:{x:24,y:11}}).setOrigin(.5).setInteractive();close.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.lbOverlay?.destroy();this.lbOverlay=null});c.add(close)}
  update(_,delta){this.syncHud();let dt=Math.min(delta,50)/1000;if(this.time.now<(this._slowUntil||0))dt*=0.4;
    // hero always faces & aims at the nearest enemy (turret points at it), idle bob otherwise
    if(this.hero){const t=this.state==='playing'?this.nearestEnemy():null;if(t){this.hero.setFlipX(t.x<this.heroX);this.turret.setRotation(Phaser.Math.Angle.Between(this.heroX,BASE_LINE-22,t.x,t.y)+Math.PI/2)}else{this.hero.setFlipX(false);this.turret.setRotation(0)}this.hero.y=BASE_LINE-6+Math.sin(this.time.now/260)*1.5}
    if(this.auraOn){this.aura.setPosition(this.heroX,this.hero.y-24).setScale(1+Math.sin(this.time.now/120)*(this.auraBig?.18:.1)).setAlpha(.22+Math.abs(Math.sin(this.time.now/150))*.3);if(this.hairFx){this.hairFx.x=this.heroX;this.hairFx.y=this.hero.y-122;this.hairFx.setScale(1+Math.sin(this.time.now/90)*.08)}}
    if(this.wallTiles){this.wallTiles.tilePositionY-=6*dt;this.floorTiles.tilePositionX+=8*dt}
    if(this.state!=='playing'){this.warnText?.setVisible(false);return}
    if(this.streak>0&&this.time.now-this.streakAt>2400)this.streak=0;
    const baseFire=Math.max(70,520-this.upg.rate*70-(this.perkRate?85:0)-(this.perkRate2?190:0));for(const a of this.arsenal){const fm=Math.max(40,Math.round(baseFire*a.fireFactor*a.lvlFireMul*this.jobFireMul*(this.runFire||1)));if(this.time.now-a.lastFire>=fm){a.lastFire=this.time.now;this.fireWeapon(a)}}
    if(this.toSpawn>0&&this.time.now-this.lastSpawn>=this.spawnGap){this.lastSpawn=this.time.now;this.toSpawn--;this.spawnEnemy();
      // 동시 스폰 확률은 balance.js 가 정한다. 예전엔 WAVE 5 부터 3연속이 열려 초당 12마리가 쏟아졌다.
      if(this.toSpawn>0&&this.wave>=DOUBLE_FROM&&Phaser.Math.Between(1,100)<=DOUBLE_PCT){this.toSpawn--;this.spawnEnemy();if(this.toSpawn>0&&this.wave>=TRIPLE_FROM&&Phaser.Math.Between(1,100)<=TRIPLE_PCT){this.toSpawn--;this.spawnEnemy()}}}
    for(let i=this.bolts.length-1;i>=0;i--){const b=this.bolts[i];b.x+=b.vx*dt;b.y+=b.vy*dt;if(!this.reducedMotion&&((b._tc=(b._tc||0)+1)%2===0)){const tr=this.add.circle(b.x,b.y,(b.radius||4)*.8,b.fillColor,.4).setDepth(9);this.tweens.add({targets:tr,alpha:0,scale:.2,duration:130,onComplete:()=>tr.destroy()})}let dead=b.y<-30||b.x<-30||b.x>W+30;if(!dead){for(const e of this.enemies){if((!b.hits||!b.hits.has(e))&&Phaser.Math.Distance.Between(b.x,b.y,e.x,e.y)<=e.spec.r){this.hitEnemy(e,b.dmg,b.x,b.y);(b.hits||(b.hits=new Set())).add(e);if(--b.pierceLeft<=0){dead=true;if(b.explode||this.jobExplode)this.miniBlast(b.x,b.y,(b.miniR||72)*(this.jobExplodeBig?1.5:1))}break}}}if(dead){b.destroy();this.bolts.splice(i,1)}}
    let danger=0;for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];if(!e.active){this.enemies.splice(i,1);continue}const near=e.y>RUSH_FROM;e.y+=e.speed*(near?RUSH_MUL:1)*(this.time.now<this.freezeUntil?0.32:1)*dt;const amp=e.spec.weave||0.5,per=e.spec.weavePer||500;e.x=Phaser.Math.Clamp(e.x+Math.sin(this.time.now/per+(e.seed||0))*amp,38,W-38);if(!e.boss)e.rotation+=(e.spin||0)*dt*0.35;e.setScale(e.baseScale*(1+Math.sin(this.time.now/180+(e.seed||0))*0.06));const prox=Phaser.Math.Clamp((e.y-(BASE_LINE-300))/300,0,1);if(prox>danger)danger=prox;if(e.bar){const dmgd=e.hp<e.maxHp||e.boss;e.bar.setVisible(dmgd);e.barBg.setVisible(dmgd);e.bar.x=e.x;e.bar.y=e.y-32;e.bar.width=e.barW*Phaser.Math.Clamp(e.hp/e.maxHp,0,1);e.barBg.x=e.x;e.barBg.y=e.y-32}if(e.y>=BASE_LINE)this.baseHit(e)}
    if(this.state==='playing'&&this.toSpawn===0&&this.enemies.length===0){this.score+=100+this.wave*20;this.addCoin(12+this.wave*3)/* 보스가 줄어든 만큼 클리어 보상으로 코인 수급을 보전 */;this.sound.win();this.punch(1.05);this.betweenWaves()}
    const hpDng=1-Phaser.Math.Clamp(this.baseHp/this.baseMax,0,1),dng=Math.max(hpDng,danger*0.85);this.vignette.setAlpha(dng>.4?(dng-.4)/.6*.5:0);this.dangerLine.setAlpha(.25+danger*.6).setScale(1,1+danger*2.5).setFillStyle(0xff2b2b);if(this.comboGlow){const cg=this.streak>=10?(.22+.16*Math.abs(Math.sin(this.time.now/120))):0;this.comboGlow.setStrokeStyle(12,this.streak>=20?0xff5cc8:0xffb03a,cg)}if(danger>.78){this.warnText.setVisible(true).setAlpha(.5+Math.abs(Math.sin(this.time.now/110))*.5);if(this.time.now-this._lastWarn>700){this._lastWarn=this.time.now;this.sound.vibrate(30)}}else this.warnText.setVisible(false);
    const ready=this.time.now>=this.bombReadyAt;this.bombBtn.setFillStyle(ready?0x9c5cff:0x5a4a8a);this.bombIcon.setAlpha(ready?1:.5);this.bombArc.clear();if(!ready){const frac=Phaser.Math.Clamp((this.bombReadyAt-this.time.now)/this.bombCd,0,1);this.bombArc.fillStyle(0x101024,.5);this.bombArc.slice(W-62,892,42,Phaser.Math.DegToRad(-90),Phaser.Math.DegToRad(-90+360*frac),false);this.bombArc.fillPath()}if(ready&&!this.bombWasReady){this.bombWasReady=true;this.tweens.add({targets:this.bombIcon,scale:{from:1.45,to:1},duration:240,ease:'Back.easeOut'})}if(!ready)this.bombWasReady=false;this.bombLabel.setText(ready?'폭탄':'충전중').setColor(ready?'#1a7a3a':'#7a3a3a');
    if(this.itemBtn&&this.special){const iready=this.time.now>=this.specialReadyAt;this.itemBtn.setFillStyle(iready?this.special.color:0x3a4a5a);this.itemIcon.setAlpha(iready?1:.5);this.itemArc.clear();if(!iready){const frac=Phaser.Math.Clamp((this.specialReadyAt-this.time.now)/this.special.cd,0,1);this.itemArc.fillStyle(0x101024,.5);this.itemArc.slice(62,892,42,Phaser.Math.DegToRad(-90),Phaser.Math.DegToRad(-90+360*frac),false);this.itemArc.fillPath()}if(iready&&!this.itemWasReady){this.itemWasReady=true;this.tweens.add({targets:this.itemIcon,scale:{from:1.45,to:1},duration:240,ease:'Back.easeOut'})}if(!iready)this.itemWasReady=false;this.itemLabel.setText(iready?this.special.name:'충전중').setColor(iready?'#1a5a7a':'#7a3a3a')}
    this.updateHud()}
}

const __GAME=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#a9e8f3',disableVisibilityChange:true,render:{antialias:true,powerPreference:'low-power',batchSize:2048},fps:{target:60,min:30},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:GameScene});if(typeof window!=='undefined')window.__game=__GAME;
