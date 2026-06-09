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

// ---- DRAW CANNON ----
// pivot = tip of barrel in world coords; draws behind it
function drawCannon(sx, groundY) {
  const d = dpr();
  const angle = -0.32; // barrel angle upward (radians)
  const barrelLen = 90*d;
  const barrelW  = 28*d;
  const baseR    = 36*d; // main body circle radius
  const wheelR   = 22*d;

  // pivot point = where barrel tip exits (launch point)
  const tipX = sx + 175*d;
  const tipY = groundY - 58*d;

  // barrel base center (back of barrel)
  const bx = tipX - Math.cos(angle)*barrelLen;
  const by = tipY + Math.sin(angle)*barrelLen;

  ctx.save();

  // --- glow ---
  ctx.shadowColor = 'rgba(255,102,184,.7)';
  ctx.shadowBlur  = 20*d;

  // --- barrel ---
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle + Math.PI); // point barrel rightward
  const barrelGrad = ctx.createLinearGradient(0,-barrelW/2, 0,barrelW/2);
  barrelGrad.addColorStop(0,  '#cc55aa');
  barrelGrad.addColorStop(0.4,'#ff66b8');
  barrelGrad.addColorStop(1,  '#7a1a55');
  ctx.fillStyle = barrelGrad;
  // barrel body
  ctx.beginPath();
  ctx.roundRect(0, -barrelW/2, barrelLen, barrelW, [barrelW/2, 8*d, 8*d, barrelW/2]);
  ctx.fill();
  // barrel shine
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.roundRect(6*d, -barrelW/2+4*d, barrelLen-12*d, barrelW*0.3, 4*d);
  ctx.fill();
  // muzzle ring
  ctx.strokeStyle = '#ff9cd8';
  ctx.lineWidth = 4*d;
  ctx.beginPath();
  ctx.arc(barrelLen, 0, barrelW/2+2*d, 0, Math.PI*2);
  ctx.stroke();
  ctx.fillStyle = '#1a0828';
  ctx.fill();
  ctx.restore();

  // --- cannon body (round base) ---
  const bodyGrad = ctx.createRadialGradient(bx-8*d, by-8*d, 4*d, bx, by, baseR);
  bodyGrad.addColorStop(0,  '#ff66b8');
  bodyGrad.addColorStop(0.6,'#a0206a');
  bodyGrad.addColorStop(1,  '#4a0830');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(bx, by, baseR, 0, Math.PI*2);
  ctx.fill();
  // body ring
  ctx.strokeStyle = '#ff9cd8';
  ctx.lineWidth = 3*d;
  ctx.stroke();
  // pig emoji on body
  ctx.shadowBlur = 0;
  ctx.font = `${22*d}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐷', bx, by);

  ctx.shadowColor = 'rgba(90,208,255,.5)';
  ctx.shadowBlur  = 14*d;

  // --- carriage / axle ---
  const axleY = groundY - wheelR;
  const axleX1 = bx - 30*d;
  const axleX2 = bx + 28*d;
  const carriageGrad = ctx.createLinearGradient(axleX1, 0, axleX2, 0);
  carriageGrad.addColorStop(0, '#1a4a7a');
  carriageGrad.addColorStop(0.5,'#5ad0ff');
  carriageGrad.addColorStop(1, '#1a4a7a');
  ctx.fillStyle = carriageGrad;
  ctx.beginPath();
  ctx.roundRect(axleX1, axleY - 8*d, axleX2-axleX1, 16*d, 6*d);
  ctx.fill();

  // --- wheels ---
  function drawWheel(cx, cy) {
    // outer tire
    const wg = ctx.createRadialGradient(cx-wheelR*0.3, cy-wheelR*0.3, 2*d, cx, cy, wheelR);
    wg.addColorStop(0,  '#4a9acc');
    wg.addColorStop(0.7,'#1a5580');
    wg.addColorStop(1,  '#0a2a40');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.arc(cx, cy, wheelR, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#5ad0ff';
    ctx.lineWidth = 3*d;
    ctx.stroke();
    // spokes
    ctx.strokeStyle = 'rgba(90,208,255,.6)';
    ctx.lineWidth = 2*d;
    for(let s=0;s<6;s++){
      const a = (s/6)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(a)*(wheelR-4*d), cy+Math.sin(a)*(wheelR-4*d));
      ctx.stroke();
    }
    // hub
    ctx.fillStyle = '#5ad0ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6*d, 0, Math.PI*2);
    ctx.fill();
  }
  drawWheel(axleX1 + 4*d, axleY);
  drawWheel(axleX2 - 4*d, axleY);

  ctx.restore();
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
  const startY=h-58*dpr(); // matches barrel tip height

  const targetZone=Math.floor(Math.random()*zones.length);
  const zoneLeft=zoneStartWorld(targetZone);
  const margin=ZONE_W*dpr()*0.2;
  const targetWX=rnd(zoneLeft+margin, zoneLeft+ZONE_W*dpr()-margin);

  const g=0.04*dpr();           // very slow floaty gravity
  const vy0=rnd(-3,-2)*dpr();   // gentle upward launch
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

  pig.vy+=0.04*dpr(); // match gravity from launch()
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

  // draw the real cannon
  drawCannon(worldToScreen(CANNON_WORLD_X*dpr()), ground);

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
