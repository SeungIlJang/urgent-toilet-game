const INK='#264c57',MUTED='#65858d';
function label(s,x,y,value,size=16,color=INK,origin=.0){return s.add.text(x,y,value,{fontFamily:'"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',fontSize:size+'px',fontStyle:'bold',color}).setOrigin(origin,.5).setDepth(17)}
function rounded(g,x,y,w,h,color,r=12,alpha=1){g.fillStyle(color,alpha);g.fillRoundedRect(x,y,w,h,Math.min(r,w/2,h/2))}
function rail(g,x,y,w,h,fraction,color){g.clear();rounded(g,x,y,w,h,0xe3efec,h/2);const n=w*Math.max(0,Math.min(1,fraction));if(n>0)rounded(g,x,y,n,h,color,h/2)}
function actionCard(g,x,ready,color){
 g.clear();rounded(g,x-52,846,104,106,0x264c57,24,.12);rounded(g,x-52,840,104,106,0xf8fffc,24);
 g.lineStyle(2,ready?0xc1e7de:0xd6e3e2);g.strokeRoundedRect(x-52,840,104,106,24);
 rounded(g,x-39,850,78,53,ready?color:0xe7eeed,17);
 g.lineStyle(2,0xffffff,.85);g.strokeRoundedRect(x-39,850,78,53,17);
}
function pin(s,o){
 if(!o||!s.hudCamera)return;o.cameraFilter|=s.cameras.main.id;o.cameraFilter&=~s.hudCamera.id;
 if(o.list)for(const child of o.list)pin(s,child);
}
export function createHudMethods({W,BASE_LINE,MISSIONS}){
 return {
 createHud(){
  this.hudCamera=null;
  this._bombCardReady=undefined;this._itemCardKey=undefined;this.bombWasReady=false;this.itemWasReady=false;
  this.hudPanel=this.add.graphics().setDepth(14);
  rounded(this.hudPanel,12,18,W-24,188,0x264c57,25,.10);
  rounded(this.hudPanel,12,12,W-24,188,0xf4fffc,25,.98);
  this.hudPanel.lineStyle(2,0xc7e7e3);this.hudPanel.strokeRoundedRect(12,12,W-24,188,25);
  rounded(this.hudPanel,302,22,112,34,0xd8f3e9,14);
  rounded(this.hudPanel,459,22,50,38,0xe8e0fa,14);
  const title=label(this,30,39,'화장실 수비대',20);
  this.waveText=label(this,358,39,'WAVE 1',16,INK,.5);
  this.pauseButton=this.add.rectangle(484,41,50,42,0xffffff,.001).setInteractive({useHandCursor:true}).setDepth(19);
  const pauseIcon=label(this,484,41,'Ⅱ',22,INK,.5);
  this.scoreText=label(this,30,77,'점수 0',18);
  this.coinText=label(this,W-33,77,'🪙 0',17,'#946b24',1);
  this.comboText=label(this,276,77,'',15,'#bd7650',.5);
  const baseLabel=label(this,30,113,'기지',13,MUTED);
  this.hpBar=this.add.graphics().setDepth(16);
  this.healthValue=label(this,505,113,'100 / 100',12,MUTED,1);
  this.levelText=label(this,30,143,'Lv.1',13,'#638a9e');
  this.xpBar=this.add.graphics().setDepth(16);
  this.xpValue=label(this,505,143,'성장',11,MUTED,1);
  this.wepHud=this.add.container(0,0).setDepth(16);this.buildWeaponHud();
  this.missionText=label(this,505,177,'',11,MUTED,1);
  this.bombBtn=this.add.graphics().setDepth(15);this.itemBtn=this.add.graphics().setDepth(15);
  this.bombArc=this.add.graphics().setDepth(16);this.itemArc=this.add.graphics().setDepth(16);
  this.bombIcon=label(this,W-62,876,'💣',29,INK,.5);
  this.itemIcon=label(this,62,876,'🌧️',29,INK,.5);
  this.bombLabel=label(this,W-62,913,'물폭탄',16,INK,.5);
  this.itemLabel=label(this,62,913,'아이템',16,INK,.5);
  this.bombStatus=label(this,W-62,933,'탭해서 사용',11,MUTED,.5);
  this.itemStatus=label(this,62,933,'준비 완료',11,MUTED,.5);
  this.hint=this.add.text(W/2,864,'화면을 탭하면 물폭탄!',{fontSize:'13px',fontStyle:'bold',color:INK,backgroundColor:'#f4fffcdd',padding:{x:12,y:6}}).setOrigin(.5).setDepth(16);
  this.time.delayedCall(6000,()=>{if(!this.hint)return;this.tweens.add({targets:this.hint,alpha:0,duration:500,onComplete:()=>{this.hint?.destroy();this.hint=null}})});
  this.warnText=this.add.text(W/2,BASE_LINE-46,'기지가 위험해요!',{fontSize:'23px',fontStyle:'bold',color:'#b65369',stroke:'#fff',strokeThickness:4}).setOrigin(.5).setDepth(15).setVisible(false);
  this.hudItems=[this.hudPanel,title,this.waveText,this.pauseButton,pauseIcon,this.scoreText,this.coinText,this.comboText,baseLabel,this.hpBar,this.healthValue,this.levelText,this.xpBar,this.xpValue,this.wepHud,this.missionText,this.bombBtn,this.itemBtn,this.bombIcon,this.itemIcon,this.bombLabel,this.itemLabel,this.bombStatus,this.itemStatus,this.hint];
  // HUD has its own fixed camera, so combat zoom / shake never clips its controls.
  const camera=this.hudCamera=this.cameras.add(0,0,W,960).setName('fixed-hud');
  const mask=o=>{o.cameraFilter|=camera.id};
  for(const o of this.children.list)mask(o);
  this.events.on('addedtoscene',mask);
  this.events.once('shutdown',()=>this.events.off('addedtoscene',mask));
  for(const o of [...this.hudItems,this.bombArc,this.itemArc])pin(this,o);
  this.updateHud();this.updateActionHud();
 },
 buildWeaponHud(){
  if(!this.wepHud)return;this.wepHud.removeAll(true);
  (this.arsenal||[]).slice(0,1).forEach(a=>{
   const g=this.add.graphics();rounded(g,26,162,163,29,0xe7f3ef,12);this.wepHud.add(g);
   this.wepHud.add(this.add.circle(41,176,5,a.wp.color).setStrokeStyle(2,0xffffff));
   const t=this.add.text(54,176,`${a.wp.name} · Lv.${a.lv}`,{fontSize:'11px',fontStyle:'bold',color:INK}).setOrigin(0,.5);this.wepHud.add(t);
  });
  pin(this,this.wepHud);
 },
 updateHud(){
  this.scoreText.setText(`점수 ${this.score.toLocaleString()}`);this.waveText.setText(`WAVE ${this.wave}`);this.coinText.setText(`🪙 ${this.coins.toLocaleString()}`);
  const hp=Math.max(0,Math.min(1,this.baseHp/this.baseMax)),xp=Math.max(0,Math.min(1,this.xp/this.xpNext));
  rail(this.hpBar,86,106,322,14,hp,hp>.5?0x77ceb2:hp>.25?0xf2c77b:0xee9eaa);
  this.healthValue.setText(`${Math.max(0,Math.ceil(this.baseHp))} / ${this.baseMax}`);
  rail(this.xpBar,86,139,322,8,xp,0xb9a5e9);this.levelText.setText(`Lv.${this.level}`);this.xpValue.setText(`${Math.floor(xp*100)}%`);
  this.comboText.setText(this.streak>=3?`✦ ${this.streak}연속!`:'');
  this.missionText.setText('오늘 '+MISSIONS.map(m=>this.settings.completed?.[m.id]?'✓':`${Math.min(m.target,this.missionValue(m))}/${m.target}`).join(' · '));
 },
 updateActionHud(){
  const now=this.time.now,ready=now>=this.bombReadyAt,remaining=Math.max(0,this.bombReadyAt-now),fraction=ready?1:1-remaining/this.bombCd;
  // Card geometry only changes on ready transitions; progress rails remain inexpensive.
  if(this._bombCardReady!==ready){actionCard(this.bombBtn,W-62,ready,0xe6dcff);this._bombCardReady=ready}
  rail(this.bombArc,W-62-33,941,66,4,fraction,0xb4a1dd);
  this.bombIcon.setAlpha(ready?1:.48);this.bombLabel.setColor(ready?INK:MUTED);
  this.bombStatus.setText(ready?'화면 탭으로 사용':`${(remaining/1000).toFixed(1)}초 뒤 준비`);
  if(ready&&!this.bombWasReady&&!this.reducedMotion)this.tweens.add({targets:this.bombIcon,scale:{from:1.12,to:1},duration:200});this.bombWasReady=ready;
  const special=this.special,iready=!special||now>=this.specialReadyAt,left=special?Math.max(0,this.specialReadyAt-now):0;
  const color={rain:0xdaefff,bolt:0xffedb9,freeze:0xd9f3f7,heal:0xffe1e7}[special?.id]||0xdaefff;
  const key=`${special?.id}:${iready}`;
  if(this._itemCardKey!==key){actionCard(this.itemBtn,62,iready,color);this._itemCardKey=key}
  rail(this.itemArc,29,941,66,4,iready?1:1-left/special.cd,0x84cabb);
  this.itemIcon.setAlpha(iready?1:.48);this.itemLabel.setText(special?.name||'아이템').setColor(iready?INK:MUTED);
  this.itemStatus.setText(iready?'탭해서 사용':`${(left/1000).toFixed(1)}초 뒤 준비`);
  if(iready&&!this.itemWasReady&&!this.reducedMotion)this.tweens.add({targets:this.itemIcon,scale:{from:1.12,to:1},duration:200});this.itemWasReady=iready;
 }
 };
}
