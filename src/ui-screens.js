import { t, getLang, setLang, LANGS, LANG_NAMES } from './i18n.js';
// Shared visual language: clean bathroom tiles, soft mint, lilac, peach and cream.
const C={ink:'#264c57',muted:'#65858d',mint:0x77dec3,blue:0xdaf0ff,lilac:0xe6dcff,peach:0xffe1d7,gold:0xffe5a0,line:0xc7e7e3,white:0xffffff};
function text(s,c,x,y,value,size=18,color=C.ink,extra={}){
  const o=s.add.text(x,y,value,{fontFamily:'"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',fontSize:size+'px',fontStyle:'bold',color,align:'center',...extra}).setOrigin(.5);c.add(o);return o;
}
function card(s,c,x,y,w,h,fill=C.white,stroke=C.line,r=24){
  const g=s.add.graphics();g.fillStyle(0x497e86,.08);g.fillRoundedRect(x-w/2,y-h/2+6,w,h,r);
  g.fillStyle(fill,1);g.fillRoundedRect(x-w/2,y-h/2,w,h,r);g.lineStyle(2,stroke,1);g.strokeRoundedRect(x-w/2,y-h/2,w,h,r);c.add(g);return g;
}
function button(s,c,x,y,w,h,label,fill,action,size=20){
  const b=s.add.container(x,y).setName(label);c.add(b);card(s,b,0,0,w,h,fill,0xffffff,Math.min(23,h/2));
  const lbl=text(s,b,0,0,label,size,C.ink,{wordWrap:{width:w-24}});
  const hit=s.add.rectangle(0,0,w,h,0xffffff,.001).setName('action').setInteractive({useHandCursor:true});b.add(hit);
  hit.on('pointerdown',p=>{s._uiTap=true;p.event?.stopPropagation?.();s.sound.unlock();action(lbl)});
  return lbl;
}
function background(s,c){
  c.add(s.add.rectangle(270,480,540,960,0xeaf9f5).setInteractive());
  const g=s.add.graphics();g.lineStyle(1,0xc6e9e2,.38);
  for(let x=0;x<=540;x+=90)g.lineBetween(x,0,x,960);
  for(let y=0;y<=960;y+=90)g.lineBetween(0,y,540,y);
  g.fillStyle(0xf8f5ff,.94);g.fillRoundedRect(-30,590,600,430,90);c.add(g);
  [[38,100,13],[495,201,24],[64,459,20],[482,531,11],[455,870,19]].forEach(([x,y,r])=>{
    const bubble=s.add.circle(x,y,r,0xffffff,.35).setStrokeStyle(2,0xffffff,.9);c.add(bubble);
    c.add(s.add.circle(x-r*.3,y-r*.3,r*.22,0xffffff,.9));
  });
}
function screen(s,depth){const c=s.add.container(0,0).setDepth(depth);background(s,c);return c;}
function close(s,key){s[key]?.destroy();s[key]=null;}
function modal(s,key,title,subtitle){
  close(s,key);const c=s[key]=screen(s,50);
  text(s,c,270,66,title,32);text(s,c,270,111,subtitle,15,C.muted);
  button(s,c,270,846,444,58,t('닫기'),C.blue,()=>{close(s,key);if(s.state==='ready')s.showStart()});return c;
}
function art(s,c,tex,x,y,w,h,tint){const a=s.add.image(x,y,tex).setDisplaySize(w,h);if(tint)a.setTint(tint);c.add(a);return a;}

export function createScreenMethods(E){
 const {LOOKS,WEAPONS,MISSIONS,UPGRADES,RARITY,JOBS1,JOBS2,WEP_MAX,APP_VERSION,upgCost,wepUpCost,gemPayout,save,SAVE_KEY}=E;
 return {
  showStart(){
    this.setHudVisible(false);this.showBannerAd();close(this,'overlay');const ci=this.dailyCheckIn();
    const c=this.overlay=screen(this,20);
    text(this,c,120,43,t('말랑뽀짝 디펜스'),13,C.muted,{letterSpacing:2});
    card(this,c,440,43,144,40,0xffffff);text(this,c,440,43,`💎 ${this.settings.gems}`,17);
    // 언어 바꾸기. 맨 오른쪽은 💎 카운터가 쓰므로 그 왼쪽 빈자리(x 180~368)에 둔다.
    // 설정 안에만 두면 영어·일본어 사용자가 한국어 화면에서 '설정'을 찾아 들어가야 한다.
    button(this,c,268,43,104,36,`🌐 ${LANG_NAMES[getLang()]}`,0xffffff,()=>this.cycleLang(),13);
    // 칩 자체는 세로 36px — 실기기에서 약 27dp 라 손가락으로 누르기 빠듯하다. 보이는 크기는
    // 그대로 두고 누르는 영역만 넓힌다(약 49dp). 위에 덮으므로 칩의 원래 히트는 가려진다.
    const langHit=this.add.rectangle(268,43,150,64,0xffffff,.001).setInteractive({useHandCursor:true});
    c.add(langHit);
    langHit.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.cycleLang()});
    text(this,c,270,110,t('화장실'),48,C.ink,{fontStyle:'900'});
    text(this,c,270,172,t('수비대'),62,'#309b90',{fontStyle:'900',stroke:'#ffffff',strokeThickness:5});
    text(this,c,270,225,t('작은 변기와 함께, 오늘도 뽀송하게!'),17,C.muted);
    const halo=this.add.ellipse(270,371,306,184,0xffffff,.76);c.add(halo);
    card(this,c,270,414,220,40,0xccefe5,0xffffff,20);
    const hero=art(this,c,'poop',270,337,230,259,LOOKS[this.settings.selected]?.tint);
    hero.once('destroy',()=>this.tweens.killTweensOf(hero));
    art(this,c,'e_germ',85,394,80,80);art(this,c,'e_slime',455,397,82,82);
    if(!this.reducedMotion)this.tweens.add({targets:hero,y:330,duration:1600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    card(this,c,270,486,460,64);
    text(this,c,153,474,t('최고 점수'),12,C.muted);text(this,c,153,496,this.bestScore.toLocaleString(),22);
    text(this,c,390,474,t('최고 웨이브'),12,C.muted);text(this,c,390,496,`${this.bestWave}`,22);
    button(this,c,270,573,460,76,t('▶  화장실 지키러 가기'),C.mint,()=>this.startGame(),26);
    // 물폭탄은 화면 탭뿐 아니라 💣 버튼으로도 쏠 수 있게 바뀌었다. 안내도 둘 다 알려 줘야 한다.
    text(this,c,270,628,t('자동으로 발사해요 · 화면이나 물폭탄 버튼 탭!'),14,C.muted);
    button(this,c,150,693,220,66,t('💎  영구 강화'),C.gold,()=>this.showShop(),20);
    button(this,c,390,693,220,66,t('🚽  수비대'),C.lilac,()=>this.showCharacters(),20);
    button(this,c,150,773,220,66,t('🔫  무기 보관함'),C.blue,()=>this.showWeapons(),19);
    button(this,c,390,773,220,66,t('🏆  나의 기록'),C.peach,()=>this.showLeaderboard(),20);
    button(this,c,176,844,272,44,ci.reward?t('🎁 출석 +{n}💎 · 오늘의 미션',{n:ci.reward}):t('✓ 출석 완료 · 오늘의 미션'),0xffffff,()=>this.showMissions(),14);
    button(this,c,421,844,158,44,t('⚙ 설정'),0xffffff,()=>this.showSettings(),16);
    text(this,c,270,900,t('v{v}  ·  오늘도 뽀송한 하루!',{v:APP_VERSION}),12,C.muted);
  },
  /* 언어는 누를 때마다 ko → en → ja 로 돌아간다. 셋뿐이라 목록을 따로 띄울 이유가 없다.
     여기서 고르면 langPinned 가 서서, 그 뒤로는 기기 언어가 바뀌어도 이 선택이 유지된다. */
  cycleLang(from){
    const next=LANGS[(LANGS.indexOf(getLang())+1)%LANGS.length];
    setLang(next);this.settings.lang=next;this.settings.langPinned=true;this.persistSettings();
    this.sound.coin();
    from==='settings'?this.showSettings():this.showStart();
  },
  showSettings(){
    const c=modal(this,'resetOverlay',t('잠깐, 나만의 설정'),t('편안하게 즐길 수 있도록'));
    art(this,c,'poop',270,255,154,173);
    button(this,c,270,414,420,66,t('효과음  {s}',{s:this.sound.soundOn?t('켜짐 🔊'):t('꺼짐 🔇')}),C.blue,()=>{this.sound.soundOn=!this.sound.soundOn;this.persistSettings();this.showSettings()});
    button(this,c,270,500,420,66,t('진동  {s}',{s:this.sound.vibrationOn?t('켜짐'):t('꺼짐')}),C.lilac,()=>{this.sound.vibrationOn=!this.sound.vibrationOn;this.persistSettings();this.showSettings()});
    button(this,c,270,586,420,66,t('언어  {s}',{s:LANG_NAMES[getLang()]}),C.gold,()=>this.cycleLang('settings'));
    text(this,c,270,672,t('기록과 해금한 수비대는 자동으로 저장돼요.'),15,C.muted);
    button(this,c,270,744,300,48,t('데이터 초기화'),C.peach,()=>this.confirmReset(),16);
  },
  showMissions(){
    const c=modal(this,'resetOverlay',t('오늘의 작은 도전'),t('미션을 완료하면 새로운 수비대가 찾아와요'));
    MISSIONS.forEach((m,i)=>{const y=244+i*173,done=!!this.settings.completed?.[m.id],value=Math.min(m.target,this.missionValue(m));
      card(this,c,270,y,464,144);text(this,c,70,y-30,done?'✓':'○',24,'#309b90');
      text(this,c,292,y-34,t(m.label),21);text(this,c,270,y+4,t('선물: {name}',{name:t(LOOKS[m.reward].name)}),15,C.muted);
      card(this,c,270,y+42,396,14,0xe8f3f0,0xe8f3f0,7);
      const width=396*(done?1:value/m.target);if(width>0){const g=this.add.graphics();g.fillStyle(C.mint);g.fillRoundedRect(72,y+35,Math.max(14,width),14,7);c.add(g)}
      text(this,c,450,y+4,done?t('완료'):`${value}/${m.target}`,13,C.muted);
    });text(this,c,270,742,t('출석 {n}일째 · 내일도 만나요!',{n:this.settings.attendStreak||1}),15,C.muted);
  },
  confirmReset(){
    close(this,'resetOverlay');const c=this.resetOverlay=screen(this,55);
    card(this,c,270,440,472,436);text(this,c,270,300,t('기록을 초기화할까요?'),27);
    text(this,c,270,384,t('보석 · 강화 · 무기 · 수비대 · 기록이\n모두 지워져요. 되돌릴 수 없어요.'),17,C.muted,{lineSpacing:10});
    button(this,c,270,494,404,64,t('기록 지우지 않고 돌아가기'),C.mint,()=>{close(this,'resetOverlay');this.showSettings()},20);
    button(this,c,270,584,404,54,t('모두 초기화'),C.peach,()=>{try{localStorage.removeItem(SAVE_KEY)}catch{}this.scene.restart({autoStart:false})},17);
  },
  pauseGame(){
    if(this.state!=='playing')return;this.state='paused';const c=this.pauseOverlay=screen(this,44);
    text(this,c,270,92,t('잠깐 쉬어가요'),33);text(this,c,270,137,t('WAVE {w} · 수비대는 대기 중!',{w:this.wave}),16,C.muted);
    art(this,c,'poop',270,275,176,198);
    button(this,c,270,425,444,76,t('▶  계속 지키기'),C.mint,()=>this.resumeGame(),26);
    button(this,c,270,523,444,62,t('💎  영구 강화'),C.gold,()=>this.showShop());
    button(this,c,270,603,444,62,t('🔫  무기 구매 / 강화'),C.blue,()=>this.showWeapons());
    button(this,c,270,713,444,58,t('처음 화면으로'),C.lilac,()=>this.quitToStart(),19);
    text(this,c,270,772,t('여기서 마쳐도 💎 {n}개를 받아요.',{n:gemPayout(this.wave,this.score)}),15,C.muted);
  },
  offerUpgrade(){
    this.state='choosing';close(this,'upOverlay');const c=this.upOverlay=screen(this,48),pick=this.drawCards(3);
    text(this,c,270,85,t('반짝! 더 강해질 시간'),31);text(this,c,270,131,t('LEVEL {n} · 이번 판에 쓸 능력 하나를 골라요',{n:this.level}),15,C.muted);
    pick.forEach((u,i)=>{const y=260+i*158,R=RARITY[u.r],fill={common:C.blue,rare:C.lilac,epic:C.gold}[u.r],have=this.upCounts?.[u.id]||0;
      card(this,c,270,y,468,138,0xffffff,R.color);
      card(this,c,95,y,88,88,fill,0xffffff,24);text(this,c,95,y,u.icon,36);
      text(this,c,320,y-41,t(R.name),12,u.r==='epic'?'#9b650d':u.r==='rare'?'#7850a8':'#367c9c');
      text(this,c,320,y-8,`${t(u.name)}${have?` ×${have}`:''}`,23);text(this,c,320,y+32,t(u.desc),15,C.muted,{wordWrap:{width:302}});
      const hit=this.add.rectangle(270,y,468,138,0xffffff,.001).setInteractive({useHandCursor:true});c.add(hit);
      hit.on('pointerdown',p=>{this._uiTap=true;p.event?.stopPropagation?.();this.takeUpgrade(u)});
    });
    const free=this.rerolls>0;
    button(this,c,270,794,420,60,free?t('🎲 다시 뽑기 · {n}회',{n:this.rerolls}):t('🎬 광고 보고 다시 뽑기'),C.mint,btn=>{
      if(this.rerolls>0){this.rerolls--;this.sound.coin();this.offerUpgrade();return}
      btn.setText(t('광고 재생 중…'));this.showAd(()=>this.offerUpgrade(),()=>btn.setText(t('광고 취소됨 · 다시 시도')));
    },19);
  },
  offerJob(){
    this.state='choosing';close(this,'jobOverlay');const first=!this.job,opts=first?JOBS1:[JOBS2[this.job]],c=this.jobOverlay=screen(this,48);
    text(this,c,270,82,first?t('우리 수비대의 새 모습'):t('한 번 더, 멋지게 각성!'),30);text(this,c,270,128,t('마음에 드는 전직을 골라주세요'),16,C.muted);
    opts.forEach((o,i)=>{const y=first?274+i*196:400,cls=first?o.id:this.job;
      card(this,c,270,y,470,172,0xffffff,{warrior:0xffc6a6,mage:0xd4baff,archer:0xa9e6ba}[cls]);
      art(this,c,`poop_${o.id}`,101,y-5,118,133);text(this,c,332,y-34,t(o.name),27);
      text(this,c,330,y+24,t(o.desc),15,C.muted,{wordWrap:{width:292},lineSpacing:6});
      const hit=this.add.rectangle(270,y,470,172,0xffffff,.001).setInteractive({useHandCursor:true});c.add(hit);
      hit.on('pointerdown',p=>{this._uiTap=true;p.event?.stopPropagation?.();this.applyJob(o.id,first)});
    });
  },
  showReviveOffer(){
    this.state='dying';this.setHudVisible(false);this.clearBanners();this.sound.hurt();this.sound.vibrate([40,25,40]);
    const c=this.reviveOverlay=screen(this,46);
    text(this,c,270,92,t('앗, 잠깐 미끄러졌어요!'),30);text(this,c,270,140,t('다시 일어설 기회가 한 번 있어요.'),17,C.muted);
    art(this,c,'poop',270,292,210,236);text(this,c,405,274,'💧',25);
    card(this,c,270,471,460,126);text(this,c,270,445,t('WAVE {w} · {n}점',{w:this.wave,n:this.score.toLocaleString()}),23);
    text(this,c,270,493,t('광고 시청 후 체력 50%로 다시 시작해요.'),16,C.muted);
    button(this,c,270,604,460,76,t('🎬  광고 보고 한 번 더'),C.mint,()=>this.watchAdRevive(),25);
    button(this,c,270,704,460,62,t('이번 기록 확인하기'),C.blue,()=>this.declineRevive(),21);
    let remaining=7;const timer=text(this,c,270,777,t('{n}초 뒤 기록 화면으로 이동',{n:remaining}),14,C.muted);
    this.reviveTimer=this.time.addEvent({delay:1000,repeat:6,callback:()=>{remaining--;if(remaining<=0){this.reviveTimer=null;this.declineRevive();return}timer.setText(t('{n}초 뒤 기록 화면으로 이동',{n:remaining}))}});
  },
  showEnd(){
    const {final,isBest,rank,ranked,newly,gems,earned}=this.settleRun(),c=this.endOverlay=screen(this,30);
    const grade=this.wave>=25?'S':this.wave>=16?'A':this.wave>=8?'B':'C';
    text(this,c,270,43,t('이번 출전 결과'),14,C.muted,{letterSpacing:2});
    art(this,c,'poop',270,148,174,196);
    text(this,c,270,263,isBest?t('최고예요! 새로운 기록!'):t('수고했어요, 수비대!'),30);
    card(this,c,270,435,476,274);
    text(this,c,270,328,t('WAVE {w} 도달  ·  {g}등급',{w:this.wave,g:grade})+(ranked?t('  ·  나의 {r}위',{r:rank}):''),17,C.muted);
    text(this,c,270,383,final.toLocaleString(),52,'#309b90',{fontStyle:'900'});text(this,c,270,428,t('점'),13,C.muted);
    text(this,c,270,466,t('장난꾸러기 {k}마리 처치  ·  물폭탄 {b}회',{k:this.kills,b:this.bombsUsed}),15,C.muted);
    card(this,c,270,520,422,56,C.gold,0xffffff,20);text(this,c,270,520,t('💎 +{g}개  ·  보유 {total}개',{g:gems,total:this.settings.gems}),21);
    const unlock=newly.length?t('새 수비대 해금: {list}',{list:newly.map(n=>t(n)).join(' · ')}):t('모은 보석으로 다음 출전을 준비해요.');
    text(this,c,270,594,unlock,15,C.muted,{wordWrap:{width:460}});
    button(this,c,270,663,460,76,t('▶  다시 지키러 가기'),C.mint,()=>{this._interCount=(this._interCount||0)+1;if(this._interCount%3===0)this.showInterstitial();this.startGame()},25);
    let used=false;button(this,c,270,748,460,58,t('🎬 광고 보고 보석 2배 · +{g}💎',{g:gems}),C.gold,btn=>{
      if(used)return;used=true;btn.setText(t('광고 재생 중…'));this.showAd(()=>{this.settings.gems=(+this.settings.gems||0)+gems;save(this.settings);this.sound.coin();btn.setText(t('✓ 보석 받았어요! 보유 {n}개',{n:this.settings.gems}))},()=>{used=false;t.setText(t('광고 취소됨 · 다시 시도'))});
    },18);
    button(this,c,150,824,220,54,t('처음 화면'),C.blue,()=>this.scene.restart({autoStart:false}),18);
    button(this,c,390,824,220,54,t('🏆 나의 기록'),C.lilac,()=>this.showLeaderboard(),18);
    text(this,c,270,881,t('보석·영구 해금 유지 / 코인 {n}개·무기 강화는 이번 판만',{n:earned}),11,C.muted);
    const share=t('화장실 수비대 {g}등급 · WAVE {w} · {n}점',{g:grade,w:this.wave,n:final.toLocaleString()});
    const shareLink=text(this,c,463,43,t('기록 공유 ↗'),12,C.muted).setInteractive({useHandCursor:true});
    shareLink.on('pointerdown',async p=>{this._uiTap=true;p.event?.stopPropagation?.();try{if(navigator.share)await navigator.share({title:t('화장실 수비대'),text:share});else await navigator.clipboard.writeText(share);shareLink.setText(t('완료 ✓'))}catch{shareLink.setText(t('기록 공유 ↗'))}});
  },
  showShop(){
    const c=modal(this,'shopOverlay',t('조금씩 더 든든하게'),t('영구 강화 · 보유 💎 {n}개',{n:this.settings.gems}));
    UPGRADES.forEach((u,i)=>{const y=218+i*114,lvl=this.upg[u.id],maxed=lvl>=u.max,cost=upgCost(u,lvl),afford=this.settings.gems>=cost;
      card(this,c,270,y,476,98);text(this,c,181,y-19,`${t(u.name)}  ${lvl}/${u.max}`,21);text(this,c,181,y+19,t(u.desc),14,C.muted);
      button(this,c,435,y,116,58,maxed?'MAX':`${cost}💎`,maxed||!afford?0xeaf0ee:C.gold,()=>{
        if(maxed||this.settings.gems<cost)return;this.settings.gems-=cost;this.upg[u.id]++;this.settings.upgrades[u.id]=this.upg[u.id];save(this.settings);this.sound.coin();this.applyUpgrades();this.showShop();
      },19);
    });text(this,c,270,773,t('한 번 강화하면 다음 판에도 계속 유지돼요.'),15,C.muted);
  },
  showCharacters(){
    const c=modal(this,'charOverlay',t('오늘 함께할 수비대'),t('보유 💎 {n}개 · 스킨마다 작은 특기가 있어요',{n:this.settings.gems}));
    Object.entries(LOOKS).forEach(([id,L],i)=>{const y=185+i*86,owned=this.settings.unlocked.includes(id),selected=this.settings.selected===id;
      card(this,c,270,y,480,76,selected?0xe0f7ed:0xffffff,selected?0x77cbae:C.line,18);art(this,c,'poop',76,y-4,64,72,L.tint);
      text(this,c,236,y-15,t(L.name),18);text(this,c,236,y+16,L.desc?t(L.desc):t('기본'),12,C.muted);
      button(this,c,442,y,110,48,selected?t('함께하는 중'):owned?t('선택'):L.gem?`${L.gem}💎`:t('미션 해금'),selected?0xc8eedf:owned?C.blue:L.gem?(this.settings.gems>=L.gem?C.gold:0xeaf0ee):C.lilac,()=>{
        if(selected)return;if(!owned){if(!L.gem||this.settings.gems<L.gem)return;this.settings.gems-=L.gem;this.settings.unlocked.push(id)}
        this.settings.selected=id;if(!this.job)this.hero?.setTint(L.tint);save(this.settings);this.applyUpgrades();this.sound.coin();this.showCharacters();
      },13);
    });text(this,c,270,774,this.job?t('선택한 스킨은 다음 출전부터 적용돼요.'):t('마음에 드는 색으로 함께 출전해요.'),14,C.muted);
  },
  showWeapons(){
    const c=modal(this,'weaponOverlay',t('뽀송한 무기 보관함'),t('해금 💎 {g}  ·  이번 판 강화 🪙 {c}',{g:this.settings.gems,c:this.coins}));
    WEAPONS.forEach((wp,i)=>{const y=214+i*116,owned=this.settings.weaponsOwned.includes(wp.id),sel=this.settings.weapon===wp.id,lv=this.settings.weaponLevels[wp.id]||0;
      card(this,c,270,y,480,104,sel?0xe5f8ef:0xffffff,sel?0x77cbae:C.line,20);
      c.add(this.add.circle(61,y-15,13,wp.color).setStrokeStyle(3,0xffffff));text(this,c,230,y-25,`${t(wp.name)}${owned?` · Lv.${lv}`:''}`,19);
      text(this,c,220,y+5,t(wp.desc),13,C.muted);text(this,c,220,y+30,owned?t(wp.upDesc):t('해금하면 다음 판에도 쓸 수 있어요'),11,C.muted);
      if(!owned)button(this,c,446,y,108,58,`${wp.gem}💎`,this.settings.gems>=wp.gem?C.gold:0xeaf0ee,()=>{
        if(this.settings.gems<wp.gem)return;this.settings.gems-=wp.gem;this.settings.weaponsOwned.push(wp.id);this.settings.weapon=wp.id;save(this.settings);this.sound.coin();this.rebuildArsenal();this.showWeapons();
      },18);
      else{
        button(this,c,446,y-24,108,36,sel?t('✓ 장착 중'):t('장착'),sel?0xc8eedf:C.blue,()=>{if(sel)return;this.settings.weapon=wp.id;save(this.settings);this.sound.coin();this.rebuildArsenal();this.showWeapons()},13);
        const maxed=lv>=WEP_MAX,cost=wepUpCost(wp,lv);
        button(this,c,446,y+23,108,38,maxed?t('강화 MAX'):`${cost}🪙`,maxed||this.coins<cost?0xeaf0ee:C.gold,()=>{
          if(maxed||this.coins<cost)return;this.coins-=cost;this.settings.weaponLevels[wp.id]=lv+1;save(this.settings);this.updateHud();this.sound.coin();this.rebuildArsenal();this.showWeapons();
        },13);
      }
    });text(this,c,270,776,t('무기는 영구 해금 · 코인 강화는 이번 판만!'),14,C.muted);
  },
  showLeaderboard(){
    const c=modal(this,'lbOverlay',t('차곡차곡, 나의 기록'),t('내가 지켜낸 순간들 · 최고 기록 10개'));
    const scores=Array.isArray(this.settings.scores)?this.settings.scores:[];
    if(!scores.length){art(this,c,'poop',270,350,200,225);text(this,c,270,532,t('아직 첫 출전 전이에요.'),24);text(this,c,270,582,t('작은 변기와 첫 기록을 만들어볼까요?'),16,C.muted)}
    scores.slice(0,10).forEach((s,i)=>{const y=188+i*58;card(this,c,270,y,480,48,i===0?0xfff0c9:0xffffff,C.line,15);
      text(this,c,65,y,`${i+1}`,20,i===0?'#9b650d':C.muted);text(this,c,206,y,t('{n}점',{n:(s.score||0).toLocaleString()}),20);
      text(this,c,356,y,`W${s.wave||1}`,16,C.muted);text(this,c,464,y,(s.date||'').slice(5),12,C.muted);
    });
  }
 };
}
