'use strict';
const $=s=>document.querySelector(s),canvas=$('#c'),ctx=canvas.getContext('2d');
let w,h,view,dpr;function resize(){w=innerWidth;h=innerHeight;view=Math.min(w,h*.9);dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}resize();addEventListener('resize',resize);
const TOTAL=80,patterns=[[0,0,0,0,-1,-1,0,0],[0,1,1,0,0,-1,-1,0],[-1,0,1,1,0,-1,0,0],[0,1,0,-1,0,1,0,0],[0,-1,0,1,1,0,-1,0]];
const laneAt=i=>i<0?0:patterns[Math.min(4,Math.floor(i/16))][i%8];
const tileScale=i=>i>=0&&i%8===7?.4:1;
let state='menu',mode='easy',x=0,goal=0,beat=0,phase=0,score=0,combo=0,maxCombo=0,lives=3,best=0,particles=[],pulse=0,toastUntil=0,last=0;
try{best=Number(localStorage.neonbest)||0}catch{}$('#best').textContent='REKORD '+best;
let audio,origin=0,elapsed=0,step=.75,muted=false,tapped=new Set();
function stopSound(){if(audio)audio.pause()}
function audioMessage(){say('Inget ljud? Höj medievolymen och tryck på Testa ljud.',5)}
async function testSound(){try{const sample=new Audio('sound-check.wav');sample.volume=.8;await sample.play();say('Hör du de tre tonerna?',3)}catch{audioMessage()}}
$('#testSound').onclick=testSound;
function say(text,seconds=1.3){$('#toast').textContent=text;toastUntil=performance.now()+seconds*1000}
async function begin(){clearCelebration();const resuming=state==='paused';
if(!resuming){stopSound();mode=$('#mode').value;step=mode==='easy'?.75:.6;score=beat=combo=maxCombo=phase=elapsed=0;lives=3;x=goal=0;tapped.clear();tapBursts.clear();highJumps.clear();particles=[];$('#score').textContent='0';$('#progress').style.width='0%';$('#lives').textContent=mode==='easy'?'∞':'♥ ♥ ♥';audio=new Audio(mode==='easy'?'moon-easy.wav':'moon-challenge.wav');audio.preload='auto';audio.volume=.8;audio.onended=()=>{if(state==='play'){while(beat<TOTAL&&state==='play'){land(beat);beat++}}};audio.onerror=()=>{if(state==='play')pause();audioMessage()};audio.onpause=()=>{if(state==='play')pause()}}
audio.muted=muted;
// Speed up music and jumps together; currentTime keeps them synchronized.
audio.playbackRate=Number($('#tempo').value);
// Call play directly inside the button gesture to unlock media audio on iOS.
try{await audio.play()}catch{audioMessage();return}
origin=0;state='play';$('#panel').hidden=true;$('#pause').style.display='inline-block';$('#foot').textContent='Dutta på plattan · dubbeltryck över rosa hinder';say('Dutta på de lysande plattorna!',3)}
function release(){}
function pause(){if(state!=='play')return;elapsed=audio.currentTime;state='paused';stopSound();$('#panel').hidden=false;$('#intro').textContent='En liten paus. Äventyret väntar!';$('#start').textContent='Fortsätt →';$('#mode').style.display='none';$('#home').hidden=false}
function celebrate(){
const layer=document.createElement('div');layer.id='celebration';layer.setAttribute('aria-hidden','true');
const colors=['#ff85bb','#ffe68c','#7dfff0','#b9a1ff','#c6fc74'];
for(let i=0;i<72;i++){const piece=document.createElement('span');piece.textContent=i%5===0?'★':'';piece.style.cssText='left:'+((i*37)%100)+'%;background:'+(i%5===0?'transparent':colors[i%5])+';color:'+colors[i%5]+';animation-delay:'+((i%12)*.12)+'s;animation-duration:'+(2.8+(i%7)*.3)+'s;--drift:'+((i%2?1:-1)*(30+i%90))+'px;--spin:'+(360+i*31)+'deg';layer.appendChild(piece)}document.body.appendChild(layer);setTimeout(()=>layer.remove(),7000);
}
function clearCelebration(){document.getElementById('celebration')?.remove()}
function finish(won){clearCelebration();if(won)celebrate();state='result';stopSound();release();$('#panel').hidden=false;$('#mode').style.display='block';$('#pause').style.display='none';$('#home').hidden=true;$('#intro').innerHTML=won?'<span class="trophy">🏆</span><strong>Hurra! Du är i mål!</strong><br>Du klarade Månskensbanan!<br>⭐ '+score+' träffar · längsta rad '+maxCombo:'Vilken fin runda! '+score+' träffar.<br>Hoppa igen eller prova det lugna övningsläget.';$('#start').textContent='Spela igen →';say(won?'★ Äventyr klart! ★':'Bra kämpat!',4)}
$('#start').onclick=begin;$('#pause').onclick=pause;$('#home').onclick=()=>{clearCelebration();state='menu';stopSound();$('#intro').innerHTML='Dutta på plattan du vill landa på.<br>Lyft fingret och dutta på nästa!';$('#start').textContent='Nu hoppar vi! →';$('#mode').style.display='block';$('#home').hidden=true;$('#pause').style.display='none'};
$('#sound').onclick=()=>{muted=!muted;if(audio)audio.muted=muted;$('#sound').textContent=muted?'Ljud av':'Ljud på';$('#sound').setAttribute('aria-pressed',String(muted))};document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
const tapBursts=new Map(),highJumps=new Set();
const obstacleAt=i=>i>=10&&i%12===10;
function selectTile(index){if(state!=='play'||index<beat||index>=TOTAL)return;const tapTime=performance.now(),previous= tapBursts.get(index);if(obstacleAt(index)&&previous!==undefined&&tapTime-previous<=350){highJumps.add(index);say('Superhopp!',.5)}tapped.add(index);tapBursts.set(index,tapTime);if(navigator.vibrate)navigator.vibrate(12);if(index===beat)goal=laneAt(index)}
canvas.onpointerdown=e=>{if(state!=='play')return;e.preventDefault();let nearest=-1,distance=Infinity;for(let i=0;i<5&&beat+i<TOTAL;i++){const p=project(laneAt(beat+i),(i+1-phase)*1.35),dx=Math.abs(e.clientX-p.x),dy=Math.abs(e.clientY-p.y);const scale=tileScale(beat+i),rx=Math.max(28,p.s*1.3*scale),ry=Math.max(26,p.s*.65*scale);if(dx<=rx&&dy<=ry){const metric=(dx/rx)**2+(dy/ry)**2;if(metric<distance){distance=metric;nearest=beat+i}}}if(nearest>=0)selectTile(nearest)};
addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;if(['ArrowLeft','ArrowRight','ArrowDown','Space'].includes(e.code))e.preventDefault();if(state==='play'){const lane=e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:e.code==='ArrowDown'?0:null;if(lane!==null){goal=lane;if(lane===laneAt(beat))selectTile(beat)}}if(e.code==='Space')state==='play'?pause():begin()});
function project(lane,z){const q=1/(1+Math.max(-.5,z)*.5);return{x:w/2+lane*view*.25*q,y:h*.27+h*.54*q,s:view*.108*q,q}}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fill()}
function tile(lane,z,active,selected=false,index=-1){
if(z<-.65||z>14)return;
const now=performance.now(),age=(now-(tapBursts.get(index)??-Infinity))/1000;
const feedback=age>=0&&age<.18?Math.pow(1-age/.18,2):0;
const p=project(lane,z),a=p.s*tileScale(index)*(1+.18*feedback),b=a*.32,d=a*.36;
selected=feedback>0;
const light=selected?'#a5fff0':active?'#fff1a0':'#94eaff',core=selected?'#35d6b5':active?'#dfac42':'#448dc9';
ctx.save();ctx.translate(p.x,p.y);
const face=(points,color)=>polygon(points,color);
const ring=(s,y=0)=>[[-a*.82*s,-b*s+y],[a*.82*s,-b*s+y],[a*1.08*s,-b*.48*s+y],[a*1.08*s,b*.48*s+y],[a*.82*s,b*s+y],[-a*.82*s,b*s+y],[-a*1.08*s,b*.48*s+y],[-a*1.08*s,-b*.48*s+y]];
// Soft reflected light below the floating carved shell.
const halo=ctx.createRadialGradient(0,d,0,0,d,a*1.35);halo.addColorStop(0,selected?'#63ffdf55':active?'#ffe18b44':'#47baff33');halo.addColorStop(1,'#47baff00');ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(0,d,a*1.35,b*2.1,0,0,Math.PI*2);ctx.fill();
face([[-a*.96,b*.35],[a*.96,b*.35],[a*.72,b+d],[a*.35,b+d*1.17],[-a*.6,b+d]],'#132e51');
face([[-a*.96,b*.35],[-a*.6,b+d],[-a*.13,b+d*.85],[0,b*.65]],'#28537b');
face([[0,b*.65],[-a*.13,b+d*.85],[a*.35,b+d*1.17],[a*.72,b+d],[a*.96,b*.35]],'#1b3d65');
// Suspended gemstone and gold mounting prongs.
face([[-a*.16,b+d*.5],[0,b+d*1.45],[a*.18,b+d*.5],[0,b+d*.25]],core);
face([[-a*.16,b+d*.5],[0,b+d*1.45],[0,b+d*.25]],light);
const rim=ctx.createLinearGradient(0,-b,0,b+d*.42);rim.addColorStop(0,'#ffe8ac');rim.addColorStop(.4,'#acb8c7');rim.addColorStop(1,'#43547a');face(ring(1,d*.28),rim);
const surface=ctx.createLinearGradient(-a,-b,a,b);surface.addColorStop(0,light);surface.addColorStop(.28,core);surface.addColorStop(1,active?'#87633c':'#234f84');
ctx.shadowColor=light;ctx.shadowBlur=(5+(active?9:0)+feedback*30)*p.q;face(ring(1),surface);ctx.shadowBlur=0;
ctx.strokeStyle='#e9faffcc';ctx.lineWidth=Math.max(.7,1.5*p.q);ctx.stroke();
face(ring(.87),active?'#b98a42':'#316b9e');
const inset=ctx.createLinearGradient(0,-b,0,b);inset.addColorStop(0,active?'#f1cf78':'#68b9dc');inset.addColorStop(1,active?'#c69247':'#3478b0');face(ring(.79),inset);
// Inlaid border, corner rivets and symmetrical engraved channels.
ctx.strokeStyle=light;ctx.lineWidth=Math.max(.6,p.q);ctx.stroke();
if(a>10){ctx.strokeStyle=active?'#72533988':'#16477588';ctx.beginPath();for(const s of [-1,1]){ctx.moveTo(s*a*.67,-b*.44);ctx.lineTo(s*a*.43,-b*.44);ctx.lineTo(s*a*.27,0);ctx.lineTo(s*a*.43,b*.44);ctx.lineTo(s*a*.67,b*.44)}ctx.stroke();
for(const s of [-1,1])for(const t of [-1,1]){face([[s*a*.87,t*b*.57-a*.025],[s*a*.87+a*.04,t*b*.57],[s*a*.87,t*b*.57+a*.025],[s*a*.87-a*.04,t*b*.57]],'#fff0ba')}
ctx.strokeStyle='#e5f9ff77';ctx.beginPath();ctx.ellipse(0,0,a*.29,b*.59,0,0,Math.PI*2);ctx.stroke();}
// Four-point moonstone crest remains readable on distant platforms.
ctx.shadowColor=light;ctx.shadowBlur=8*p.q;face([[0,-b*.64],[a*.09,-b*.16],[a*.22,0],[a*.09,b*.16],[0,b*.64],[-a*.09,b*.16],[-a*.22,0],[-a*.09,-b*.16]],light);ctx.shadowBlur=0;
for(const s of [-1,1]){face([[s*a*.58,b+d*.27],[s*a*.58+a*.08,b+d*.27],[s*a*.58+a*.06,b+d*.48],[s*a*.58-a*.02,b+d*.48]],light)}
if(active||selected){const sparkle=.6+.4*Math.sin(now*.004+index);ctx.globalAlpha=sparkle;ctx.strokeStyle='#fff9d8';ctx.lineWidth=Math.max(1,p.q);for(const s of [-1,1]){const sx=s*a*.91,sy=-b*.9;ctx.beginPath();ctx.moveTo(sx-a*.06,sy);ctx.lineTo(sx+a*.06,sy);ctx.moveTo(sx,sy-a*.06);ctx.lineTo(sx,sy+a*.06);ctx.stroke()}ctx.globalAlpha=1;}
if(feedback>0){ctx.globalAlpha=feedback*.85;ctx.fillStyle='#eafff5';face(ring(.78),ctx.fillStyle);ctx.globalAlpha=feedback;ctx.strokeStyle='#fff';ctx.lineWidth=3*p.q;ctx.beginPath();ctx.ellipse(0,0,a*(1+age*2.5),b*(1+age*3.5),0,0,Math.PI*2);ctx.stroke()}
if(obstacleAt(index)){
// Candy-coloured arch, drawn within its platform so the landing stays clear.
const cleared=highJumps.has(index),hh=a*.65;
ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=cleared?'#7dfff0':'#ff80b9';ctx.shadowBlur=10*p.q;
ctx.strokeStyle=cleared?'#7dfff0':'#ff82b6';ctx.lineWidth=Math.max(3,a*.12);ctx.beginPath();ctx.moveTo(-a*.57,0);ctx.lineTo(-a*.57,-hh);ctx.quadraticCurveTo(0,-hh*1.35,a*.57,-hh);ctx.lineTo(a*.57,0);ctx.stroke();ctx.shadowBlur=0;
ctx.strokeStyle='#fff3d8';ctx.lineWidth=Math.max(1,a*.035);ctx.beginPath();ctx.moveTo(-a*.57,-hh*.3);ctx.lineTo(-a*.57,-hh*.65);ctx.moveTo(a*.57,-hh*.3);ctx.lineTo(a*.57,-hh*.65);ctx.stroke();
ctx.fillStyle='#fff3d8';ctx.font='bold '+Math.max(8,a*.24)+'px system-ui';ctx.textAlign='center';ctx.fillText(cleared?'↑':'×2',0,-hh*.75);ctx.restore();}
ctx.restore();}
function land(i){const target=laneAt(i),distance=Math.abs(x-target);let hit=tapped.has(i)&&distance<.57&&(!obstacleAt(i)||highJumps.has(i));highJumps.delete(i);tapped.delete(i);
if(!hit&&mode==='easy'){say(obstacleAt(i)?'Dubbeltryck för att hoppa över hindret!':'Miss! Sikta på nästa platta.');combo=0}else if(!hit){lives--;$('#lives').textContent='♥ '.repeat(lives);say('Nästa hopp!');combo=0;if(lives===0){finish(false);return}}
if(hit){score++;combo++;maxCombo=Math.max(maxCombo,combo);$('#score').textContent=score;if(combo%8===0)say('★ '+combo+' i rad!');else if(distance<.18&&i>3)say('Perfekt!',.55);if(score>best){best=score;try{localStorage.neonbest=best}catch{}$('#best').textContent='REKORD '+best}}else combo=0;
pulse=hit?1:0;const p=project(target,0);for(let j=0;j<(hit?16:0);j++)particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*220,vy:-60-Math.random()*150,life:1});$('#progress').style.width=((i+1)/TOTAL*100)+'%';if(i===TOTAL-1)finish(true)}
function environment(t){const hue=state==='play'?Math.floor(beat/16)*7:0;const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#06172f');bg.addColorStop(.5,`hsl(${207+hue} 62% 22%)`);bg.addColorStop(1,'#071e3b');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
for(let i=0;i<65;i++){ctx.globalAlpha=.3+.2*Math.sin(t/1000+i);ctx.fillStyle='#e6f5ff';ctx.beginPath();ctx.arc((Math.sin(i*43.7)*.5+.5)*w,(Math.cos(i*17.3)*.5+.5)*h*.55,i%3===0?1.6:1,0,7);ctx.fill()}ctx.globalAlpha=1;
const moonX=w/2,moonY=h*.17,r=Math.min(view*.11,70);ctx.save();ctx.shadowColor='#99d6ff';ctx.shadowBlur=35;ctx.fillStyle='#e5f6ff';ctx.beginPath();ctx.arc(moonX,moonY,r,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#b7d8eb';for(const [dx,dy,s] of [[-.4,-.2,.15],[.4,.25,.23],[.1,-.5,.1]]){ctx.beginPath();ctx.arc(moonX+dx*r,moonY+dy*r,r*s,0,7);ctx.fill()}ctx.restore();
// Layered silhouetted mountains and a moon gate.
for(let layer=0;layer<2;layer++){ctx.fillStyle=layer?'#102d48':'#173e5c';ctx.beginPath();ctx.moveTo(0,h*.5);for(let i=0;i<=12;i++)ctx.lineTo(w*i/12,h*(.32+layer*.055+Math.sin(i*2.3+layer)*.06));ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill()}
ctx.strokeStyle='#5ca6d366';ctx.lineWidth=9;ctx.beginPath();ctx.arc(w/2,h*.28,view*.18,Math.PI,0);ctx.lineTo(w/2+view*.18,h*.38);ctx.moveTo(w/2-view*.18,h*.28);ctx.lineTo(w/2-view*.18,h*.38);ctx.stroke();
for(const side of [-1,1]){ctx.save();ctx.strokeStyle='#6affdf';ctx.lineWidth=2;ctx.shadowColor='#6affdf';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(w/2+side*view*.04,h*.29);ctx.lineTo(w/2+side*view*.48,h);ctx.stroke();ctx.restore();for(let i=0;i<5;i++){const q=.15+i*.18,bx=w/2+side*view*(.11+.35*q),by=h*(.36+.48*q);ctx.fillStyle='#0a1d32';ctx.beginPath();ctx.roundRect(bx-9*q,by-45*q,18*q,50*q,8*q);ctx.fill();ctx.fillStyle='#d8e6aa88';ctx.fillRect(bx-2*q,by-34*q,4*q,5*q)}}
const fog=ctx.createRadialGradient(w/2,h*.84,0,w/2,h*.84,view*.6);fog.addColorStop(0,'#329fff20');fog.addColorStop(1,'#329fff00');ctx.fillStyle=fog;ctx.fillRect(0,h*.4,w,h*.6)}
function character(){const p=project(x,0),r=Math.min(view*.048,35),jump=Math.sin(phase*Math.PI)*h*(highJumps.has(beat)?.19:.10);ctx.save();ctx.fillStyle='#06182c66';ctx.beginPath();ctx.ellipse(p.x,p.y+8,r*(1-.3*Math.sin(phase*Math.PI)),r*.25,0,0,7);ctx.fill();ctx.translate(p.x,p.y-r-jump);ctx.rotate((goal-x)*.08);const stretch=1+.10*Math.sin(phase*Math.PI)-pulse*.07;ctx.scale(1/stretch,stretch);ctx.fillStyle='#adf467';polygon([[-r*.8,-r*.55],[-r*.85,-r*1.35],[-r*.18,-r*.87]],'#adf467');polygon([[r*.8,-r*.55],[r*.85,-r*1.35],[r*.18,-r*.87]],'#adf467');const g=ctx.createRadialGradient(-r*.3,-r*.4,2,0,0,r*1.3);g.addColorStop(0,'#eeffb5');g.addColorStop(1,'#7ec94a');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r,r*.94,0,0,7);ctx.fill();ctx.fillStyle='#28513d';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*r*.32,-r*.1,r*.1,r*.16,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(side*r*.32-r*.02,-r*.16,r*.035,0,7);ctx.fill();ctx.fillStyle='#28513d'}ctx.strokeStyle='#28513d';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,r*.1,r*.26,.1,Math.PI-.1);ctx.stroke();ctx.fillStyle='#ff9fb3';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*r*.63,r*.14,r*.13,r*.07,0,0,7);ctx.fill()}ctx.restore()}
function draw(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(state==='play'){if(tapped.has(beat))goal=laneAt(beat);x+=(goal-x)*Math.min(1,dt*24);const time=Math.max(0,audio.currentTime-origin),position=time/step;const completed=Math.min(TOTAL,Math.floor(position));while(beat<completed&&state==='play'){land(beat);beat++}phase=position-Math.floor(position)}pulse=Math.max(0,pulse-dt*6);environment(now);const offset=state==='menu'?0:phase;for(let i=7;i>=0;i--){const n=beat+i;if(n<TOTAL)tile(laneAt(n),(i+1-offset)*1.35,i===0,tapped.has(n),n)}tile(laneAt(beat-1),-offset*1.35,false,false,beat-1);character();particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt*1.5;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle='#efffa6';ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;if(now>toastUntil)$('#toast').textContent='';requestAnimationFrame(draw)}requestAnimationFrame(draw);
