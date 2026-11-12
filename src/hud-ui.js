import { t } from './i18n.js';
const INK='#264c57',MUTED='#65858d';
// 상단 정보 패널의 높이와 아래 끝 y. 세로가 긴 기기에서는 패널이 플레이 영역 위쪽 띠(BAND)에
// 올라가 적을 전혀 가리지 않고, 16:9 에서는 겹치므로 높이를 최소로 줄이고 반투명으로 깐다.
// main.js 의 입력 데드존이 이 값을 그대로 쓰므로, 바꾸면 양쪽이 같이 움직인다.
export const HUD_H=104, HUD_BOTTOM=12+HUD_H;
function label(s,x,y,value,size=16,color=INK,origin=.0){return s.add.text(x,y,value,{fontFamily:'"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',fontSize:size+'px',fontStyle:'bold',color}).setOrigin(origin,.5).setDepth(17)}
function rounded(g,x,y,w,h,color,r=12,alpha=1){g.fillStyle(color,alpha);g.fillRoundedRect(x,y,w,h,Math.min(r,w/2,h/2))}
function rail(g,x,y,w,h,fraction,color){g.clear();rounded(g,x,y,w,h,0xe3efec,h/2);const n=w*Math.max(0,Math.min(1,fraction));if(n>0)rounded(g,x,y,n,h,color,h/2)}
export const CARD_W=104, CARD_H=106;
// 카드 안 강화 버튼의 자리(카드 위쪽 y 기준). main.js 의 탭 판정이 같은 값을 쓴다.
export const UP_W=92, UP_H=22, UP_DY=78;
function actionCard(g,x,y,ready,color,alpha,up){
 g.clear();rounded(g,x-52,y+6,CARD_W,CARD_H,0x264c57,24,.12*alpha);rounded(g,x-52,y,CARD_W,CARD_H,0xf8fffc,24,alpha);
 g.lineStyle(2,ready?0xc1e7de:0xd6e3e2);g.strokeRoundedRect(x-52,y,CARD_W,CARD_H,24);
 rounded(g,x-39,y+8,78,48,ready?color:0xd3dedd,16);
 g.lineStyle(2,0xffffff,.85);g.strokeRoundedRect(x-39,y+8,78,48,16);
 // 강화 버튼. 살 수 있으면 코인색(금), 🪙이 모자라거나 만렙이면 눌러도 소용없다는 뜻으로 회색.
 const fill=up.max||!up.afford?0xe4ebe9:0xffd166, edge=up.max||!up.afford?0xd3dedd:0xe0a92c;
 rounded(g,x-UP_W/2,y+UP_DY,UP_W,UP_H,fill,UP_H/2);
 g.lineStyle(1.5,edge,.9);g.strokeRoundedRect(x-UP_W/2,y+UP_DY,UP_W,UP_H,UP_H/2);
}
/**
 * 액션 칸 4개(2x2)의 캔버스 좌표. 아랫줄은 화면 맨 아래에 붙여, 세로가 긴 기기에서 플레이
 * 영역 아래로 남는 빈 공간을 쓴다. 그 공간이 없는 16:9·태블릿(CANVAS_H=960)에서는 두 줄이
 * 통째로 위로 밀려 올라와, 잘려 안 보이는 칸이 생기지 않는다.
 * 반환값은 main.js 의 탭 판정이 그대로 쓰므로, 그림과 입력이 따로 놀 수 없다.
 */
export function slotRects(W,CANVAS_H){
 const GAP=8, row2=Math.min(CANVAS_H-10-CARD_H, 840+GAP+CARD_H), row1=Math.min(840, row2-GAP-CARD_H);
 return [[62,row1],[W-62,row1],[62,row2],[W-62,row2]].map(([x,y])=>({x,y}));
}
// 연속 처치 뱃지의 단계. 테마 하늘색이 밝은 하늘부터 거의 검정까지 바뀌는데 예전의 흰 반투명
// 알약은 어두운 테마에서 허옇게 들떠 보였다. 연속 수가 오를수록 색과 아이콘이 바뀌는 뱃지로 바꿨다.
const COMBO_TIERS=[
 {from:3,  fill:0x5ad2ef, edge:0x2b9fc0, icon:'✦'},
 {from:6,  fill:0x6fd98a, edge:0x3da85c, icon:'✦'},
 {from:10, fill:0xff8fc0, edge:0xdb5f97, icon:'★'},
 {from:16, fill:0xb47bff, edge:0x8549d6, icon:'★'},
 {from:25, fill:0xffc23d, edge:0xdb9413, icon:'👑'},
];
const comboTier=n=>{let best=COMBO_TIERS[0];for(const c of COMBO_TIERS)if(n>=c.from)best=c;return best};
function pin(s,o){
 if(!o||!s.hudCamera)return;o.cameraFilter|=s.cameras.main.id;o.cameraFilter&=~s.hudCamera.id;
 if(o.list)for(const child of o.list)pin(s,child);
}
export function createHudMethods({W,H,BASE_LINE,MISSIONS,BAND,CANVAS_H,ITEM_MAX,itemUpCost,repairBuyCost}){
 return {
 createHud(){
  this.hudCamera=null;
  // 16:9 기기에서는 패널이 적이 내려오는 길목을 덮는다. 높이를 188→104 로 줄이고 반투명(.72)으로
  // 깔아 뒤에 있는 적이 비쳐 보이게 한다. HUD_BOTTOM 은 입력 데드존과 맞춰야 한다.
  this.hudPanel=this.add.graphics().setDepth(14);
  rounded(this.hudPanel,12,18,W-24,HUD_H,0x264c57,22,.08);
  rounded(this.hudPanel,12,12,W-24,HUD_H,0xf4fffc,22,.72);
  this.hudPanel.lineStyle(2,0xc7e7e3,.9);this.hudPanel.strokeRoundedRect(12,12,W-24,HUD_H,22);
  rounded(this.hudPanel,302,18,112,28,0xd8f3e9,13);
  rounded(this.hudPanel,459,16,50,32,0xe8e0fa,13);
  // 인게임에 게임 제목을 다시 적을 이유가 없다. 그 줄을 빼고 점수·코인을 올려 패널을 128→104 로 줄였다.
  this.scoreText=label(this,30,32,t('점수 {n}',{n:0}),17);
  this.coinText=label(this,172,32,'🪙 0',16,'#946b24');
  this.waveText=label(this,358,32,'WAVE 1',15,INK,.5);
  this.pauseButton=this.add.rectangle(484,32,50,36,0xffffff,.001).setInteractive({useHandCursor:true}).setDepth(19);
  const pauseIcon=label(this,484,32,'Ⅱ',20,INK,.5);
  const baseLabel=label(this,30,60,t('기지'),12,MUTED);
  this.hpBar=this.add.graphics().setDepth(16);
  // 기지 수리는 회복 아이템을 대신한다. 기지 체력 옆에 둬야 '무엇을 고치는지'가 바로 읽힌다.
  this.healthValue=label(this,462,60,'100 / 100',11,MUTED,1);
  this.repairBtn=this.add.graphics().setDepth(16);
  this.repairText=label(this,499,60,'🔧1',11,INK,.5);
  this.repairHit=this.add.rectangle(499,60,62,28,0xffffff,.001).setInteractive({useHandCursor:true}).setDepth(19);
  this.repairHit.on('pointerdown',e=>{this._uiTap=true;e.event?.stopPropagation?.();this.repairBase()});
  this.levelText=label(this,30,84,'Lv.1',12,'#638a9e');
  this.xpBar=this.add.graphics().setDepth(16);
  this.xpValue=label(this,505,84,t('성장'),10,MUTED,1);
  this.wepHud=this.add.container(0,0).setDepth(16);this.buildWeaponHud();
  this.missionText=label(this,505,104,'',10,MUTED,1);
  // 콤보는 가끔 뜨는 축하 문구라 패널 안에 자리를 잡아두지 않고 바로 아래에 띄운다.
  // 뱃지와 글자를 한 컨테이너에 담아, 숫자가 오를 때 통째로 통통 튀게 한다.
  this.comboBox=this.add.container(W/2,HUD_BOTTOM+20).setDepth(16).setVisible(false);
  this.comboBadge=this.add.graphics();
  this.comboText=this.add.text(0,0,'',{fontFamily:'"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',fontSize:'16px',fontStyle:'900',color:'#ffffff',stroke:'#20414f',strokeThickness:4}).setOrigin(.5);
  this.comboBox.add([this.comboBadge,this.comboText]);
  // 액션 칸 4개. 어떤 칸에 무엇이 들어가는지는 판마다 달라지므로(main.js pickSlots),
  // 여기서는 빈 칸 네 개만 만들어 두고 내용은 updateActionHud 가 채운다.
  this.slotUi=slotRects(W,CANVAS_H).map(({x,y})=>({
   x,y,
   btn:this.add.graphics().setDepth(15),
   icon:label(this,x,y+32,'',26,INK,.5),
   // 남은 쿨다운은 아이콘 타일 위에 큰 숫자로 겹쳐 보여 준다. 카드 아래쪽은 강화 버튼이 쓴다.
   cool:this.add.text(x,y+32,'',{fontFamily:'"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',fontSize:'19px',fontStyle:'900',color:'#ffffff',stroke:'#2b4a5c',strokeThickness:4}).setOrigin(.5).setDepth(18),
   name:label(this,x,y+66,'',13,INK,.5),
   up:label(this,x,y+UP_DY+UP_H/2,'',11,INK,.5),
   cardKey:undefined, wasReady:false,
  }));
  // 아래 빈 공간이 없는 기기(16:9·태블릿)에서는 두 줄이 위로 밀려 올라와 플레이 영역을 덮는다.
  // 그럴 때만 상단 패널처럼 반투명으로 깔아, 칸 뒤로 내려오는 적이 비쳐 보이게 한다.
  this._slotAlpha=this.slotUi[0].y<840?.8:1;
  // 네 칸은 저마다 '탭해서 사용'이라고 적혀 있으니, 안내는 칸 말고 빈 화면을 눌러도 된다는 것만
  // 알려 주면 된다. 윗줄 칸보다 위에 둬서 주인공 얼굴을 가리지 않게 한다.
  this.hint=this.add.text(W/2,this.slotUi[0].y-22,t('빈 화면을 탭해도 물폭탄!'),{fontSize:'13px',fontStyle:'bold',color:INK,backgroundColor:'#f4fffcdd',padding:{x:12,y:6}}).setOrigin(.5).setDepth(16);
  this.time.delayedCall(6000,()=>{if(!this.hint)return;this.tweens.add({targets:this.hint,alpha:0,duration:500,onComplete:()=>{this.hint?.destroy();this.hint=null}})});
  this.warnText=this.add.text(W/2,BASE_LINE-46,t('기지가 위험해요!'),{fontSize:'23px',fontStyle:'bold',color:'#b65369',stroke:'#fff',strokeThickness:4}).setOrigin(.5).setDepth(15).setVisible(false);
  const slotParts=this.slotUi.flatMap(s=>[s.btn,s.icon,s.cool,s.name,s.up]);
  this.hudItems=[this.hudPanel,this.waveText,this.pauseButton,pauseIcon,this.scoreText,this.coinText,this.comboBox,baseLabel,this.repairBtn,this.repairText,this.repairHit,this.hpBar,this.healthValue,this.levelText,this.xpBar,this.xpValue,this.wepHud,this.missionText,...slotParts,this.hint];
  // 플레이 영역(540x960)을 캔버스 위쪽 BAND 만큼 아래로 내리고, 비워진 위쪽 띠에 HUD 를 둔다.
  // 메인 카메라는 뷰포트만 내려가므로 월드 좌표(BASE_LINE 등)는 하나도 손대지 않아도 된다.
  // BAND=0(16:9 기기)이면 예전과 똑같이 HUD 가 플레이 영역 위에 겹쳐 그려진다.
  if(BAND>0)this.cameras.main.setViewport(0,BAND,W,H);
  // 띠와 아래 여백은 메인 카메라 바깥이라 하늘색이 안 칠해진다. 테마 색으로 직접 채운다.
  this.bandFill=this.add.rectangle(W/2,BAND/2,W,BAND,0xa9e8f3).setDepth(-1).setVisible(BAND>0);
  const padH=CANVAS_H-BAND-H;
  this.padFill=this.add.rectangle(W/2,BAND+H+padH/2,W,padH,0x577a45).setDepth(-1).setVisible(padH>0);
  // HUD has its own fixed camera, so combat zoom / shake never clips its controls.
  const camera=this.hudCamera=this.cameras.add(0,0,W,CANVAS_H).setName('fixed-hud');
  const mask=o=>{o.cameraFilter|=camera.id};
  for(const o of this.children.list)mask(o);
  this.events.on('addedtoscene',mask);
  this.events.once('shutdown',()=>this.events.off('addedtoscene',mask));
  for(const o of [...this.hudItems,this.bandFill,this.padFill])pin(this,o);
  this.updateHud();this.updateActionHud();
 },
 buildWeaponHud(){
  if(!this.wepHud)return;this.wepHud.removeAll(true);
  (this.arsenal||[]).slice(0,1).forEach(a=>{
   const g=this.add.graphics();rounded(g,26,94,152,21,0xe7f3ef,10);this.wepHud.add(g);
   this.wepHud.add(this.add.circle(38,104.5,4,a.wp.color).setStrokeStyle(2,0xffffff));
   const txt=this.add.text(48,104.5,`${t(a.wp.name)} · Lv.${a.lv}`,{fontSize:'10px',fontStyle:'bold',color:INK}).setOrigin(0,.5);this.wepHud.add(txt);
  });
  pin(this,this.wepHud);
 },
 updateHud(){
  this.scoreText.setText(t('점수 {n}',{n:this.score.toLocaleString()}));this.waveText.setText(`WAVE ${this.wave}`);this.coinText.setText(`🪙 ${this.coins.toLocaleString()}`);
  const hp=Math.max(0,Math.min(1,this.baseHp/this.baseMax)),xp=Math.max(0,Math.min(1,this.xp/this.xpNext));
  rail(this.hpBar,80,54,330,11,hp,hp>.5?0x77ceb2:hp>.25?0xf2c77b:0xee9eaa);
  this.healthValue.setText(`${Math.max(0,Math.ceil(this.baseHp))} / ${this.baseMax}`);
  // 수리 버튼: 남은 횟수가 있고 실제로 다쳐 있을 때만 눈에 띄게 한다.
  const rep=this.repairs|0,useful=rep>0&&this.baseHp<this.baseMax;
  // 횟수가 떨어지면 가격을 띄워, 코인으로 살 수 있다는 걸 버튼 자체가 알려 준다.
  const buyCost=repairBuyCost(this.repairsBought||0),canBuy=rep===0&&this.coins>=buyCost;
  this.repairBtn.clear();rounded(this.repairBtn,468,49,62,22,useful?0x8fe3b4:canBuy?0xffd166:0xe4ebe9,11);
  this.repairBtn.lineStyle(1.5,useful?0x4fb584:canBuy?0xe0a92c:0xd3dedd,.9);this.repairBtn.strokeRoundedRect(468,49,62,22,11);
  this.repairText.setText(rep>0?`🔧${rep}`:`🔧${buyCost}`).setColor(useful?'#1c5e42':canBuy?'#7a5a12':MUTED);
  rail(this.xpBar,80,80,330,7,xp,0xb9a5e9);this.levelText.setText(`Lv.${this.level}`);this.xpValue.setText(`${Math.floor(xp*100)}%`);
  this.drawCombo();
  this.missionText.setText(t('오늘 {list}',{list:MISSIONS.map(m=>this.settings.completed?.[m.id]?'✓':`${Math.min(m.target,this.missionValue(m))}/${m.target}`).join(' · ')}));
 },
 /* 연속 처치 뱃지. 숫자가 바뀔 때만 다시 그리고 통통 튀는 연출을 넣는다. 매 프레임
    그래픽을 새로 그리면 비싸고, 연출도 끊기지 않고 계속 재시작돼 버린다. */
 drawCombo(){
  const n=this.streak;
  if(n<3){if(this._comboN){this.comboBox.setVisible(false);this._comboN=0}return}
  if(n===this._comboN)return;
  const tier=comboTier(n);
  this.comboText.setText(t('{icon} {n}연속!',{icon:tier.icon,n}));
  const w=Math.max(100,this.comboText.width+28),h=32;
  this.comboBadge.clear();
  rounded(this.comboBadge,-w/2,-h/2+4,w,h,0x16323f,h/2,.22);           // 바닥 그림자
  rounded(this.comboBadge,-w/2,-h/2,w,h,tier.fill,h/2);                // 알약 본체
  rounded(this.comboBadge,-w/2+5,-h/2+4,w-10,h*.42,0xffffff,h/2,.3);   // 위쪽 광택
  this.comboBadge.lineStyle(2,tier.edge,.95);this.comboBadge.strokeRoundedRect(-w/2,-h/2,w,h,h/2);
  // 오버레이가 떠서 HUD 를 숨긴 동안에는 혼자 다시 나타나면 안 된다.
  this.comboBox.setVisible(this._hudShown!==false);
  if(!this.reducedMotion){
   this.tweens.killTweensOf(this.comboBox);this.comboBox.setScale(1);
   this.tweens.add({targets:this.comboBox,scale:{from:1.28,to:1},duration:260,ease:'Back.easeOut'});
  }
  this._comboN=n;
 },
 updateActionHud(){
  if(!this.slotUi)return;
  const now=this.time.now;
  this.slotUi.forEach((ui,i)=>{
   const slot=this.slots?.[i];
   if(!slot){for(const t of [ui.icon,ui.cool,ui.name,ui.up])t.setText('');ui.btn.clear();ui.cardKey=undefined;return}
   // 아직 안 열린 칸. 자리는 그대로 두고 잠금만 보여 줘야 레이아웃이 안 흔들린다.
   if(this.wave<slot.openAt){
    const key=`lock:${slot.openAt}`;
    if(ui.cardKey!==key){actionCard(ui.btn,ui.x,ui.y,false,0xd3dedd,this._slotAlpha,{max:true,afford:false});ui.cardKey=key}
    ui.icon.setText('🔒').setAlpha(.5);ui.cool.setText('');
    ui.name.setText(`WAVE ${slot.openAt}`).setColor(MUTED);ui.up.setText(t('잠김')).setColor(MUTED);
    ui.wasReady=false;return}
   // 물폭탄은 강화로 쿨다운이 바뀌므로 판 전체가 공유하는 bombReadyAt/bombCd 를 그대로 본다.
   // 특수 아이템은 칸마다 따로 돌아야 해서 쿨다운을 칸에 들고 있다.
   const bomb=slot.kind==='bomb',readyAt=bomb?this.bombReadyAt:slot.readyAt;
   const ready=now>=readyAt,left=Math.max(0,readyAt-now);
   const max=slot.lv>=ITEM_MAX,cost=max?0:itemUpCost(slot.lv),afford=!max&&this.coins>=cost;
   // 카드 그림은 보이는 상태가 바뀔 때만 다시 그린다. 매 프레임 그리면 비싸다.
   const key=`${slot.name}:${ready}:${slot.lv}:${max||afford}`;
   if(ui.cardKey!==key){actionCard(ui.btn,ui.x,ui.y,ready,slot.color,this._slotAlpha,{max,afford});ui.cardKey=key}
   ui.icon.setText(slot.icon).setAlpha(ready?1:.3);
   ui.cool.setText(ready?'':(left/1000).toFixed(1));
   ui.name.setText(t(slot.name)).setColor(ready?INK:MUTED);
   ui.up.setText(max?`Lv.${ITEM_MAX} MAX`:`Lv.${slot.lv} · ${cost}🪙`).setColor(afford?'#7a5a12':MUTED);
   if(ready&&!ui.wasReady&&!this.reducedMotion)this.tweens.add({targets:ui.icon,scale:{from:1.12,to:1},duration:200});
   ui.wasReady=ready;
  });
 }
 };
}
