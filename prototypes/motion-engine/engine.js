'use strict';
// Isolated planning runtime: exercises the draft seam, not the production package.
const clamp = (x,min=0,max=1)=>Math.min(max,Math.max(min,x));
const mix = (a,b,p)=>a+(b-a)*p;
const ease = p=>1-Math.pow(1-clamp(p),3);
const smooth = p=>{p=clamp(p);return p*p*(3-2*p);};
const bindingMark=Symbol('prototype animation binding');
function defineAnimation(definition){
 if(definition.contractVersion!==1||!definition.id||!['chart','text','table','skeleton','typing','region'].includes(definition.family)||!['idle','handoff'].includes(definition.phase)||typeof definition.frame!=='function'||typeof definition.options?.parse!=='function')throw new TypeError('Invalid animation definition');
 if(definition.phase==='idle'&&typeof definition.still!=='function')throw new TypeError('Idle definitions require a still renderer');
 if(definition.phase==='handoff'&&(typeof definition.prepare!=='function'||typeof definition.duration!=='function'))throw new TypeError('Handoff definitions require duration and prepare');
 definition=Object.freeze({...definition,options:Object.freeze({...definition.options})});
 return function bind(options={}){
  const parsed=definition.options.parse(options);if(!parsed||typeof parsed!=='object'||typeof parsed.then==='function')throw new TypeError('Animation options must be synchronous data');const normalized=Object.freeze(parsed);
  return Object.freeze({[bindingMark]:true,contractVersion:1,id:definition.id,family:definition.family,phase:definition.phase,options:normalized,definition});
 };
}
const studyClock={items:new Set(),raf:0,last:0,
 add(item){this.items.add(item);if(!this.raf)this.raf=requestAnimationFrame(t=>this.tick(t));},
 delete(item){this.items.delete(item);if(!this.items.size){cancelAnimationFrame(this.raf);this.raf=0;this.last=0;}},
 tick(t){this.raf=0;const dt=this.last?Math.min(t-this.last,50):16.7;this.last=t;for(const item of [...this.items])item.tick(t,dt);if(this.items.size)this.raf=requestAnimationFrame(next=>this.tick(next));else this.last=0;}
};
class PrototypeEngine{
 constructor({host,content,canvas,family,animations,input,revealTargets=[],onState,onLog}){
  Object.assign(this,{host,content,canvas,family,animations,input,onState,onLog});
  this.ctx=canvas.getContext('2d');this.phase='ready';this.cycle=0;this.tau=0;this.lastDots=[];this.windowStart=null;this.windowTimer=0;this.endTimer=0;this.dead=false;this.visible=true;this.paused=false;this.reduced=false;this.pointerResponse='none';this.duration=undefined;this.effects=new Map();this.pointer={x:-1000,y:-1000,k:0};this.boundPointer=false;this.inspection=null;this.activePlan=null;
  this.system=matchMedia('(prefers-reduced-motion: reduce)');this.fine=matchMedia('(hover: hover) and (pointer: fine)');this.forced=matchMedia('(forced-colors: active)');
  this.targets=revealTargets.slice(0,100).filter((t,i,a)=>t.id&&content.contains(t.element)&&t.element!==content&&a.findIndex(v=>v.id===t.id||v.element===t.element)===i);
  this.move=e=>{if(e.pointerType==='touch')return;const b=this.bounds;this.pointer.x=e.clientX-b.left;this.pointer.y=e.clientY-b.top;};this.leave=()=>{this.pointer.x=-1000;this.pointer.y=-1000;};
  this.policy=()=>{if(this.phase==='handoff'&&this.restricted())this.finish('Restriction changed; ready content settled immediately.');else{this.render(true);this.wake();this.notify();}};
  this.visibility=()=>{if((document.hidden||!this.visible)&&this.phase==='handoff')this.finish('Inactive handoff settled.');else this.wake();};
  this.system.addEventListener('change',this.policy);this.fine.addEventListener('change',this.policy);this.forced.addEventListener('change',this.policy);document.addEventListener('visibilitychange',this.visibility);
  this.io=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.visibility();});this.io.observe(host);
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);this.resize();
 }
 restricted(){return this.paused||this.reduced||this.system.matches||this.forced.matches;}
 exhausted(){return this.windowStart!==null&&performance.now()-this.windowStart>=4000;}
 eligible(){return !this.dead&&!document.hidden&&this.visible&&!this.restricted()&&!this.exhausted()&&!this.inspection&&this.phase!=='ready';}
 log(message){this.onLog?.(message);}
 notify(){this.host.setAttribute('aria-busy',String(this.phase==='pending'||this.phase==='refreshing'));this.onState?.({phase:this.phase,cycle:this.cycle,static:this.restricted()||this.exhausted(),elapsed:this.windowStart===null?0:performance.now()-this.windowStart,duration:this.activePlan?.duration??null,progress:this.inspection??(this.activePlan?clamp((performance.now()-this.activePlan.start)/this.activePlan.duration):0),pointer:this.boundPointer});}
 validate(binding,phase){if(!binding?.[bindingMark]||binding.family!==this.family||binding.phase!==phase)throw new TypeError('Wrong animation family or phase');return binding;}
 update(patch){
  if(patch.animations){try{for(const phase of ['idle','handoff'])if(patch.animations[phase])this.validate(patch.animations[phase],phase);this.animations={...this.animations,...patch.animations};}catch(error){this.log(error.message);}}
  if('duration'in patch)this.duration=patch.duration;
  for(const key of ['paused','reduced','pointerResponse'])if(key in patch)this[key]=patch[key];
  if(this.phase==='handoff'&&this.restricted()){this.log('Handoff cancelled by motion restriction.');this.finish();}else{this.render(true);this.wake();this.notify();}
 }
 resize(){
  if(this.dead)return;if(this.phase==='handoff'){this.finish('Geometry changed; content settled.');return;}
  this.bounds=this.host.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(this.bounds.width*dpr));this.canvas.height=Math.max(1,Math.round(this.bounds.height*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);
  this.colors={base:getComputedStyle(this.host).getPropertyValue('--dotquilt-color').trim()||'#6e7668',accent:getComputedStyle(this.host).getPropertyValue('--dotquilt-accent-color').trim()||'#477553'};
  this.data=this.input(this.bounds);this.surface={width:this.bounds.width,height:this.bounds.height,input:this.data,source:[],revealTargetIds:Object.freeze(this.targets.map(target=>target.id))};this.render(true);
 }
 start(refresh=false){
  if(this.dead)return;if(this.activePlan)this.log(`Cancel handoff for cycle ${this.activePlan.cycle}; superseded.`);
  const fresh=this.phase==='ready';clearTimeout(this.endTimer);this.activePlan=null;this.clearEffects();this.inspection=null;
  if(fresh){clearTimeout(this.windowTimer);this.windowTimer=0;this.windowStart=null;this.tau=0;}
  this.cycle++;this.phase=refresh?'refreshing':'pending';this.content.style.visibility=refresh?'visible':'hidden';this.content.inert=!refresh;this.content.setAttribute('aria-hidden',String(!refresh));this.canvas.hidden=false;this.host.classList.remove('is-error');
  this.log(`Cycle ${this.cycle}: ${refresh?'refresh, existing content stays visible':'pending, existing nodes stay mounted'}.`);this.render(true);this.wake();this.notify();
 }
 wake(){
  if(this.eligible()){
   if(this.windowStart===null){this.windowStart=performance.now();this.windowTimer=setTimeout(()=>{if(this.phase==='handoff')this.finish('Window ended; reveal complete.');else{studyClock.delete(this);this.syncPointer();this.render(true);this.log('Four-second motion window exhausted; still pending.');this.notify();}},4000);}
   studyClock.add(this);
  }else studyClock.delete(this);
  this.syncPointer();
 }
 syncPointer(){
  const enabled=this.pointerResponse==='lift'&&this.fine.matches&&this.eligible()&&this.phase==='pending'&&!['typing','region'].includes(this.family);
  if(enabled!==this.boundPointer){this.boundPointer=enabled;if(enabled){this.host.addEventListener('pointermove',this.move);this.host.addEventListener('pointerleave',this.leave);}else{this.host.removeEventListener('pointermove',this.move);this.host.removeEventListener('pointerleave',this.leave);this.leave();this.pointer.k=0;}}
 }
 tick(t,dt){if(!this.eligible()){studyClock.delete(this);return;}if(this.phase!=='handoff')this.tau+=dt;this.render(false,t,dt);this.notify();}
 effect(element,frame,wrapper=false){
  const opacity=clamp(Number.isFinite(frame.opacity)?frame.opacity:1),dy=clamp(Number.isFinite(frame.translateY)?frame.translateY:0,-8,8);
  const key={opacity,translate:`0px ${dy}px`};if(wrapper)key.clipPath=`inset(0 ${(1-clamp(frame.clipStart??1))*100}% 0 0)`;
  let animation=this.effects.get(element);if(!animation){animation=element.animate([key,key],{duration:1,fill:'both'});animation.pause();this.effects.set(element,animation);}else animation.effect.setKeyframes([key,key]);animation.currentTime=0;
 }
 clearEffects(){for(const animation of this.effects.values())animation.cancel();this.effects.clear();}
 render(forceStatic=false,t=performance.now(),dt=0){
  if(this.dead||!this.surface)return;const {width,height}=this.surface;this.ctx.clearRect(0,0,width,height);this.lastDots=[];
  this.host.classList.toggle('static-fallback',this.forced.matches&&this.phase==='pending');
  if(this.phase==='ready')return;
  if(this.phase==='refreshing'){this.ctx.fillStyle=this.colors.accent;this.ctx.beginPath();this.ctx.arc(width-8,8,3,0,Math.PI*2);this.ctx.fill();return;}
  const staticFrame=forceStatic||this.restricted()||this.exhausted();
  const plan=this.activePlan;
  const progress=this.inspection!==null?this.inspection:(plan?clamp((t-plan.start)/plan.duration):0);
  const drawDot=d=>{
   if(this.lastDots.length>=4096)return;if(![d.x,d.y,d.size,d.opacity].every(Number.isFinite)||d.x< -16||d.x>width+16||d.y< -16||d.y>height+16)return;
   const dot={x:d.x,y:d.y,size:clamp(d.size,.25,8),opacity:clamp(d.opacity),tone:d.tone==='accent'?'accent':'base'};this.lastDots.push(dot);
   let y=dot.y,size=dot.size,alpha=dot.opacity;
   if(this.boundPointer){const k=Math.pow(clamp(1-Math.hypot(dot.x-this.pointer.x,y-this.pointer.y)/90),2);y-=3*k;size*=1+.25*k;alpha=clamp(alpha+.2*k);}
   this.ctx.globalAlpha=alpha;this.ctx.fillStyle=this.colors[dot.tone];this.ctx.beginPath();this.ctx.arc(dot.x,y,size/2,0,Math.PI*2);this.ctx.fill();
  };
  const frame={timeMs:staticFrame?0:this.tau,deltaMs:dt,linearProgress:progress,progress,static:staticFrame};
  try{
   if(plan){const binding=plan.binding;binding.definition.frame({surface:plan.surface,frame,prepared:plan.prepared,dot:drawDot,reveal:v=>this.effect(this.content,v,true),revealTarget:(id,v)=>{const target=this.targets.find(target=>target.id===id);if(target)this.effect(target.element,v);}},binding.options);}
   else{const binding=this.validate(this.animations.idle,'idle');(staticFrame?binding.definition.still:binding.definition.frame)({surface:this.surface,frame,dot:drawDot},binding.options);}
  }catch(error){this.log(`Animation failed: ${error.message}. Safe fallback.`);if(plan)this.finish('Animation failed; ready content revealed immediately.');else{this.ctx.clearRect(0,0,width,height);for(let x=8;x<width;x+=9){this.ctx.globalAlpha=.35;this.ctx.fillStyle=this.colors.base;this.ctx.fillRect(x,height/2,2,2);}studyClock.delete(this);}}
  this.ctx.globalAlpha=1;
 }
 makePlan(){
  const binding=this.validate(this.animations.handoff,'handoff');
  this.render(this.restricted());const source=Object.freeze(this.lastDots.map(d=>Object.freeze({...d})));const surface=Object.freeze({...this.surface,source});
  const recommended=binding.definition.duration(surface,binding.options);const duration=this.duration??recommended;
  if(!Number.isFinite(duration)||duration<0||duration>4000)throw new RangeError('Handoff duration must be finite and between 0 and 4000ms');
  const prepared=binding.definition.prepare(surface,binding.options);if(prepared&&typeof prepared.then==='function')throw new TypeError('Animation preparation must be synchronous');return {binding,surface,duration,prepared,start:performance.now(),cycle:this.cycle};
 }
 ready(){
  if(!['pending','refreshing'].includes(this.phase))return;
  if(this.phase==='refreshing'||this.family==='typing'||this.restricted()||!this.visible||document.hidden){this.finish('Ready; immediate reveal for static/refresh/standalone mode.');return;}
  try{
   const plan=this.makePlan();const remaining=this.windowStart===null?4000:4000-(performance.now()-this.windowStart);
   if(plan.duration===0||plan.duration>remaining){this.finish('Ready; handoff skipped because it cannot fit the remaining window.');return;}
   this.activePlan=plan;this.phase='handoff';this.content.style.visibility='visible';this.content.inert=false;this.content.setAttribute('aria-hidden','false');this.syncPointer();this.log(`Start ${plan.binding.id}: ${Math.round(plan.duration)}ms total, cycle ${this.cycle}.`);this.render(false);
   this.endTimer=setTimeout(()=>{this.log(`End handoff for cycle ${plan.cycle}.`);this.finish();},plan.duration);this.wake();this.notify();
  }catch(error){this.log(error.message);this.finish('Invalid handoff; content revealed immediately.');}
 }
 inspect(progress){
  // Explicit design-tool state. Never rearms the automatic window or claims readiness.
  if(this.restricted()){this.log('Inspection is static while motion is restricted.');return;}
  if(!this.activePlan){if(this.phase==='ready')this.start();try{this.activePlan=this.makePlan();}catch(error){this.log(error.message);return;}}
  clearTimeout(this.endTimer);clearTimeout(this.windowTimer);this.phase='inspection';this.inspection=clamp(progress);studyClock.delete(this);this.syncPointer();this.content.style.visibility='visible';this.content.inert=true;this.content.setAttribute('aria-hidden','true');this.render(false);this.notify();
 }
 finish(message='Content ready.'){
  clearTimeout(this.endTimer);clearTimeout(this.windowTimer);studyClock.delete(this);this.activePlan=null;this.inspection=null;this.phase='ready';this.clearEffects();this.canvas.hidden=true;this.content.style.visibility='visible';this.content.inert=false;this.content.setAttribute('aria-hidden','false');this.syncPointer();this.log(message);this.notify();
 }
 fail(){this.log(this.activePlan?`Cancel handoff for cycle ${this.activePlan.cycle}; application failure.`:'Application failure.');this.finish('Failure outcome shown immediately.');this.host.classList.add('is-error');this.content.style.visibility='hidden';this.content.inert=true;this.content.setAttribute('aria-hidden','true');}
 dispose(){this.dead=true;clearTimeout(this.endTimer);clearTimeout(this.windowTimer);studyClock.delete(this);this.clearEffects();this.host.removeEventListener('pointermove',this.move);this.host.removeEventListener('pointerleave',this.leave);this.system.removeEventListener('change',this.policy);this.fine.removeEventListener('change',this.policy);this.forced.removeEventListener('change',this.policy);document.removeEventListener('visibilitychange',this.visibility);this.io.disconnect();this.ro.disconnect();this.lastDots=[];this.canvas.width=1;this.canvas.height=1;}
}
