const INK='#264c57',MUTED='#65858d';
// 상단 정보 패널의 높이와 아래 끝 y. 세로가 긴 기기에서는 패널이 플레이 영역 위쪽 띠(BAND)에
// 올라가 적을 전혀 가리지 않고, 16:9 에서는 겹치므로 높이를 최소로 줄이고 반투명으로 깐다.
// main.js 의 입력 데드존이 이 값을 그대로 쓰므로, 바꾸면 양쪽이 같이 움직인다.
export const HUD_H=104, HUD_BOTTOM=12+HUD_H;
function label(s,x,y,value,size=16,color=INK,origin=.0){return s.add.text(x,y,value,{fontFamily:'"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',fontSize:size+'px',fontStyle:'bold',color}).setOrigin(origin,.5).setDepth(17)}
function rounded(g,x,y,w,h,color,r=12,alpha=1){g.fillStyle(color,alpha);g.fillRoundedRect(x,y,w,h,Math.min(r,w/2,h/2))}
function rail(g,x,y,w,h,fraction,color){g.clear();rounded(g,x,y,w,h,0xe3efec,h/2);const n=w*Math.max(0,Math.min(1,fraction));if(n>0)rounded(g,x,y,n,h,color,h/2)}
function actionCard(g,x,ready,color){
 g.clear();rounded(g,x-52,846,104,106,0x264c57,24,.12);rounded(g,x-52,840,104,106,0xf8fffc,24);
 g.lineStyle(2,ready?0xc1e7de:0xd6e3e2);g.strokeRoundedRect(x-52,840,104,106,24);
 rounded(g,x-39,850,78,53,ready?color:0xd3dedd,17);
 g.lineStyle(2,0xffffff,.85);g.strokeRoundedRect(x-39,850,78,53,17);
}
function pin(s,o){
 if(!o||!s.hudCamera)return;o.cameraFilter|=s.cameras.main.id;o.cameraFilter&=~s.hudCamera.id;
 if(o.list)for(const child of o.list)pin(s,child);
}
export function createHudMethods({W,H,BASE_LINE,MISSIONS,BAND,CANVAS_H}){
 return {
 createHud(){
  this.hudCamera=null;
  this._bombCardReady=undefined;this._itemCardKey=undefined;this.bombWasReady=false;this.itemWasReady=false;
  // 16:9 기기에서는 패널이 적이 내려오는 길목을 덮는다. 높이를 188→104 로 줄이고 반투명(.72)으로
  // 깔아 뒤에 있는 적이 비쳐 보이게 한다. HUD_BOTTOM 은 입력 데드존과 맞춰야 한다.
  this.hudPanel=this.add.graphics().setDepth(14);
  rounded(this.hudPanel,12,18,W-24,HUD_H,0x264c57,22,.08);
  rounded(this.hudPanel,12,12,W-24,HUD_H,0xf4fffc,22,.72);
  this.hudPanel.lineStyle(2,0xc7e7e3,.9);this.hudPanel.strokeRoundedRect(12,12,W-24,HUD_H,22);
  rounded(this.hudPanel,302,18,112,28,0xd8f3e9,13);
  rounded(this.hudPanel,459,16,50,32,0xe8e0fa,13);
  // 인게임에 게임 제목을 다시 적을 이유가 없다. 그 줄을 빼고 점수·코인을 올려 패널을 128→104 로 줄였다.
  this.scoreText=label(this,30,32,'점수 0',17);
  this.coinText=label(this,172,32,'🪙 0',16,'#946b24');
  this.waveText=label(this,358,32,'WAVE 1',15,INK,.5);
  this.pauseButton=this.add.rectangle(484,32,50,36,0xffffff,.001).setInteractive({useHandCursor:true}).setDepth(19);
  const pauseIcon=label(this,484,32,'Ⅱ',20,INK,.5);
  const baseLabel=label(this,30,60,'기지',12,MUTED);
  this.hpBar=this.add.graphics().setDepth(16);
  this.healthValue=label(this,505,60,'100 / 100',11,MUTED,1);
  this.levelText=label(this,30,84,'Lv.1',12,'#638a9e');
  this.xpBar=this.add.graphics().setDepth(16);
  this.xpValue=label(this,505,84,'성장',10,MUTED,1);
  this.wepHud=this.add.container(0,0).setDepth(16);this.buildWeaponHud();
  this.missionText=label(this,505,104,'',10,MUTED,1);
  // 콤보는 가끔 뜨는 축하 문구라 패널 안에 자리를 잡아두지 않고 바로 아래에 띄운다.
  // 이 자리는 기기에 따라 위쪽 띠와 벽 타일의 경계(y=BAND)와 겹칠 수 있어, 글자가 반씩 잘려 보인다.
  // 어느 쪽에 걸리든 읽히도록 반투명 알약 배경을 깔아 둔다.
  this.comboText=label(this,W/2,HUD_BOTTOM+16,'',15,'#bd7650',.5);
  this.comboText.setBackgroundColor('#f4fffccc');
  this.bombBtn=this.add.graphics().setDepth(15);this.itemBtn=this.add.graphics().setDepth(15);
  this.bombArc=this.add.graphics().setDepth(16);this.itemArc=this.add.graphics().setDepth(16);
  this.bombIcon=label(this,W-62,876,'💣',29,INK,.5);
  this.itemIcon=label(this,62,876,'🌧️',29,INK,.5);
  this.bombLabel=label(this,W-62,913,'물폭탄',16,INK,.5);
  this.itemLabel=label(this,62,913,'아이템',16,INK,.5);
  this.bombStatus=label(this,W-62,933,'탭해서 사용',11,MUTED,.5);
  this.itemStatus=label(this,62,933,'준비 완료',11,MUTED,.5);
  // 왼쪽 아이템은 버튼 탭, 오른쪽 물폭탄은 화면 탭이라 조작이 서로 달라 헷갈렸다. 이제 💣 버튼도
  // 직접 눌리고(가까운 적에게 날아간다) 화면 탭 조준도 그대로 된다 → 둘 다 알려 준다.
  this.hint=this.add.text(W/2,864,'화면 탭 또는 💣 버튼!',{fontSize:'13px',fontStyle:'bold',color:INK,backgroundColor:'#f4fffcdd',padding:{x:12,y:6}}).setOrigin(.5).setDepth(16);
  this.time.delayedCall(6000,()=>{if(!this.hint)return;this.tweens.add({targets:this.hint,alpha:0,duration:500,onComplete:()=>{this.hint?.destroy();this.hint=null}})});
  this.warnText=this.add.text(W/2,BASE_LINE-46,'기지가 위험해요!',{fontSize:'23px',fontStyle:'bold',color:'#b65369',stroke:'#fff',strokeThickness:4}).setOrigin(.5).setDepth(15).setVisible(false);
  this.hudItems=[this.hudPanel,this.waveText,this.pauseButton,pauseIcon,this.scoreText,this.coinText,this.comboText,baseLabel,this.hpBar,this.healthValue,this.levelText,this.xpBar,this.xpValue,this.wepHud,this.missionText,this.bombBtn,this.itemBtn,this.bombIcon,this.itemIcon,this.bombLabel,this.itemLabel,this.bombStatus,this.itemStatus,this.hint];
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
  for(const o of [...this.hudItems,this.bombArc,this.itemArc,this.bandFill,this.padFill])pin(this,o);
  this.updateHud();this.updateActionHud();
 },
 buildWeaponHud(){
  if(!this.wepHud)return;this.wepHud.removeAll(true);
  (this.arsenal||[]).slice(0,1).forEach(a=>{
   const g=this.add.graphics();rounded(g,26,94,152,21,0xe7f3ef,10);this.wepHud.add(g);
   this.wepHud.add(this.add.circle(38,104.5,4,a.wp.color).setStrokeStyle(2,0xffffff));
   const t=this.add.text(48,104.5,`${a.wp.name} · Lv.${a.lv}`,{fontSize:'10px',fontStyle:'bold',color:INK}).setOrigin(0,.5);this.wepHud.add(t);
  });
  pin(this,this.wepHud);
 },
 updateHud(){
  this.scoreText.setText(`점수 ${this.score.toLocaleString()}`);this.waveText.setText(`WAVE ${this.wave}`);this.coinText.setText(`🪙 ${this.coins.toLocaleString()}`);
  const hp=Math.max(0,Math.min(1,this.baseHp/this.baseMax)),xp=Math.max(0,Math.min(1,this.xp/this.xpNext));
  rail(this.hpBar,80,54,330,11,hp,hp>.5?0x77ceb2:hp>.25?0xf2c77b:0xee9eaa);
  this.healthValue.setText(`${Math.max(0,Math.ceil(this.baseHp))} / ${this.baseMax}`);
  rail(this.xpBar,80,80,330,7,xp,0xb9a5e9);this.levelText.setText(`Lv.${this.level}`);this.xpValue.setText(`${Math.floor(xp*100)}%`);
  // 배경 알약이 깔려 있어서, 빈 문자열이어도 숨기지 않으면 작은 흰 점이 남는다.
  const combo=this.streak>=3;this.comboText.setText(combo?`✦ ${this.streak}연속!`:'').setVisible(combo);
  this.missionText.setText('오늘 '+MISSIONS.map(m=>this.settings.completed?.[m.id]?'✓':`${Math.min(m.target,this.missionValue(m))}/${m.target}`).join(' · '));
 },
 updateActionHud(){
  const now=this.time.now,ready=now>=this.bombReadyAt,remaining=Math.max(0,this.bombReadyAt-now),fraction=ready?1:1-remaining/this.bombCd;
  // Card geometry only changes on ready transitions; progress rails remain inexpensive.
  if(this._bombCardReady!==ready){actionCard(this.bombBtn,W-62,ready,0x9c5cff);this._bombCardReady=ready}
  rail(this.bombArc,W-62-33,941,66,4,fraction,0xb4a1dd);
  this.bombIcon.setAlpha(ready?1:.48);this.bombLabel.setColor(ready?INK:MUTED);
  this.bombStatus.setText(ready?'탭해서 사용':`${(remaining/1000).toFixed(1)}초 뒤 준비`);
  if(ready&&!this.bombWasReady&&!this.reducedMotion)this.tweens.add({targets:this.bombIcon,scale:{from:1.12,to:1},duration:200});this.bombWasReady=ready;
  const special=this.special,iready=!special||now>=this.specialReadyAt,left=special?Math.max(0,this.specialReadyAt-now):0;
  // 예전 색(0xd9f3f7 등)은 꺼짐 색(0xe7eeed)과 거의 같아 준비됐는지 분간이 안 됐다. 진한 색으로 바꾼다.
  const color={rain:0x59c2ff,bolt:0xffd42e,freeze:0x5ad2ef,heal:0xff6b8a}[special?.id]||0x59c2ff;
  const key=`${special?.id}:${iready}`;
  if(this._itemCardKey!==key){actionCard(this.itemBtn,62,iready,color);this._itemCardKey=key}
  rail(this.itemArc,29,941,66,4,iready?1:1-left/special.cd,0x84cabb);
  this.itemIcon.setAlpha(iready?1:.48);this.itemLabel.setText(special?.name||'아이템').setColor(iready?INK:MUTED);
  this.itemStatus.setText(iready?'탭해서 사용':`${(left/1000).toFixed(1)}초 뒤 준비`);
  if(iready&&!this.itemWasReady&&!this.reducedMotion)this.tweens.add({targets:this.itemIcon,scale:{from:1.12,to:1},duration:200});this.itemWasReady=iready;
 }
 };
}
