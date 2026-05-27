import os, textwrap, shutil
base='output/oink_cannon_repo'
os.makedirs(base, exist_ok=True)
index = r'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Oink Cannon</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <div class="topbar">
      <div class="title">OINK CANNON</div>
      <div class="hud">
        <div class="badge" id="lastResult">Ready</div>
        <button class="btn mini" id="togglePanelBtn">Hide Customize</button>
        <button class="btn mini" id="soundBtn">Sound: On</button>
        <button class="btn launch" id="launchBtn">Launch Pig</button>
      </div>
    </div>
    <div class="main">
      <div class="panel" id="panel">
        <h2>Customize landing zones</h2>
        <p>Edit the label and payout for each zone. Use the gear to reveal the sub-amounts for that landing zone.</p>
        <div id="zonesUI"></div>
        <div class="footerhint">The pig oinks when launched, bounces on the stage, and lands in a zone based on where it settles.</div>
      </div>
      <div class="gamewrap">
        <canvas id="game"></canvas>
        <div class="overlay"><div class="aim"></div></div>
      </div>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>'''
style = r''':root{--pink:#ff66b8;--pink2:#ff9cd8;--blue:#5ad0ff;--blue2:#2f8fff;--grass1:#4fd06b;--grass2:#2f9d4f;--bg:#08101b;--panel:rgba(15,20,35,.78);--text:#f7f7ff;--muted:#c8d2e6;--line:rgba(255,255,255,.12)}
*{box-sizing:border-box} html,body{margin:0;height:100%;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);background:radial-gradient(circle at top,#1d2544 0,#09101b 48%,#04070d 100%)}
body:before{content:"";position:fixed;inset:0;background:linear-gradient(135deg,rgba(255,102,184,.12),rgba(90,208,255,.12));pointer-events:none}
#app{width:100vw;height:100vh;display:flex;flex-direction:column}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;z-index:3}
.title{font-size:28px;font-weight:900;letter-spacing:.08em;text-shadow:0 0 18px rgba(255,102,184,.35)}
.hud{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.badge,.btn{border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04));color:var(--text);backdrop-filter:blur(12px);box-shadow:0 10px 24px rgba(0,0,0,.22)}
.badge{padding:8px 12px;border-radius:999px;font-weight:700}
.btn{border-radius:14px;padding:11px 15px;font-weight:800;cursor:pointer;transition:transform .15s,filter .15s}
.btn:hover{transform:translateY(-1px);filter:brightness(1.08)}
.btn.launch{background:linear-gradient(135deg,var(--pink),var(--blue));border:none}
.btn.mini{padding:8px 10px;border-radius:12px}
.main{flex:1;display:grid;grid-template-columns:minmax(280px,390px) 1fr;gap:12px;padding:0 14px 14px;min-height:0}
.panel,.gamewrap{border:1px solid var(--line);background:var(--panel);backdrop-filter:blur(14px);border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.35);min-height:0}
.panel{padding:16px;overflow:auto;transition:transform .2s,opacity .2s,max-width .2s,padding .2s}
.panel.hidden{transform:translateX(-18px);opacity:0;pointer-events:none;max-width:0;padding:0;margin:0;border:none;overflow:hidden}
.panel h2{margin:0 0 8px;font-size:18px}.panel p{margin:0 0 12px;color:var(--muted);line-height:1.45}
.zonebox{border:1px solid var(--line);border-radius:18px;padding:12px;margin:12px 0;background:rgba(255,255,255,.04)}
.zonehead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.gear{font-size:18px;cursor:pointer;user-select:none}
.zonerows{display:grid;grid-template-columns:1fr 100px 52px;gap:8px;align-items:center}.zonerows input{padding:9px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--text)}
.gamewrap{position:relative;overflow:hidden} canvas{display:block;width:100%;height:100%}
.overlay{position:absolute;inset:0;pointer-events:none}.aim{position:absolute;left:32px;bottom:72px;width:180px;height:92px;border-left:6px solid var(--pink);border-bottom:6px solid var(--pink);border-radius:0 0 0 90px;filter:drop-shadow(0 0 12px rgba(255,102,184,.45))}
.footerhint{margin-top:10px;color:var(--muted);font-size:13px}
@media (max-width:900px){.main{grid-template-columns:1fr}.title{font-size:22px}.panel{max-height:38vh}}
'''
game = r'''const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const zonesUI=document.getElementById('zonesUI');
const lastResult=document.getElementById('lastResult');
const soundBtn=document.getElementById('soundBtn');
const launchBtn=document.getElementById('launchBtn');
const togglePanelBtn=document.getElementById('togglePanelBtn');
const panel=document.getElementById('panel');
let soundOn=true,running=false,pig=null,sparkles=[];
const defaults=[{name:'Tiny Oink',amount:'x1',sub:['5','10','15']},{name:'Big Oink',amount:'x2',sub:['25','50','75']},{name:'Mega Oink',amount:'x5',sub:['100','250','500']}];
const zones=JSON.parse(localStorage.getItem('oinkZones')||'null')||defaults;
function saveZones(){localStorage.setItem('oinkZones',JSON.stringify(zones));}
function dpr(){return devicePixelRatio||1}
function resize(){canvas.width=canvas.clientWidth*dpr();canvas.height=canvas.clientHeight*dpr();}
window.addEventListener('resize',resize);resize();
function playTone(freq,dur,shape='triangle',gain=0.06){if(!soundOn)return;const AC=window.AudioContext||window.webkitAudioContext;playTone.ac=playTone.ac||new AC();const ac=playTone.ac,o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=shape;const n=ac.currentTime;o.frequency.setValueAtTime(freq,n);o.frequency.exponentialRampToValueAtTime(freq*1.35,n+dur);g.gain.setValueAtTime(gain,n);g.gain.exponentialRampToValueAtTime(.0001,n+dur+.03);o.start(n);o.stop(n+dur+.05);}
function oink(){playTone(330,.08,'square',.04);playTone(220,.11,'sawtooth',.03);}
function buildUI(){zonesUI.innerHTML='';zones.forEach((z,i)=>{const box=document.createElement('div');box.className='zonebox';box.innerHTML=`<div class="zonehead"><strong>Zone ${i+1}</strong><span class="gear">⚙️</span></div><div class="zonerows"><input data-k="name" value="${z.name}"><input data-k="amount" value="${z.amount}"><button class="btn mini" data-save>Save</button></div><div class="zonerows" style="margin-top:8px"><input data-sub="0" value="${z.sub[0]||''}"><input data-sub="1" value="${z.sub[1]||''}"><input data-sub="2" value="${z.sub[2]||''}"></div>`;const subs=box.querySelectorAll('[data-sub]');subs.forEach(el=>el.style.display='none');box.querySelector('.gear').onclick=()=>subs.forEach(el=>el.style.display=el.style.display==='none'?'block':'none');box.querySelector('[data-save]').onclick=()=>{box.querySelectorAll('input').forEach(inp=>{if(inp.dataset.k)z[inp.dataset.k]=inp.value;if(inp.dataset.sub!==undefined)z.sub[+inp.dataset.sub]=inp.value;});saveZones();buildUI();};zonesUI.appendChild(box);});}
function zoneForX(x){const w=canvas.width;return Math.max(0,Math.min(zones.length-1,Math.floor(x/(w/zones.length))));}
function launch(){if(running)return;if(playTone.ac&&playTone.ac.state==='suspended')playTone.ac.resume();running=true;oink();playTone(210,.06,'triangle',.05);lastResult.textContent='Launched!';const h=canvas.height;pig={x:92*dpr(),y:h-92*dpr(),vx:8*dpr(),vy:-13*dpr(),r:18*dpr(),spin:0,trail:[]};}
function update(){const w=canvas.width,h=canvas.height,ground=h-40*dpr();sparkles=sparkles.filter(s=>s.life>0);sparkles.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.18*dpr();s.life--;});if(pig){pig.vy+=.45*dpr();pig.x+=pig.vx;pig.y+=pig.vy;pig.spin+=pig.vx*.08;pig.trail.push({x:pig.x,y:pig.y,life:18});pig.trail=pig.trail.slice(-18);if(pig.x-pig.r<0||pig.x+pig.r>w){pig.vx*=-.88;pig.x=Math.max(pig.r,Math.min(w-pig.r,pig.x));oink();}if(pig.y+pig.r>ground){pig.y=ground-pig.r;pig.vy*=-.7;pig.vx*=.93;oink();if(Math.abs(pig.vy)<1.2*dpr()&&Math.abs(pig.vx)<.7*dpr()){const z=zones[zoneForX(pig.x)];lastResult.textContent=`${z.name} ${z.amount} (${z.sub.join(' / ')})`;playTone(470,.11,'triangle',.05);for(let i=0;i<18;i++)sparkles.push({x:pig.x,y:pig.y,vx:(Math.random()-.5)*5*dpr(),vy:(Math.random()-.8)*5*dpr(),life:30+Math.random()*20});pig=null;running=false;}}}}
function draw(){const w=canvas.width,h=canvas.height,ground=h-40*dpr(),zW=w/zones.length;ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'rgba(255,102,184,.10)');bg.addColorStop(1,'rgba(90,208,255,.10)');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);const grass=ctx.createLinearGradient(0,ground,w,h);grass.addColorStop(0,'#59d56e');grass.addColorStop(.55,'#3aa955');grass.addColorStop(1,'#1f6b35');ctx.fillStyle=grass;ctx.fillRect(0,ground,w,h-ground);for(let i=0;i<zones.length;i++){ctx.fillStyle=i%2?'rgba(90,208,255,.16)':'rgba(255,102,184,.16)';ctx.fillRect(i*zW,ground,zW,40*dpr());ctx.strokeStyle='rgba(255,255,255,.18)';ctx.strokeRect(i*zW,ground,zW,40*dpr());ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`${18*dpr()}px system-ui`;ctx.fillText(zones[i].name,i*zW+zW/2,ground+18*dpr());ctx.font=`${14*dpr()}px system-ui`;ctx.fillStyle='#e8fff0';ctx.fillText(zones[i].amount,i*zW+zW/2,ground+34*dpr());}ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(0,ground-8*dpr(),w,8*dpr());ctx.save();ctx.fillStyle='rgba(255,255,255,.08)';ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2*dpr();ctx.beginPath();ctx.roundRect(28*dpr(),h-155*dpr(),110*dpr(),85*dpr(),18*dpr());ctx.fill();ctx.stroke();ctx.fillStyle='#ffb6d9';ctx.beginPath();ctx.arc(50*dpr(),h-112*dpr(),17*dpr(),0,Math.PI*2);ctx.fill();ctx.fillStyle='#1b1530';ctx.font=`bold ${18*dpr()}px system-ui`;ctx.fillText('🐷',43*dpr(),h-106*dpr());ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.moveTo(120*dpr(),h-128*dpr());ctx.lineTo(175*dpr(),h-120*dpr());ctx.lineTo(120*dpr(),h-112*dpr());ctx.closePath();ctx.fill();ctx.fillStyle='rgba(90,208,255,.45)';ctx.fillRect(108*dpr(),h-124*dpr(),20*dpr(),8*dpr());ctx.restore();if(pig){pig.trail.forEach(t=>{ctx.globalAlpha=t.life/18*.35;ctx.fillStyle='#ff7cc9';ctx.beginPath();ctx.arc(t.x,t.y,6*dpr()*(t.life/18),0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;ctx.save();ctx.translate(pig.x,pig.y);ctx.rotate(pig.spin);ctx.fillStyle='#ffb6d9';ctx.beginPath();ctx.arc(0,0,pig.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff78bc';ctx.beginPath();ctx.arc(pig.r*.8,0,pig.r*.45,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-pig.r*.35,-pig.r*.2,3.5*dpr(),0,Math.PI*2);ctx.arc(pig.r*.1,-pig.r*.2,3.5*dpr(),0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a1738';ctx.beginPath();ctx.arc(-pig.r*.35,-pig.r*.2,1.3*dpr(),0,Math.PI*2);ctx.arc(pig.r*.1,-pig.r*.2,1.3*dpr(),0,Math.PI*2);ctx.fill();ctx.restore();}sparkles.forEach(s=>{ctx.globalAlpha=Math.max(0,s.life/50);ctx.fillStyle='#5ad0ff';ctx.fillRect(s.x,s.y,3*dpr(),3*dpr());});ctx.globalAlpha=1;}
function loop(){update();draw();requestAnimationFrame(loop);}loop();
launchBtn.onclick=()=>{if(playTone.ac&&playTone.ac.state==='suspended')playTone.ac.resume();launch();};
soundBtn.onclick=()=>{soundOn=!soundOn;soundBtn.textContent=`Sound: ${soundOn?'On':'Off'}`};
togglePanelBtn.onclick=()=>{panel.classList.toggle('hidden');togglePanelBtn.textContent=panel.classList.contains('hidden')?'Show Customize':'Hide Customize';};
buildUI();'''
readme = '# Oink Cannon\n\nA pink-and-blue web game with a cannon-launched pig, bounce physics, customizable landing zones, and browser audio.\n\n## Files\n- `index.html`\n- `style.css`\n- `game.js`\n\n## Run locally\nOpen `index.html` in a browser or host the folder on GitHub Pages.\n'
open(f'{base}/index.html','w').write(index)
open(f'{base}/style.css','w').write(style)
open(f'{base}/game.js','w').write(game)
open(f'{base}/README.md','w').write(readme)
print('created repo files')