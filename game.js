const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const zonesUI=document.getElementById('zonesUI');
const lastResult=document.getElementById('lastResult');
const soundBtn=document.getElementById('soundBtn');
const launchBtn=document.getElementById('launchBtn');
const togglePanelBtn=document.getElementById('togglePanelBtn');
const panel=document.getElementById('panel');
let soundOn=true,running=false,pig=null,sparkles=[];
const defaults=[
  {name:'Tiny Oink',amount:'x1',sub:['5','10','15']},
  {name:'Big Oink',amount:'x2',sub:['25','50','75']},
  {name:'Mega Oink',amount:'x5',sub:['100','250','500']}
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
function sndLaunch(){
  // Cannon BOOM: low thud + air burst
  tone(80,0.12,'sawtooth',0.09,50);
  noise(0.18,0.07);
  setTimeout(()=>tone(200,0.08,'square',0.04,300),40);
}
function sndOink(){
  // Two-note pig squeal
  tone(380,0.07,'square',0.05,520);
  setTimeout(()=>tone(300,0.09,'square',0.04,260),80);
}
function sndBounce(){
  // Thump + quick oink blip
  tone(120,0.06,'triangle',0.06,80);
  noise(0.06,0.03);
  setTimeout(()=>tone(420,0.04,'square',0.03,350),30);
}
function sndWin(){
  // Happy fanfare: rising triad
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
    box.innerHTML=`
      <div class="zonehead"><strong>Zone ${i+1}</strong><span class="gear">⚙️</span></div>
      <div class="zonerows">
        <input data-k="name" value="${z.name}">
        <input data-k="amount" value="${z.amount}">
        <button class="btn mini" data-save>Save</button>
      </div>
      <div class="zonerows sub" style="margin-top:8px;display:none">
        <input data-sub="0" placeholder="Sub 1" value="${z.sub[0]||''}">
        <input data-sub="1" placeholder="Sub 2" value="${z.sub[1]||''}">
        <input data-sub="2" placeholder="Sub 3" value="${z.sub[2]||''}">
      </div>`;
    const subRow=box.querySelector('.sub');
    box.querySelector('.gear').onclick=()=>
      subRow.style.display=subRow.style.display==='none'?'grid':'none';
    box.querySelector('[data-save]').onclick=()=>{
      box.querySelectorAll('input').forEach(inp=>{
        if(inp.dataset.k)z[inp.dataset.k]=inp.value;
        if(inp.dataset.sub!==undefined)z.sub[+inp.dataset.sub]=inp.value;
      });
      saveZones();buildUI();
    };
    zonesUI.appendChild(box);
  });
}

// ---- GAME LOGIC ----
function zoneForX(x){
  return Math.max(0,Math.min(zones.length-1,Math.floor(x/(canvas.width/zones.length))));
}
function launch(){
  if(running)return;
  running=true;
  sndLaunch();
  setTimeout(sndOink,120);
  lastResult.textContent='Launched! 🐷';
  const h=canvas.height;
  pig={x:92*dpr(),y:h-92*dpr(),vx:8.5*dpr(),vy:-13.5*dpr(),r:18*dpr(),spin:0,trail:[]};
}
function update(){
  const w=canvas.width,h=canvas.height,ground=h-40*dpr();
  sparkles=sparkles.filter(s=>s.life>0);
  sparkles.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.18*dpr();s.life--;});
  if(!pig)return;
  pig.vy+=0.45*dpr();
  pig.x+=pig.vx;pig.y+=pig.vy;
  pig.spin+=pig.vx*0.08;
  pig.trail.push({x:pig.x,y:pig.y,life:20});
  pig.trail=pig.trail.slice(-20);
  if(pig.x-pig.r<0||pig.x+pig.r>w){
    pig.vx*=-0.88;
    pig.x=Math.max(pig.r,Math.min(w-pig.r,pig.x));
    sndBounce();
  }
  if(pig.y+pig.r>ground){
    pig.y=ground-pig.r;
    pig.vy*=-0.7;
    pig.vx*=0.93;
    sndBounce();
    if(Math.abs(pig.vy)<1.2*dpr()&&Math.abs(pig.vx)<0.7*dpr()){
      const z=zones[zoneForX(pig.x)];
      lastResult.textContent=`${z.name} ${z.amount} (${z.sub.join(' / ')})`;
      sndWin();
      for(let i=0;i<22;i++)
        sparkles.push({x:pig.x,y:pig.y,
          vx:(Math.random()-0.5)*6*dpr(),
          vy:(Math.random()-0.9)*6*dpr(),
          life:35+Math.random()*20,
          color:Math.random()>.5?'#ff66b8':'#5ad0ff'});
      pig=null;running=false;
    }
  }
}

// ---- DRAWING ----
function draw(){
  const w=canvas.width,h=canvas.height,ground=h-40*dpr(),zW=w/zones.length;
  ctx.clearRect(0,0,w,h);
  // Background tint
  const bg=ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,'rgba(255,102,184,.10)');
  bg.addColorStop(1,'rgba(90,208,255,.10)');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // Green grass
  const grass=ctx.createLinearGradient(0,ground,w,h);
  grass.addColorStop(0,'#59d56e');
  grass.addColorStop(0.55,'#3aa955');
  grass.addColorStop(1,'#1f6b35');
  ctx.fillStyle=grass;ctx.fillRect(0,ground,w,h-ground);
  // Grass highlight stripe
  ctx.fillStyle='rgba(255,255,255,.18)';
  ctx.fillRect(0,ground-8*dpr(),w,8*dpr());
  // Landing zones
  for(let i=0;i<zones.length;i++){
    ctx.fillStyle=i%2?'rgba(90,208,255,.18)':'rgba(255,102,184,.18)';
    ctx.fillRect(i*zW,ground,zW,40*dpr());
    ctx.strokeStyle='rgba(255,255,255,.2)';
    ctx.strokeRect(i*zW,ground,zW,40*dpr());
    ctx.fillStyle='#fff';ctx.textAlign='center';
    ctx.font=`bold ${14*dpr()}px system-ui`;
    ctx.fillText(zones[i].name,i*zW+zW/2,ground+17*dpr());
    ctx.font=`${13*dpr()}px system-ui`;ctx.fillStyle='#e8fff0';
    ctx.fillText(zones[i].amount,i*zW+zW/2,ground+33*dpr());
  }
  // Cannon body
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.08)';
  ctx.strokeStyle='rgba(255,255,255,.22)';
  ctx.lineWidth=2*dpr();
  ctx.beginPath();
  ctx.roundRect(28*dpr(),h-155*dpr(),110*dpr(),85*dpr(),18*dpr());
  ctx.fill();ctx.stroke();
  // Pig inside cannon
  ctx.font=`${22*dpr()}px serif`;
  ctx.textAlign='center';
  ctx.fillText('🐷',83*dpr(),h-116*dpr());
  // Cannon barrel arrow
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.beginPath();
  ctx.moveTo(120*dpr(),h-128*dpr());
  ctx.lineTo(175*dpr(),h-120*dpr());
  ctx.lineTo(120*dpr(),h-112*dpr());
  ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(90,208,255,.45)';
  ctx.fillRect(108*dpr(),h-124*dpr(),20*dpr(),8*dpr());
  ctx.restore();
  // Pig in flight
  if(pig){
    // Trail
    pig.trail.forEach(t=>{
      ctx.globalAlpha=t.life/20*0.3;
      ctx.fillStyle='#ff7cc9';
      ctx.beginPath();
      ctx.arc(t.x,t.y,5*dpr()*(t.life/20),0,Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha=1;
    // Pig emoji rotating
    ctx.save();
    ctx.translate(pig.x,pig.y);
    ctx.rotate(pig.spin);
    ctx.font=`${pig.r*2.2}px serif`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('🐷',0,0);
    ctx.restore();
  }
  // Sparkles
  sparkles.forEach(s=>{
    ctx.globalAlpha=Math.max(0,s.life/55);
    ctx.fillStyle=s.color||'#5ad0ff';
    ctx.fillRect(s.x,s.y,3.5*dpr(),3.5*dpr());
  });
  ctx.globalAlpha=1;
}
function loop(){update();draw();requestAnimationFrame(loop);}
loop();
// ---- CONTROLS ----
launchBtn.onclick=()=>{ getAC(); launch(); };
soundBtn.onclick=()=>{ soundOn=!soundOn; soundBtn.textContent=`Sound: ${soundOn?'On':'Off'}`; };
togglePanelBtn.onclick=()=>{
  panel.classList.toggle('hidden');
  togglePanelBtn.textContent=panel.classList.contains('hidden')?'Show Customize':'Hide Customize';
};
buildUI();
