'use strict';
// Decision-only drawing model. No package imports, extraction or production API implementation.
const directions = [
  {name:'Quiet', description:'A soft pulse. A clean dissolve.', detail:'Opacity leads: a stable silhouette breathes gently, then dissolves into the content. Pointer lift remains deliberately small.'},
  {name:'Flow', description:'A travelling wave. Dots find their place.', detail:'Direction leads: light travels through the surface; text locks from left to right, and chart/table dots approach the supplied geometry before dissolving.'},
  {name:'Tactile', description:'A gentle ripple. A small settling gesture.', detail:'Position leads: dot rows move gently in depth, text columns settle, and chart/table points move into place with a restrained vertical settle.'}
];
const queryVersion=new URLSearchParams(location.search).get('v');
if(queryVersion!==null&&![1,2,3].includes(Number(queryVersion))){const url=new URL(location);url.searchParams.set('v','1');history.replaceState(null,'',url);}
const config = {family:'skeleton', chart:'line', duration:150, pointer:false, reduced:false, international:false};
const systemReduce = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const forcedColors = matchMedia('(forced-colors: active)');
const pauseControl = document.getElementById('pause');
try { pauseControl.checked = localStorage.getItem('dotquilt-motion-paused') === '1'; } catch {}
let activeStudy = null;
const families = ['skeleton','text','chart','table','typing','region'];
const names = {skeleton:'Skeleton primitives',text:'Text loader',chart:'Chart loader',table:'Table loader',typing:'Typing dots',region:'Loading region'};
const captions = {skeleton:'A profile with a fixed footprint',text:'A bounded single-line value',chart:'A five-week revenue trend',table:'A compact invoice list',typing:'A standalone writing indicator',region:'One owner, one coordinated handoff'};
const chartY=[.72,.65,.69,.48,.52,.31,.36,.15,.22,.08,.17,.04];
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function chartMarkup(){
  const line=chartY.map((y,i)=>`${i*100/(chartY.length-1)},${y*140+15}`).join(' ');
  let marks=config.chart==='line'?`<polyline class="chart-line" points="${line}" vector-effect="non-scaling-stroke"/>`:config.chart==='bar'?chartY.map((y,i)=>`<rect class="chart-bars" x="${i*100/12+.7}" y="${y*140+15}" width="5.5" height="${170-y*140-15}"/>`).join(''):chartY.map((y,i)=>`<ellipse class="chart-bars" cx="${i*100/11}" cy="${y*140+15}" rx=".55" ry="3"/>`).join('');
  return `<div><svg class="actual-chart" role="img" aria-label="Illustrative May revenue trend, increasing overall" viewBox="0 0 100 190" preserveAspectRatio="none"><path class="chart-grid" d="M0 25H100M0 95H100M0 170H100" vector-effect="non-scaling-stroke"/>${marks}</svg><div class="chart-axis"><span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 31</span></div></div>`;
}
function contentMarkup(){
 switch(config.family){
 case 'skeleton': return `<div><div class="profile"><span class="avatar">MR</span><div><h3>Maya Reynolds</h3><p>Design engineer · Copenhagen</p></div></div><p class="profile-copy">Making everyday tools feel considered, clear and a little more human.</p><a class="profile-link" href="#study-notes">About this motion study</a></div>`;
 case 'text': return `<div><div class="number" ${config.international?'dir="auto"':''}>${config.international?'Բարև · مرحبًا · 🌍':'$12,480.00'}</div><p class="text-caption">${config.international?'Full text is preserved; decoration uses the generic fallback.':'May revenue · up 8.2% from April'}</p></div>`;
 case 'chart': return chartMarkup();
 case 'table': return `<div><table class="actual-table"><caption hidden>Illustrative recent invoices</caption><thead><tr><th>Customer</th><th>Status</th><th>Amount</th></tr></thead><tbody><tr><td>Northstar Studio</td><td><span class="tag">Paid</span></td><td>$2,400</td></tr><tr><td>Fieldwork</td><td><span class="tag">Paid</span></td><td>$1,680</td></tr><tr><td>Common Ground</td><td><span class="tag">Paid</span></td><td>$3,200</td></tr><tr><td>Studio Elsewhere</td><td><span class="tag">Paid</span></td><td>$1,120</td></tr></tbody></table></div>`;
 case 'typing': return `<div><p class="typing-copy">Maya sent a message.</p><p class="text-caption">Typing stops immediately. No content morph.</p></div>`;
 default: return `<div><h3 class="region-title">Your May overview is ready.</h3><p class="region-copy">Invoices, revenue and activity share a single readiness boundary. The region reveals this existing content once.</p><p class="region-total">$12,480.00</p><a class="profile-link" href="#study-notes">Review the coordination rule</a></div>`;
 }
}
function renderStudy(index){
 const d=directions[index];
 return `<section class="workspace" aria-label="${d.name} motion study"><div class="toolbar" role="group" aria-label="Component family">${families.map(f=>`<button class="family" data-family="${f}" aria-pressed="${f===config.family}">${f[0].toUpperCase()+f.slice(1)}</button>`).join('')}<label ${config.family!=='chart'?'hidden':''}>Chart shape <select id="chart-shape"><option value="line" ${config.chart==='line'?'selected':''}>Line</option><option value="bar" ${config.chart==='bar'?'selected':''}>Bar</option><option value="scatter" ${config.chart==='scatter'?'selected':''}>Scatter</option></select></label></div>
 <div class="specimen"><div class="specimen-head"><div><h2>${names[config.family]}</h2><p>${captions[config.family]}</p></div><span class="state">Ready</span></div>
 <div class="stage-frame" data-family="${config.family}" aria-busy="false"><div class="content">${contentMarkup()}</div><div class="error-outcome" hidden><h3>We couldn’t load this overview.</h3><p>The demo request failed. Choose Play cycle to retry.</p></div><canvas aria-hidden="true"></canvas><div class="static-fallback" aria-hidden="true"><i></i><i></i><i></i></div></div>
 <p class="status" role="status" aria-live="polite">Ready.</p><p class="pointer-note"></p></div>
 <div class="actions" role="group" aria-label="Application simulation"><button class="primary" data-action="play">Play cycle</button><button data-action="hold">Hold pending</button><button data-action="reveal">Reveal content</button><button data-action="refresh">Refresh</button><button data-action="fail">Fail load</button><button data-action="interrupt">Interrupt test</button><button data-action="late">Late readiness</button></div>
 <div class="settings"><label>Handoff <select id="timing"><option value="150" ${config.duration===150?'selected':''}>150ms · default</option><option value="300" ${config.duration===300?'selected':''}>300ms · explicit</option><option value="600" ${config.duration===600?'selected':''}>600ms · 4× inspection</option></select></label><label><input id="pointer" type="checkbox" ${config.pointer?'checked':''} ${['typing','region'].includes(config.family)?'disabled':''}>Pointer lift</label><label><input id="reduce" type="checkbox" ${config.reduced?'checked':''}>Reduced-motion preview</label><label class="text-choice" ${config.family!=='text'?'hidden':''}><input id="international" type="checkbox" ${config.international?'checked':''}>International text fallback</label></div></section>
 <div class="below" id="study-notes"><section><h2><span class="direction-name">${d.name}</span> · ${d.description}</h2><p>${d.detail}</p><p style="margin-top:9px">Each cycle gets at most four seconds of automatic motion, including its handoff. Inspection slows only the handoff; it keeps the same wall-clock limit.</p></section><section><h2>What happened</h2><ol class="event-log" aria-label="Simulation observations"></ol></section></div>`;
}
const variants = directions.map((_,i)=>()=>renderStudy(i));
function attachStudy(index){
 activeStudy?.dispose();
 const root=document.getElementById('stage');
 const frame=root.querySelector('.stage-frame');
 if(!frame)return;
 let disposed=false,phase='ready',cycle=0,started=0,windowStart=null,windowTimer=0,raf=0,handoffStart=0,handoffDuration=0,handoffTimer=0,settledReady=true,visible=true,refreshing=false;
 let width=0,height=0,dpr=1,points=[],targets=[],lastGlyph=-1,logs=[],moveBound=false,pointer={x:-1000,y:-1000},hover=0,lastFrame=0,dotColor='#69785f';
 const timers=new Set();
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
 const content=root.querySelector('.content'),state=root.querySelector('.state'),status=root.querySelector('.status'),pointerNote=root.querySelector('.pointer-note');
 const glyphCanvas=document.createElement('canvas'),glyphContext=glyphCanvas.getContext('2d',{willReadFrequently:true});
 const now=()=>performance.now();
 const elapsed=()=>windowStart===null?0:now()-windowStart;
 const restricted=()=>pauseControl.checked||config.reduced||systemReduce.matches;
 const exhausted=()=>windowStart!==null&&elapsed()>=4000;
 const active=()=>!disposed&&visible&&!document.hidden&&!restricted()&&!exhausted()&&(phase==='pending'||phase==='refreshing'||phase==='handoff');
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;};
 function clearSimulation(){for(const id of timers)clearTimeout(id);timers.clear();}
 function log(message){logs.unshift({time:((now()-started)/1000).toFixed(2),message});logs=logs.slice(0,8);root.querySelector('.event-log').innerHTML=logs.map(l=>`<li><time>${l.time}s</time><span>${esc(l.message)}</span></li>`).join('');}
 function pointerMove(e){if(e.pointerType==='touch')return;const b=frame.getBoundingClientRect();pointer.x=e.clientX-b.left;pointer.y=e.clientY-b.top;}
 function pointerLeave(){pointer.x=-1000;pointer.y=-1000;}
 function syncPointer(){
 const eligible=config.pointer&&!['typing','region'].includes(config.family)&&finePointer.matches&&active()&&phase==='pending';
 if(eligible!==moveBound){moveBound=eligible;if(eligible){frame.addEventListener('pointermove',pointerMove);frame.addEventListener('pointerleave',pointerLeave);}else{frame.removeEventListener('pointermove',pointerMove);frame.removeEventListener('pointerleave',pointerLeave);pointerLeave();hover=0;}}
 frame.dataset.track=String(eligible);
 pointerNote.textContent=['typing','region'].includes(config.family)?'This surface has no pointer-response setting.':!config.pointer?'Pointer response is off by default.':!finePointer.matches?'Pointer lift needs a fine hover pointer; touch remains fully usable.':eligible?'Move across the dots to feel the lift.':'Pointer lift is suspended outside active pending motion.';
 }
 function showContent(show){content.style.visibility=show?'visible':'hidden';content.inert=!show;content.setAttribute('aria-hidden',String(!show));}
 function syncUI(message){
 state.textContent=phase==='handoff'?'Handoff':phase==='pending'?(exhausted()?'Pending · static':'Pending'):phase==='refreshing'?'Refreshing':'Ready';
 frame.setAttribute('aria-busy',String(phase==='pending'||phase==='refreshing'));
 frame.classList.toggle('forced-pending',forcedColors.matches&&(phase==='pending'));
 if(message)status.textContent=message;
 root.querySelector('[data-action=reveal]').disabled=!['pending','refreshing'].includes(phase);
 root.querySelector('[data-action=fail]').disabled=!['pending','refreshing','handoff'].includes(phase);
 syncPointer();
 }
 function buildGlyphs(text){
 const size=Math.min(62,width/7.5),startX=3,top=35,cellWidth=size*.602;
 glyphCanvas.width=Math.max(1,Math.ceil(cellWidth*text.length+10));glyphCanvas.height=Math.ceil(size*1.3);
 glyphContext.clearRect(0,0,glyphCanvas.width,glyphCanvas.height);glyphContext.fillStyle='#000';glyphContext.font=`500 ${size}px monospace`;glyphContext.textBaseline='top';glyphContext.fillText(text,0,0);
 const data=glyphContext.getImageData(0,0,glyphCanvas.width,glyphCanvas.height).data,result=[];
 for(let y=0;y<glyphCanvas.height;y+=4)for(let x=0;x<glyphCanvas.width;x+=4)if(data[(y*glyphCanvas.width+x)*4+3]>90)result.push({x:startX+x,y:top+y,r:1.25,group:Math.floor(x/cellWidth)});
 return result.slice(0,4096);
 }
 const dot=(x,y,r=1.35,group=0)=>({x,y,r,group});
 function addRect(out,x,y,w,h,g=0){for(let py=y;py<y+h;py+=7)for(let px=x;px<x+w;px+=7)out.push(dot(px,py,1.3,g));}
 function chartTarget(x){const k=x*(chartY.length-1),a=Math.floor(k),b=Math.min(chartY.length-1,a+1);return (chartY[a]+(chartY[b]-chartY[a])*(k-a))*140+15;}
 function geometry(){
 const out=[],dest=[];
 if(config.family==='text'&&!config.international){points=buildGlyphs('$00,000.00');targets=buildGlyphs('$12,480.00');return;}
 if(config.family==='chart'&&config.chart==='scatter'){
 for(let i=0;i<chartY.length;i++){const x=i*width/(chartY.length-1),y=chartY[i]*140+15;for(const [ox,oy] of [[-2,0],[0,0],[2,0],[0,-2],[0,2]]){out.push(dot(x+ox,65+(i*17%100)+oy,1.3,i));dest.push(dot(x+ox,y+oy,1.3,i));}}
 points=out;targets=dest;return;
 }
 if(config.family==='chart'){
 for(let x=7;x<width-6;x+=7){const nx=x/width;const targetY=chartTarget(nx);if(config.chart==='line'){for(let lane=0;lane<3;lane++){out.push(dot(x,95+Math.sin(nx*6)*27+lane*7));dest.push(dot(x,targetY+lane*2,1));}}else if(config.chart==='bar'){const col=Math.floor(nx*12),barY=chartY[col]*140+15;if(nx*12-col<.68){for(let y=barY+12;y<170;y+=7){out.push(dot(x,Math.max(25,y+Math.sin(col)*12),1.3,col));dest.push(dot(x,y,1.3,col));}}}}
 }else if(config.family==='table'){
 const starts=[0,width*.44,width*.84],widths=[width*.31,width*.14,width*.15];
 for(let row=0;row<5;row++)for(let col=0;col<3;col++){const begin=out.length;addRect(out,starts[col]+3,17+row*39,widths[col],row===0?7:14,row);for(let k=begin;k<out.length;k++)dest.push({...out[k],y:out[k].y-2});}
 }else if(config.family==='typing'){
 for(let i=0;i<3;i++){out.push(dot(12+i*16,91,3.2,i));dest.push(dot(12+i*16,91,3.2,i));}
 }else if(config.family==='region'){
 addRect(out,3,20,width*.6,21);addRect(out,3,62,width*.88,14,1);addRect(out,3,90,width*.72,14,2);addRect(out,3,145,width*.32,28,3);dest.push(...out.map(p=>({...p})));
 }else if(config.family==='text'){
 addRect(out,3,49,width*.82,28);dest.push(...out.map(p=>({...p})));
 }else{
 for(let y=15;y<62;y+=7)for(let x=3;x<50;x+=7)if(Math.hypot(x-25,y-38)<25)out.push(dot(x,y));addRect(out,72,20,width*.4,14,1);addRect(out,72,48,width*.29,7,2);addRect(out,3,97,width*.91,14,3);addRect(out,3,126,width*.78,14,4);addRect(out,3,171,width*.22,7,5);dest.push(...out.map(p=>({...p})));
 }
 points=out.slice(0,4096);targets=dest.slice(0,4096);
 }
 function resize(){dotColor=getComputedStyle(frame).color;const box=frame.getBoundingClientRect();width=box.width;height=box.height;const number=content.querySelector('.number');if(number&&!config.international){number.style.fontSize=Math.min(62,width/7.5)+'px';number.style.fontFamily='monospace';}dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);geometry();lastGlyph=-1;draw(now(),true);}
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>1-Math.pow(1-clamp(x),3);
 function draw(t,staticOnly=false){
 if(disposed)return;
 ctx.clearRect(0,0,width,height);
 if(phase==='ready'){content.style.opacity='1';return;}
 const isMoving=!staticOnly&&active(),seconds=isMoving?(t-windowStart)/1000:0;
 const progress=phase==='handoff'?clamp((t-handoffStart)/handoffDuration):0;
 const eased=ease(progress);
 const isText=config.family==='text'&&!config.international;
 // Glyph changes are bounded, sparse and low-contrast, never changes to the real text.
 if(isText&&index>0&&phase==='pending'){
 const tick=isMoving?Math.floor(seconds*2):0;
 if(tick!==lastGlyph){const label='$12,480.00';const chars=[...label].map((c,i)=>/[0-9]/.test(c)?String((i*3+tick*7)%10):c).join('');points=buildGlyphs(chars);lastGlyph=tick;}
 }
 if(isText&&phase==='handoff'&&index===1){
 const label='$12,480.00';const tick=Math.floor((t-windowStart)/500);const chars=[...label].map((c,i)=>/[0-9]/.test(c)&&progress<i/label.length?String((i*3+tick*7)%10):c).join('');points=buildGlyphs(chars);
 }
 if(phase==='refreshing'){
 const r=3+(isMoving?Math.sin(seconds*4)*.5:0);ctx.fillStyle='#52664a';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(width-8,8,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return;
 }
 ctx.fillStyle=dotColor;
 const frameDelta=lastFrame?Math.min(64,t-lastFrame):16;lastFrame=t;
 const pointerAim=moveBound&&pointer.x>0?1:0;hover+=(pointerAim-hover)*(1-Math.exp(-frameDelta/60));
 for(let k=0;k<points.length;k++){
 const p=points[k],dest=targets[k%Math.max(1,targets.length)]||p;
 let x=p.x,y=p.y,r=p.r,alpha=.62;
 if(isMoving){
 if(index===0){alpha=.49+.13*Math.sin(seconds*2.7);}
 if(index===1){const wave=(Math.sin(x*.025+y*.018-seconds*3.3)+1)*.5;alpha=.30+wave*.52;r*=.84+wave*.18;if(config.family==='chart'&&phase==='pending')y+=Math.sin(x*.015+seconds*1.6)*7;}
 if(index===2){const wave=Math.sin(seconds*3.8-x*.019-p.group*.4);alpha=.43+.17*(wave+1)*.5;y-=wave*1.7;r*=.94+.08*wave;}
 if(config.family==='typing'){const wave=(Math.sin(seconds*4.2-p.group*1.1)+1)*.5;alpha=.35+wave*.5;if(index===1)r*=.8+wave*.3;if(index===2)y-=wave*3;}
 }
 if(moveBound&&hover>0){const dist=Math.hypot(x-pointer.x,y-pointer.y);const influence=Math.pow(Math.max(0,1-dist/85),2)*hover;y-=influence*[1.5,2.5,3.5][index];r*=1+influence*.3;alpha=Math.min(.9,alpha+influence*.23);}
 if(phase==='handoff'){
 if(index>0&&['chart','table'].includes(config.family)){x+=(dest.x-x)*eased;y+=(dest.y-y)*eased;if(index===2)y-=Math.sin(progress*Math.PI)*2.5;}
 if(index===2&&isText){const local=ease(clamp((progress-p.group*.025)/.7));y+=(1-local)*5;}
 if(index===1){const local=clamp((progress-.30)/.70);alpha*=1-ease(local);}else alpha*=1-eased;
 }
 ctx.globalAlpha=clamp(alpha);ctx.beginPath();ctx.arc(x,y,Math.max(.7,r),0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=1;
 if(phase==='handoff')content.style.opacity=String(index===1?ease(clamp((progress-.30)/.70)):eased);
 }
 function loop(t){raf=0;if(!active())return;draw(t);raf=requestAnimationFrame(loop);}
 function wake(){if(windowStart===null&&!restricted()&&visible&&!document.hidden&&phase!=='ready'){windowStart=now();windowTimer=setTimeout(stopWindow,4000);}syncPointer();if(active()&&!raf)raf=requestAnimationFrame(loop);else if(!active()){cancelAnimationFrame(raf);raf=0;draw(now(),true);}}
 function stopWindow(){if(disposed||phase==='ready')return;if(phase==='handoff')finish('Motion window ended; content is ready.');else{cancelAnimationFrame(raf);raf=0;draw(now(),true);syncUI('Still loading. Decoration is static after four seconds.');log('Four-second window exhausted; pending continues.');}}
 function cancelHandoff(){if(phase==='handoff'){clearTimeout(handoffTimer);handoffTimer=0;log(`Handoff cancelled for cycle ${cycle}.`);}}
 function begin(mode='play'){
 clearSimulation();cancelHandoff();cancelAnimationFrame(raf);raf=0;
 if(settledReady){windowStart=null;clearTimeout(windowTimer);windowTimer=0;}
 settledReady=false;started=now();cycle++;phase=mode==='refresh'?'refreshing':'pending';refreshing=mode==='refresh';
 root.querySelector('.error-outcome').hidden=true;content.style.opacity='1';showContent(refreshing);canvas.hidden=false;frame.classList.remove('forced-pending');
 geometry();lastGlyph=-1;pointerLeave();
 log(`Cycle ${cycle}: ${refreshing?'refresh; useful content stays visible.':'pending; supplied content stays mounted.'}`);
 syncUI(refreshing?'Refreshing. Existing content remains visible.':'Loading. Readiness belongs to this demo application.');draw(now(),!active());wake();
 if(mode==='play'||mode==='refresh')later(()=>reveal(),1400);
 if(mode==='late')later(()=>reveal(),4100);
 if(mode==='interrupt'){later(()=>{reveal();later(()=>{begin('hold');log('A newer load superseded the previous handoff.');later(()=>reveal(),850);},50);},850);}
 }
 function finish(message='Content ready.'){
 clearTimeout(handoffTimer);handoffTimer=0;phase='ready';settledReady=true;refreshing=false;clearTimeout(windowTimer);windowTimer=0;
 cancelAnimationFrame(raf);raf=0;showContent(true);content.style.opacity='1';ctx.clearRect(0,0,width,height);syncUI(message);log('Ready; no decorative frame loop remains.');
 }
 function reveal(){
 if(!['pending','refreshing'].includes(phase))return;clearSimulation();
 const remaining=windowStart===null?0:4000-elapsed();
 if(config.family==='typing'||refreshing||restricted()||forcedColors.matches||!visible||document.hidden||remaining<config.duration){
 const reason=remaining<config.duration?'insufficient motion window':restricted()?'motion restriction':refreshing?'refresh keeps content visible':config.family==='typing'?'standalone typing stops':'inactive/static presentation';
 log(`Immediate reveal: ${reason}.`);finish(`Content ready. Immediate reveal: ${reason}.`);return;
 }
 phase='handoff';handoffStart=now();handoffDuration=config.duration;showContent(true);content.style.opacity='0';log(`Handoff started; ${handoffDuration}ms total, cycle ${cycle}.`);syncUI(`Content ready. ${handoffDuration}ms handoff in progress.`);
 handoffTimer=setTimeout(()=>{log(`Handoff ended for cycle ${cycle}.`);finish();},handoffDuration);wake();
 }
 function fail(){clearSimulation();cancelHandoff();log(`Application failure in cycle ${cycle}; no success morph.`);finish('Demo request failed. Choose Play cycle to retry.');showContent(false);root.querySelector('.error-outcome').hidden=false;}
 function policyChanged(){if(restricted()&&phase==='handoff'){log('Handoff settled because motion became restricted.');finish();}else{if(restricted())pointerLeave();draw(now(),true);syncUI(phase==='ready'?undefined:exhausted()?'Still loading. Decoration is static after four seconds.':restricted()?'Loading with static decoration.':phase==='refreshing'?'Refreshing. Existing content remains visible.':'Loading. Readiness belongs to this demo application.');wake();}}
 function visibilityChanged(){if((document.hidden||!visible)&&phase==='handoff'){log('Inactive handoff settled.');finish();}else wake();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(frame);
 const intersectionObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibilityChanged();});intersectionObserver.observe(frame);
 document.addEventListener('visibilitychange',visibilityChanged);systemReduce.addEventListener('change',policyChanged);finePointer.addEventListener('change',syncPointer);forcedColors.addEventListener('change',policyChanged);
 root.querySelectorAll('[data-family]').forEach(b=>{if(b.tagName==='BUTTON')b.addEventListener('click',()=>{config.family=b.dataset.family;mount(current);});});
 root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.action;if(action==='reveal')reveal();else if(action==='fail')fail();else begin(action);}));
 root.querySelector('#chart-shape').addEventListener('change',e=>{config.chart=e.target.value;mount(current);});
 root.querySelector('#timing').addEventListener('change',e=>{config.duration=Number(e.target.value);log('Timing updated for the next handoff; cycle preserved.');});
 root.querySelector('#pointer').addEventListener('change',e=>{config.pointer=e.target.checked;syncPointer();log(`Pointer response ${config.pointer?'enabled':'disabled'}; cycle preserved.`);});
 root.querySelector('#reduce').addEventListener('change',e=>{config.reduced=e.target.checked;policyChanged();log(`Reduced-motion preview ${config.reduced?'on':'off'}; window preserved.`);});
 root.querySelector('#international').addEventListener('change',e=>{config.international=e.target.checked;mount(current);});
 activeStudy={policyChanged,dispose(){disposed=true;clearSimulation();clearTimeout(windowTimer);clearTimeout(handoffTimer);cancelAnimationFrame(raf);resizeObserver.disconnect();intersectionObserver.disconnect();frame.removeEventListener('pointermove',pointerMove);frame.removeEventListener('pointerleave',pointerLeave);document.removeEventListener('visibilitychange',visibilityChanged);systemReduce.removeEventListener('change',policyChanged);finePointer.removeEventListener('change',syncPointer);forcedColors.removeEventListener('change',policyChanged);canvas.width=1;canvas.height=1;points=[];targets=[];}};
 resize();begin('play');
}
pauseControl.addEventListener('change',()=>{try{localStorage.setItem('dotquilt-motion-paused',pauseControl.checked?'1':'0');}catch{}activeStudy?.policyChanged();});
// Observe only the harness mount boundary. Internal controls never remount the supplied content.
new MutationObserver(()=>{if(document.querySelector('#stage .workspace'))attachStudy(current);}).observe(document.getElementById('stage'),{childList:true});
