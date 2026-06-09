const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const zonesUI=document.getElementById('zonesUI');
const lastResult=document.getElementById('lastResult');
const soundBtn=document.getElementById('soundBtn');
const launchBtn=document.getElementById('launchBtn');
const togglePanelBtn=document.getElementById('togglePanelBtn');
const panel=document.getElementById('panel');
const resultOverlay=document.getElementById('resultOverlay');
const resultText=document.getElementById('resultText');
let soundOn=true,running=false,pig=null,sparkles=[];
let resultTimer=null;

const ZONE_W=240;
const CANNON_WORLD_X=-1800;
function dpr(){return devicePixelRatio||1;}
function resize(){canvas.width=canvas.clientWidth*dpr();canvas.height=canvas.clientHeight*dpr();}
window.addEventListener('resize',resize);resize();
let camX=CANNON_WORLD_X*dpr();
let targetCamX=camX;

const defaults=[
  {name:'5 Subs',        amount:'🎉 5 Subs',              sub:['5','5','5','5','5']},
  {name:'10 Subs',       amount:'🎊 10 Subs',             sub:['10','10','10','10','10']},
  {name:'15 Subs',       amount:'✨ 15 Subs',              sub:['15','15','15','15','15']},
  {name:'25 Subs',       amount:'🐷 25 Subs',             sub:['25','25','25','25','25']},
  {name:'Gift Your Age', amount:'🎂 Gift Your Age',       sub:['age','age','age','age','age']},
  {name:'Pushup Gifting',amount:'💪 Gift = Your Pushups', sub:['pushups','pushups','pushups','pushups','pushups']}
];
const zones=JSON.parse(localStorage.getItem('oinkZones')||'null')||defaults;
function saveZones(){localStorage.setItem('oinkZones',JSON.stringify(zones));}

// ---- AUDIO ----
function getAC(){
  const AC=window.AudioContext||window.webkitAudioContext;
  getAC._ac=getAC._ac||new AC();
  if(getAC._ac.state==='suspended')getAC._ac.resume();
  return getAC._ac;
}
function tone(freq,dur,shape='triangle',gain=0.06,freqEnd=null){
  if(!soundOn)return;
  const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();
  o.connect(g);g.connect(ac.destination);
  o.type=shape;
  const n=ac.currentTime;
  o.frequency.setValueAtTime(freq,n);
  o.frequency.exponentialRampToValueAtTime(freqEnd||freq*1.3,n+dur);
  g.gain.setValueAtTime(gain,n);
  g.gain.exponentialRampToValueAtTime(0.0001,n+dur+0.04);
  o.start(n);o.stop(n+dur+0.06);
}
function noise(dur,gain=0.04){
  if(!soundOn)return;
  const ac=getAC();
  const buf=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
  const src=ac.createBufferSource();
  const g=ac.createGain(),f=ac.createBiquadFilter();
  src.buffer=buf;f.type='bandpass';f.frequency.value=400;
  src.connect(f);f.connect(g);g.connect(ac.destination);
  const n=ac.currentTime;
  g.gain.setValueAtTime(gain,n);
  g.gain.exponentialRampToValueAtTime(0.0001,n+dur);
  src.start(n);src.stop(n+dur+0.05);
}
function sndLaunch(){tone(80,0.12,'sawtooth',0.09,50);noise(0.18,0.07);setTimeout(()=>tone(200,0.08,'square',0.04,300),40);}
function sndOink(){tone(380,0.07,'square',0.05,520);setTimeout(()=>tone(300,0.09,'square',0.04,260),80);}
function sndBounce(){tone(120,0.06,'triangle',0.06,80);noise(0.06,0.03);setTimeout(()=>tone(420,0.04,'square',0.03,350),30);}
function sndWin(){
  tone(330,0.08,'triangle',0.06);
  setTimeout(()=>tone(415,0.08,'triangle',0.06),100);
  setTimeout(()=>tone(494,0.08,'triangle',0.06),200);
  setTimeout(()=>tone(660,0.15,'triangle',0.07),310);
  setTimeout(()=>sndOink(),420);
}

// ---- ZONE UI ----
function buildUI(){
  zonesUI.innerHTML='';
  zones.forEach((z,i)=>{
    const box=document.createElement('div');
    box.className='zonebox';
    const subs=(z.sub||[]);
    const subInputs=subs.map((v,si)=>`<input data-sub="${si}" placeholder="Sub ${si+1}" value="${v||''}">`).join('');
    box.innerHTML=`
      <div class="zonehead">
        <strong>Zone ${i+1}</strong>
        <span class="gear">⚙️</span>
        <button class="btn mini remove-zone" data-idx="${i}" title="Remove">🗑</button>
      </div>
      <div class="zonerows">
        <input data-k="name" value="${z.name}">
        <input data-k="amount" value="${z.amount}">
        <button class="btn mini" data-save>Save</button>
      </div>
      <div class="zonerows sub" style="margin-top:8px;display:none">${subInputs}</div>`;
    const subRow=box.querySelector('.sub');
    box.querySelector('.gear').onclick=()=>subRow.style.display=subRow.style.display==='none'?'grid':'none';
    box.querySelector('[data-save]').onclick=()=>{
      box.querySelectorAll('input').forEach(inp=>{
        if(inp.dataset.k)z[inp.dataset.k]=inp.value;
        if(inp.dataset.sub!==undefined){if(!z.sub)z.sub=[];z.sub[+inp.dataset.sub]=inp.value;}
      });
      saveZones();buildUI();
    };
    box.querySelector('.remove-zone').onclick=()=>{
      if(zones.length<=1)return alert('Need at least 1 zone!');
      zones.splice(i,1);saveZones();buildUI();
    };
    zonesUI.appendChild(box);
  });
  const addBtn=document.createElement('button');
  addBtn.className='btn';addBtn.textContent='+ Add Zone';
  addBtn.style.cssText='margin-top:8px;width:100%;';
  addBtn.onclick=()=>{zones.push({name:'New Zone',amount:'x1',sub:['','','','','']});saveZones();buildUI();};
  zonesUI.appendChild(addBtn);
  const resetBtn=document.createElement('button');
  resetBtn.className='btn mini';resetBtn.textContent='🔄 Reset to Defaults';
  resetBtn.style.cssText='margin-top:8px;width:100%;opacity:.7;';
  resetBtn.onclick=()=>{
    if(!confirm('Reset all zones to defaults?'))return;
    zones.length=0;
    defaults.forEach(d=>zones.push(JSON.parse(JSON.stringify(d))));
    saveZones();buildUI();
  };
  zonesUI.appendChild(resetBtn);
}

// ---- WORLD HELPERS ----
function worldToScreen(wx){return wx-camX;}
function zoneStartWorld(i){return i*ZONE_W*dpr();}
function zoneForWorldX(wx){
  const idx=Math.floor(wx/(ZONE_W*dpr()));
  return Math.max(0,Math.min(zones.length-1,idx));
}
function rnd(min,max){return min+Math.random()*(max-min);}

// ---- RESULT OVERLAY ----
function showResult(z,zIdx){
  if(resultTimer)clearTimeout(resultTimer);
  resultText.innerHTML=`<span class="res-name">${z.name||''}</span><br><span class="res-amt">${z.amount||''}</span>`;
  lastResult.textContent=`${z.name||''} → ${z.amount||''}`;
  const zoneCenterWorld=zoneStartWorld(zIdx)+(ZONE_W*dpr()/2);
  const sx=worldToScreen(zoneCenterWorld);
  const overlayW=Math.min(320*dpr(),canvas.width*0.9);
  const left=Math.max(8,Math.min(canvas.width-overlayW-8,sx-overlayW/2));
  const top=Math.max(16,canvas.height-40*dpr()-180*dpr());
  resultText.style.left=`${left/dpr()}px`;
  resultText.style.top=`${top/dpr()}px`;
  resultText.style.width=`${overlayW/dpr()}px`;
  resultOverlay.classList.remove('hidden');
  resultTimer=setTimeout(()=>resultOverlay.classList.add('hidden'),4500);
}

// ---- LAUNCH ----
function launch(){
  if(running)return;
  running=true;
  resultOverlay.classList.add('hidden');
  sndLaunch();
  setTimeout(sndOink,120);
  lastResult.textContent='Launched! 🐷';

  const h=canvas.height;
  const ground=h-40*dpr();
  const startWX=CANNON_WORLD_X*dpr()+175*dpr();
  const startY=h-92*dpr();

  const targetZone=Math.floor(Math.random()*zones.length);
  const zoneLeft=zoneStartWorld(targetZone);
  const margin=ZONE_W*dpr()*0.2;
  const targetWX=rnd(zoneLeft+margin, zoneLeft+ZONE_W*dpr()-margin);

  const g=0.07*dpr();           // reduced gravity for slower, floatier arc
  const vy0=rnd(-4,-2.5)*dpr(); // slower upward launch speed
  const a=0.5*g, b=vy0, c=startY-ground;
  const disc=b*b-4*a*c;
  const t=(-b+Math.sqrt(disc))/(2*a);
  const vx=(targetWX-startWX)/t;

  pig={
    wx:startWX, y:startY,
    vx, vy:vy0,
    r:18*dpr(), spin:0, trail:[],
    bounces:0
  };
  camX=CANNON_WORLD_X*dpr();
  targetCamX=camX;
}

// ---- UPDATE ----
function update(){
  const h=canvas.height,ground=h-40*dpr();
  sparkles=sparkles.filter(s=>s.life>0);
  sparkles.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.07*dpr();s.life--;});
  if(pig) targetCamX=pig.wx-canvas.width*0.38;
  camX+=(targetCamX-camX)*0.04;
  if(!pig)return;

  pig.vy+=0.07*dpr(); // match reduced gravity from launch()
  pig.wx+=pig.vx;
  pig.y+=pig.vy;
  pig.spin+=pig.vx*0.08;
  pig.trail.push({wx:pig.wx,y:pig.y,life:22});
  pig.trail=pig.trail.slice(-22);

  const maxWX=zones.length*ZONE_W*dpr();
  if(pig.wx+pig.r>maxWX){pig.vx*=-0.7;pig.wx=maxWX-pig.r;sndBounce();}
  if(pig.wx-pig.r<0){pig.vx=Math.abs(pig.vx)*0.7;pig.wx=pig.r;}

  if(pig.y+pig.r>ground){
    pig.y=ground-pig.r;
    pig.vy*=-0.62;
    pig.vx*=0.80;
    pig.bounces++;
    pig.vx+=rnd(-0.4,0.4)*dpr();
    sndBounce();
    if(Math.abs(pig.vy)<1.2*dpr()&&Math.abs(pig.vx)<0.7*dpr()){
      const zIdx=zoneForWorldX(pig.wx);
      showResult(zones[zIdx],zIdx);
      sndWin();
      for(let i=0;i<32;i++)
        sparkles.push({
          x:worldToScreen(pig.wx),y:pig.y,
          vx:(Math.random()-0.5)*8*dpr(),
          vy:(Math.random()-0.9)*8*dpr(),
          life:45+Math.random()*25,
          color:['#ff66b8','#5ad0ff','#cc66ff','#ffffff'][Math.floor(Math.random()*4)]
        });
      pig=null;running=false;
    }
  }
}

// ---- DRAW ----
function draw(){
  const w=canvas.width,h=canvas.height,ground=h-40*dpr();
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,'#1a0828');
  bg.addColorStop(0.5,'#090f20');
  bg.addColorStop(1,'#040710');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const glowL=ctx.createRadialGradient(0,0,0,0,0,w*0.6);
  glowL.addColorStop(0,'rgba(255,102,184,.13)');
  glowL.addColorStop(1,'transparent');
  ctx.fillStyle=glowL;ctx.fillRect(0,0,w,h);
  const glowR=ctx.createRadialGradient(w,h,0,w,h,w*0.65);
  glowR.addColorStop(0,'rgba(90,208,255,.11)');
  glowR.addColorStop(1,'transparent');
  ctx.fillStyle=glowR;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(255,255,255,.55)';
  [[0.08,0.12],[0.22,0.05],[0.45,0.09],[0.6,0.03],[0.73,0.14],[0.88,0.07],
   [0.15,0.25],[0.52,0.18],[0.81,0.22],[0.35,0.31],[0.95,0.16],[0.29,0.08]]
  .forEach(([rx,ry])=>{ctx.beginPath();ctx.arc(rx*w,ry*h,1.5*dpr(),0,Math.PI*2);ctx.fill();});
  const grass=ctx.createLinearGradient(0,ground,0,h);
  grass.addColorStop(0,'#59d56e');
  grass.addColorStop(0.5,'#3aa955');
  grass.addColorStop(1,'#1f6b35');
  ctx.fillStyle=grass;ctx.fillRect(0,ground,w,h-ground);
  ctx.fillStyle='rgba(255,255,255,.15)';
  ctx.fillRect(0,ground-8*dpr(),w,8*dpr());
  const borderColors=['#ff66b8','#5ad0ff','#cc66ff','#ffdd55','#55ffcc','#ff8855'];
  const zoneColors=['rgba(255,102,184,.25)','rgba(90,208,255,.22)','rgba(160,80,255,.22)',
    'rgba(255,220,50,.18)','rgba(50,255,180,.18)','rgba(255,130,70,.18)'];
  for(let i=0;i<zones.length;i++){
    const sx=worldToScreen(zoneStartWorld(i));
    const zw=ZONE_W*dpr();
    if(sx+zw<0||sx>w)continue;
    ctx.fillStyle=zoneColors[i%zoneColors.length];
    ctx.fillRect(sx,ground,zw,40*dpr());
    ctx.strokeStyle=borderColors[i%borderColors.length];
    ctx.lineWidth=2.5*dpr();
    ctx.beginPath();ctx.moveTo(sx,ground);ctx.lineTo(sx+zw,ground);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.lineWidth=1*dpr();
    ctx.strokeRect(sx,ground,zw,40*dpr());
    ctx.fillStyle='#fff';ctx.textAlign='center';
    ctx.font=`bold ${13*dpr()}px system-ui`;
    ctx.fillText(zones[i].name,sx+zw/2,ground+17*dpr());
    ctx.font=`${11*dpr()}px system-ui`;
    ctx.fillStyle=borderColors[i%borderColors.length];
    ctx.fillText(zones[i].amount,sx+zw/2,ground+33*dpr());
  }
  const cannonSX=worldToScreen(CANNON_WORLD_X*dpr());
  ctx.save();
  ctx.shadowColor='rgba(255,102,184,.5)';ctx.shadowBlur=18*dpr();
  ctx.fillStyle='rgba(255,102,184,.12)';
  ctx.strokeStyle='rgba(255,102,184,.6)';
  ctx.lineWidth=2*dpr();
  ctx.beginPath();
  ctx.roundRect(cannonSX+28*dpr(),h-155*dpr(),110*dpr(),85*dpr(),18*dpr());
  ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;
  ctx.font=`${22*dpr()}px serif`;ctx.textAlign='center';
  ctx.fillText('🐷',cannonSX+83*dpr(),h-116*dpr());
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.beginPath();
  ctx.moveTo(cannonSX+120*dpr(),h-128*dpr());
  ctx.lineTo(cannonSX+175*dpr(),h-120*dpr());
  ctx.lineTo(cannonSX+120*dpr(),h-112*dpr());
  ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(90,208,255,.5)';
  ctx.fillRect(cannonSX+108*dpr(),h-124*dpr(),20*dpr(),8*dpr());
  ctx.restore();
  if(pig){
    pig.trail.forEach(t=>{
      const tx=worldToScreen(t.wx);
      ctx.globalAlpha=t.life/22*0.35;
      ctx.fillStyle=t.life/22>0.5?'#ff66b8':'#5ad0ff';
      ctx.beginPath();ctx.arc(tx,t.y,5*dpr()*(t.life/22),0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;
    ctx.save();
    ctx.shadowColor='rgba(255,102,184,.7)';ctx.shadowBlur=14*dpr();
    ctx.translate(worldToScreen(pig.wx),pig.y);
    ctx.rotate(pig.spin);
    ctx.font=`${pig.r*2.2}px serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🐷',0,0);
    ctx.restore();
  }
  sparkles.forEach(s=>{
    ctx.globalAlpha=Math.max(0,s.life/55);
    ctx.fillStyle=s.color||'#5ad0ff';
    ctx.fillRect(s.x-2*dpr(),s.y-2*dpr(),4*dpr(),4*dpr());
  });
  ctx.globalAlpha=1;
}
function loop(){update();draw();requestAnimationFrame(loop);}
loop();
launchBtn.onclick=()=>{getAC();launch();};
soundBtn.onclick=()=>{soundOn=!soundOn;soundBtn.textContent=`Sound: ${soundOn?'On':'Off'}`;};
togglePanelBtn.onclick=()=>{
  panel.classList.toggle('hidden');
  togglePanelBtn.textContent=panel.classList.contains('hidden')?'Show Customize':'Hide Customize';
};
buildUI();
