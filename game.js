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

// Camera / world settings
const ZONE_W=180;          // px per zone (world space, css pixels)
const CANNON_WORLD_X=-600; // cannon sits far left of zone 0
let camX=0;
let targetCamX=0;

const defaults=[
  {name:'5 Subs',  amount:'🎉 5 Subs',  sub:['5','5','5']},
  {name:'10 Subs', amount:'🎊 10 Subs', sub:['10','10','10']},
  {name:'25 Subs', amount:'🐷 25 Subs', sub:['25','25','25']}
];
const zones=JSON.parse(localStorage.getItem('oinkZones')||'null')||defaults;
function saveZones(){localStorage.setItem('oinkZones',JSON.stringify(zones));}
function dpr(){return devicePixelRatio||1;}
function resize(){canvas.width=canvas.clientWidth*dpr();canvas.height=canvas.clientHeight*dpr();}
window.addEventListener('resize',resize);resize();

// ---- AUDIO ENGINE ----
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
  addBtn.style.cssText='margin-top:10px;width:100%;';
  addBtn.onclick=()=>{zones.push({name:'New Zone',amount:'x1',sub:['','','']});saveZones();buildUI();};
  zonesUI.appendChild(addBtn);
}

// ---- WORLD HELPERS ----
function worldToScreen(wx){return wx - camX;}
function zoneStartWorld(i){return i*ZONE_W*dpr();}
function zoneForWorldX(wx){
  const idx=Math.floor(wx/(ZONE_W*dpr()));
  return Math.max(0,Math.min(zones.length-1,idx));
}

// ---- BIG RESULT DISPLAY ----
function showResult(z){
  if(resultTimer)clearTimeout(resultTimer);
  const name=z.name||'';
  const amt=z.amount||'';
  resultText.textContent=`${name}\n${amt}`;
  // Also update the small badge
  lastResult.textContent=`${name} ${amt} (${(z.sub||[]).join(' / ')})`;
  resultOverlay.classList.remove('hidden');
  resultTimer=setTimeout(()=>resultOverlay.classList.add('hidden'),4200);
}

// ---- GAME LOGIC ----
function launch(){
  if(running)return;
  running=true;
  resultOverlay.classList.add('hidden');
  sndLaunch();
  setTimeout(sndOink,120);
  lastResult.textContent='Launched! 🐷';
  const h=canvas.height;
  const startWX=CANNON_WORLD_X*dpr()+175*dpr();
  const totalZoneWidth=zones.length*ZONE_W*dpr();
  const vx=Math.max(11,(totalZoneWidth/(canvas.height*0.08)))*dpr()*0.55;
  pig={wx:startWX,y:h-92*dpr(),vx:vx,vy:-14*dpr(),r:18*dpr(),spin:0,trail:[]};
  targetCamX=CANNON_WORLD_X*dpr();
}

function update(){
  const h=canvas.height,ground=h-40*dpr();
  sparkles=sparkles.filter(s=>s.life>0);
  sparkles.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.18*dpr();s.life--;});
  if(pig){
    const desiredCamX=pig.wx - canvas.width*0.4;
    targetCamX=desiredCamX;
  }
  camX+=(targetCamX-camX)*0.08;
  if(!pig)return;
  pig.vy+=0.45*dpr();
  pig.wx+=pig.vx;
  pig.y+=pig.vy;
  pig.spin+=pig.vx*0.08;
  pig.trail.push({wx:pig.wx,y:pig.y,life:20});
  pig.trail=pig.trail.slice(-20);
  const maxWX=zones.length*ZONE_W*dpr();
  if(pig.wx+pig.r>maxWX){pig.vx*=-0.88;pig.wx=maxWX-pig.r;sndBounce();}
  if(pig.wx-pig.r<0){pig.vx=Math.abs(pig.vx)*0.88;pig.wx=pig.r;}
  if(pig.y+pig.r>ground){
    pig.y=ground-pig.r;
    pig.vy*=-0.7;
    pig.vx*=0.93;
    sndBounce();
    if(Math.abs(pig.vy)<1.2*dpr()&&Math.abs(pig.vx)<0.7*dpr()){
      const zIdx=zoneForWorldX(pig.wx);
      const z=zones[zIdx];
      showResult(z);
      sndWin();
      for(let i=0;i<28;i++)
        sparkles.push({
          x:worldToScreen(pig.wx),y:pig.y,
          vx:(Math.random()-0.5)*7*dpr(),
          vy:(Math.random()-0.9)*7*dpr(),
          life:40+Math.random()*25,
          color:Math.random()>.5?'#ff66b8':Math.random()>.5?'#5ad0ff':'#cc66ff'
        });
      pig=null;running=false;
    }
  }
}

// ---- DRAWING ----
function draw(){
  const w=canvas.width,h=canvas.height,ground=h-40*dpr();
  ctx.clearRect(0,0,w,h);

  // Deep purple-pink-blue background gradient
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,'#1a0828');
  bg.addColorStop(0.5,'#090f20');
  bg.addColorStop(1,'#040710');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);

  // Subtle radial pink glow top-left
  const glowL=ctx.createRadialGradient(0,0,0,0,0,w*0.6);
  glowL.addColorStop(0,'rgba(255,102,184,.13)');
  glowL.addColorStop(1,'transparent');
  ctx.fillStyle=glowL;ctx.fillRect(0,0,w,h);

  // Subtle blue glow bottom-right
  const glowR=ctx.createRadialGradient(w,h,0,w,h,w*0.65);
  glowR.addColorStop(0,'rgba(90,208,255,.11)');
  glowR.addColorStop(1,'transparent');
  ctx.fillStyle=glowR;ctx.fillRect(0,0,w,h);

  // Stars / particles in background
  ctx.fillStyle='rgba(255,255,255,.55)';
  const stars=[[0.08,0.12],[0.22,0.05],[0.45,0.09],[0.6,0.03],[0.73,0.14],[0.88,0.07],[0.15,0.25],[0.52,0.18],[0.81,0.22],[0.35,0.31]];
  stars.forEach(([rx,ry])=>{ctx.beginPath();ctx.arc(rx*w,ry*h,1.5*dpr(),0,Math.PI*2);ctx.fill();});

  // Grass
  const grass=ctx.createLinearGradient(0,ground,0,h);
  grass.addColorStop(0,'#59d56e');
  grass.addColorStop(0.5,'#3aa955');
  grass.addColorStop(1,'#1f6b35');
  ctx.fillStyle=grass;ctx.fillRect(0,ground,w,h-ground);
  ctx.fillStyle='rgba(255,255,255,.15)';
  ctx.fillRect(0,ground-8*dpr(),w,8*dpr());

  // Landing zones (camera-scrolled)
  const pinkZone='rgba(255,102,184,.25)';
  const blueZone='rgba(90,208,255,.22)';
  const purpZone='rgba(160,80,255,.22)';
  const zoneColors=[pinkZone,blueZone,purpZone];
  for(let i=0;i<zones.length;i++){
    const sx=worldToScreen(zoneStartWorld(i));
    const zw=ZONE_W*dpr();
    ctx.fillStyle=zoneColors[i%3];
    ctx.fillRect(sx,ground,zw,40*dpr());
    // Glowing top border per zone
    const borderColors=['#ff66b8','#5ad0ff','#cc66ff'];
    ctx.strokeStyle=borderColors[i%3];
    ctx.lineWidth=2*dpr();
    ctx.beginPath();ctx.moveTo(sx,ground);ctx.lineTo(sx+zw,ground);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.lineWidth=1*dpr();
    ctx.strokeRect(sx,ground,zw,40*dpr());
    // Zone name
    ctx.fillStyle='#fff';ctx.textAlign='center';
    ctx.font=`bold ${13*dpr()}px system-ui`;
    ctx.fillText(zones[i].name,sx+zw/2,ground+17*dpr());
    ctx.font=`${12*dpr()}px system-ui`;
    ctx.fillStyle=borderColors[i%3];
    ctx.fillText(zones[i].amount,sx+zw/2,ground+33*dpr());
  }

  // Cannon (camera-scrolled)
  const cannonSX=worldToScreen(CANNON_WORLD_X*dpr());
  ctx.save();
  // Cannon body glow
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
  // Barrel
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.beginPath();
  ctx.moveTo(cannonSX+120*dpr(),h-128*dpr());
  ctx.lineTo(cannonSX+175*dpr(),h-120*dpr());
  ctx.lineTo(cannonSX+120*dpr(),h-112*dpr());
  ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(90,208,255,.5)';
  ctx.fillRect(cannonSX+108*dpr(),h-124*dpr(),20*dpr(),8*dpr());
  ctx.restore();

  // Pig in flight
  if(pig){
    pig.trail.forEach(t=>{
      const tx=worldToScreen(t.wx);
      ctx.globalAlpha=t.life/20*0.35;
      // Pink-to-blue gradient trail dots
      const ratio=t.life/20;
      ctx.fillStyle=ratio>0.5?'#ff66b8':'#5ad0ff';
      ctx.beginPath();
      ctx.arc(tx,t.y,5*dpr()*(t.life/20),0,Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha=1;
    ctx.save();
    // Glow around flying pig
    ctx.shadowColor='rgba(255,102,184,.7)';ctx.shadowBlur=14*dpr();
    ctx.translate(worldToScreen(pig.wx),pig.y);
    ctx.rotate(pig.spin);
    ctx.font=`${pig.r*2.2}px serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🐷',0,0);
    ctx.restore();
  }

  // Sparkles (screen space)
  sparkles.forEach(s=>{
    ctx.globalAlpha=Math.max(0,s.life/55);
    ctx.fillStyle=s.color||'#5ad0ff';
    // Sparkle as a small star
    ctx.fillRect(s.x-2*dpr(),s.y-2*dpr(),4*dpr(),4*dpr());
  });
  ctx.globalAlpha=1;
}

function loop(){update();draw();requestAnimationFrame(loop);}
loop();

// ---- CONTROLS ----
launchBtn.onclick=()=>{getAC();launch();};
soundBtn.onclick=()=>{soundOn=!soundOn;soundBtn.textContent=`Sound: ${soundOn?'On':'Off'}`;};
togglePanelBtn.onclick=()=>{
  panel.classList.toggle('hidden');
  togglePanelBtn.textContent=panel.classList.contains('hidden')?'Show Customize':'Hide Customize';
};
buildUI();
