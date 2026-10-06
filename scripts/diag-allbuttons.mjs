import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.URL || 'http://localhost:5174/';
const VIEWPORTS = [ {w:540,h:1200,name:'20:9 tall'}, {w:540,h:1080,name:'18:9'}, {w:540,h:960,name:'9:16 exact'} ];
const wait = ms => new Promise(r => setTimeout(r, ms));

const CLEAR = () => { const s=window.__game.scene.scenes[0];
  ['weaponOverlay','shopOverlay','charOverlay','lbOverlay','resetOverlay','jobOverlay','pauseOverlay','reviveOverlay','overlay','adOverlay'].forEach(k=>{try{s[k]?.destroy()}catch{}; s[k]=null;}); };

for (const vp of VIEWPORTS) {
  const errors = [];
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox',`--window-size=${vp.w},${vp.h}`] });
  const p = await b.newPage(); await p.setViewport({width:vp.w,height:vp.h});
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle2' }); await wait(400);
  await p.evaluate(() => localStorage.setItem('urgentDefenseV1', JSON.stringify({
    coins:99999, weaponsOwned:['basic','shotgun','rapid','laser','grenade'], weapon:'shotgun',
    weaponLevels:{shotgun:3}, unlocked:['default'], selected:'default',
    scores:[{score:1200,wave:8,date:'2026-08-26'},{score:800,wave:5,date:'2026-08-25'}]
  })));
  await p.reload({ waitUntil: 'networkidle2' }); await wait(800);

  // Open screen fresh, tag every interactive+visible object, attach a recorder to each (fires even if the
  // handler destroys its own overlay), and return page-space centers.
  // rootKey: only enumerate interactive descendants of that scene-owned container (the modal),
  // so HUD/leaked scene objects behind the modal don't create false positives.
  const prep = async (opener, rootKey) => {
    await p.evaluate(opener); await wait(140);
    return p.evaluate((rk) => {
      const g = window.__game, s = g.scene.scenes[0];
      const r = g.canvas.getBoundingClientRect();
      const sx = r.width / g.scale.gameSize.width, sy = r.height / g.scale.gameSize.height;
      const root = rk ? s[rk] : s.children;
      const objs = [];
      const GW=g.scale.gameSize.width, GH=g.scale.gameSize.height;
      if (root) (function collect(n, vis){ const v = vis && (n.visible !== false); if (n.list) n.list.forEach(c=>collect(c,v)); if (n.input && n.input.enabled && v){ const b2=n.getBounds(); const scrim=(b2.width>=GW*0.9 && b2.height>=GH*0.9); if(!scrim) objs.push(n); } })(root, true);
      window.__hit = null;
      objs.forEach((o,i)=>{ o.__tid=i; o.once('pointerdown', ()=>{ window.__hit = i; }); });
      return objs.map((o,i)=>{ const bd=o.getBounds(); return { i, text:(o.text!==undefined?String(o.text):o.type).slice(0,14), x:r.left+bd.centerX*sx, y:r.top+bd.centerY*sy }; });
    }, rootKey);
  };

  async function sweep(name, opener, rootKey){
    const list = await prep(opener, rootKey); const n = list.length;
    let ok=0; const bad=[];
    for (let i=0;i<n;i++){
      await p.evaluate(CLEAR);
      const l2 = await prep(opener, rootKey);
      const it = l2[i]; if(!it){ continue; }
      await p.evaluate(()=>{ window.__hit=null; });
      await p.mouse.click(it.x, it.y); await wait(45);
      const hit = await p.evaluate(()=>window.__hit);
      if (hit === i) ok++; else bad.push(it.text);
    }
    await p.evaluate(CLEAR);
    console.log(`  [${name.padEnd(15)}] buttons=${n} OK=${ok} BAD=${bad.length}` + (bad.length?` -> ${JSON.stringify(bad)}`:' ✅'));
    return bad.length;
  }

  console.log(`\n=== Viewport ${vp.w}x${vp.h} (${vp.name}) ===`);
  let bad=0;
  bad += await sweep('시작(Start)',   ()=>{const s=window.__game.scene.scenes[0]; ['weaponOverlay','shopOverlay','charOverlay','lbOverlay','resetOverlay','jobOverlay','pauseOverlay','reviveOverlay','overlay'].forEach(k=>{try{s[k]?.destroy()}catch{};s[k]=null;}); s.showStart();}, 'overlay');
  bad += await sweep('무기(Weapons)',  ()=>window.__game.scene.scenes[0].showWeapons(), 'weaponOverlay');
  bad += await sweep('상점(Shop)',     ()=>window.__game.scene.scenes[0].showShop(), 'shopOverlay');
  bad += await sweep('수비대(Chars)',   ()=>window.__game.scene.scenes[0].showCharacters(), 'charOverlay');
  bad += await sweep('랭킹(Rank)',      ()=>window.__game.scene.scenes[0].showLeaderboard(), 'lbOverlay');
  bad += await sweep('초기화(Reset)',   ()=>window.__game.scene.scenes[0].confirmReset(), 'resetOverlay');
  bad += await sweep('전직(Job)',       ()=>{const s=window.__game.scene.scenes[0]; s.job=null; s.offerJob();}, 'jobOverlay');
  bad += await sweep('정지(Pause)',     ()=>{const s=window.__game.scene.scenes[0]; if(s.state!=='playing'){s.startGame();} s.state='playing'; s.pauseGame();}, 'pauseOverlay');
  bad += await sweep('부활(Revive)',    ()=>{const s=window.__game.scene.scenes[0]; if(s.state!=='playing')s.startGame(); s.showReviveOffer();}, 'reviveOverlay');
  // --- End screen (scene-level buttons) + in-game HUD: targeted effect checks ---
  const clickEffect = async (label, setup, gx, gy, readExpr) => {
    await p.evaluate(setup); await wait(160);
    const before = await p.evaluate(readExpr);
    const pg = await p.evaluate(({gx,gy})=>{const g=window.__game,r=g.canvas.getBoundingClientRect();return {x:r.left+gx*(r.width/g.scale.gameSize.width), y:r.top+gy*(r.height/g.scale.gameSize.height)};},{gx,gy});
    await p.mouse.click(pg.x, pg.y); await wait(140);
    const after = await p.evaluate(readExpr);
    const changed = JSON.stringify(before)!==JSON.stringify(after);
    console.log(`  [${label.padEnd(15)}] ${changed?'RESPONDED ✅':'no-change ❌'}`);
    return changed?0:1;
  };
  await p.reload({ waitUntil: 'networkidle2' }); await wait(700);
  // End screen: 랭킹 보기 -> opens lbOverlay ; 다시 도전 -> startGame resets score to 0 (set sentinel 999 first)
  bad += await clickEffect('게임오버:랭킹', ()=>{const s=window.__game.scene.scenes[0]; if(s.state!=='playing')s.startGame(); s.lbOverlay?.destroy(); s.lbOverlay=null; s.showEnd();}, 270,595, ()=>!!window.__game.scene.scenes[0].lbOverlay);
  bad += await clickEffect('게임오버:다시도전', ()=>{const s=window.__game.scene.scenes[0]; s.lbOverlay?.destroy(); s.lbOverlay=null; if(s.state!=='playing')s.startGame(); s.showEnd(); s.score=999;}, 270,655, ()=>window.__game.scene.scenes[0].score);
  // In-game HUD: pause (Ⅱ) -> state paused ; bomb -> bombsUsed++ ; item -> specialReadyAt changes
  bad += await clickEffect('HUD:일시정지', ()=>{const s=window.__game.scene.scenes[0]; s.pauseOverlay?.destroy(); s.pauseOverlay=null; if(s.state!=='playing')s.startGame(); s.state='playing';}, 488,96, ()=>window.__game.scene.scenes[0].state);
  bad += await clickEffect('HUD:폭탄', ()=>{const s=window.__game.scene.scenes[0]; s.pauseOverlay?.destroy(); s.pauseOverlay=null; if(s.state!=='playing')s.startGame(); s.state='playing'; s.bombReadyAt=0;}, 478,892, ()=>window.__game.scene.scenes[0].bombsUsed);
  bad += await clickEffect('HUD:아이템', ()=>{const s=window.__game.scene.scenes[0]; if(s.state!=='playing')s.startGame(); s.state='playing'; s.specialReadyAt=0;}, 62,892, ()=>Math.round(window.__game.scene.scenes[0].specialReadyAt));

  console.log(`  >>> total BAD = ${bad}` + (errors.length?`  | page-errors: ${[...new Set(errors)].join('; ')}`:''));
  await b.close();
}
