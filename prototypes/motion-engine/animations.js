'use strict';
// Newly authored reference treatments, informed by read-only m37 behavior.
const numberSchema=(defaults,ranges)=>({parse(value={}){const out={};for(const [key,fallback] of Object.entries(defaults)){const n=value[key]??fallback;if(typeof n!=='number'||!Number.isFinite(n))throw new TypeError(`${key} must be finite`);const [lo,hi]=ranges[key];out[key]=clamp(n,lo,hi);}return out;}});
const dotAt=(dot,x,y,size=2,opacity=.5,tone='base')=>dot({x,y,size,opacity,tone});
const waveNoise=(x,t)=>.5+.25*Math.sin(x*.041+t*.46)+.15*Math.sin(x*.017-t*.71)+.10*Math.cos(x*.083+t*.19);
function ghostRidge(x,w,h,t,kind,amplitude=.24){
 const nx=x/w;
 if(kind==='bars'||kind==='scatter'){const col=Math.floor(nx*10);return h*(.28+.25*waveNoise(col*71,0)+(amplitude*.25)*Math.sin(t*.8+col));}
 if(kind==='scan')return h*(.48+.12*Math.sin(nx*7-t)+amplitude*.55*Math.sin(nx*3+t*.4));
 return h*(.48+amplitude*(Math.sin(nx*8-t*.7)*.6+Math.sin(nx*17+t*.3)*.2+Math.cos(nx*4-t*.5)*.4));
}
const chartFactories={};
for(const kind of ['ridge','scan','terrain','bars','scatter','cycle']){
 const render=({surface,frame,dot},options)=>{
  const w=surface.width,h=surface.height-25,t=frame.timeMs/1000;let a=kind,b=kind,blend=0;const amplitude=options.amplitude??(options.sway!==undefined?options.sway*4:.24),highlightWidth=options.highlightWidth??90;
  if(kind==='cycle'){const seq=['ridge','bars','scatter'],step=(options.holdMs??3200)+(options.blendMs??460),i=Math.floor(frame.timeMs/step);a=seq[i%3];b=seq[(i+1)%3];blend=smooth((frame.timeMs%step-(options.holdMs??3200))/(options.blendMs??460));}
  for(let x=6;x<w;x+=9){const nx=x/w;const ridge=mix(ghostRidge(x,w,h,t,a,amplitude),ghostRidge(x,w,h,t,b,amplitude),blend);const hx=((t*72)%(w+220))-110;const sx=w+80-((t*145)%(w+180));
   for(let y=8;y<h;y+=9){
    const style=variant=>{const distance=y-ridge,crest=Math.exp(-Math.pow(distance/8,2)),below=distance>0?clamp(1-distance/(h*.68)):0,n=waveNoise(x+y*.7,t),bright=Math.exp(-Math.pow((x-hx)/highlightWidth,2));let alpha=.055+below*(.13+.12*n)+crest*(.54+.22*bright),size=1.5+crest*(1.6+.6*bright),lift=-2*crest,tone=crest>.5&&bright>.3?'accent':'base';
     if(variant==='scan'){const band=Math.exp(-Math.pow((x-sx)/(options.bandWidth??36),2)),trail=x>sx?Math.exp(-(x-sx)/(options.trail??160)):0;alpha=.045+crest*(.2+.6*Math.max(band,trail*.65))+band*.10;size=1.2+crest*(.8+band*1.5);tone=band>.3&&crest>.5?'accent':'base';}
     if(variant==='terrain'){const land=clamp(.5+distance/(h*.35));size=.7+3*(options.relief??1)*land*(.45+.55*n)+crest*1.2;alpha=.08+.27*land+crest*.45;lift=0;}
     if(variant==='bars'){const colW=w/10,edge=Math.abs((x%colW)/colW-.5),column=clamp((.38-edge)*colW/5),fill=clamp(distance/7+.5)*column;alpha=.045+fill*(.23+n*.16)+crest*column*.3;size=1.3+fill*.7+crest*column*.7;lift=0;tone=crest*column>.6?'accent':'base';}
     if(variant==='scatter'){const colW=w/10,dx=(x%colW)-colW/2,spot=Math.exp(-(dx*dx+distance*distance)/Math.pow(options.radius??13,2)),satellite=Math.exp(-(dx*dx+Math.pow(distance-h*(options.spread??.24),2))/85);alpha=.04+spot*.75+satellite*.3;size=1.2+spot*2.2+satellite*.7;lift=0;tone=spot>.65?'accent':'base';}
     return{alpha,size,lift,tone};};
    const s1=style(a),s2=blend?style(b):s1;dotAt(dot,x,y+mix(s1.lift,s2.lift,blend),mix(s1.size,s2.size,blend),mix(s1.alpha,s2.alpha,blend),kind==='cycle'?'base':s1.tone);
   }
  }
 };
 chartFactories[kind]=defineAnimation({contractVersion:1,id:`dotquilt/chart/${kind}`,family:'chart',phase:'idle',options:kind==='scan'?numberSchema({amplitude:.24,bandWidth:36,trail:160},{amplitude:[0,.4],bandWidth:[12,80],trail:[40,240]}):kind==='terrain'?numberSchema({amplitude:.24,relief:1},{amplitude:[0,.4],relief:[.4,1.4]}):kind==='bars'?numberSchema({sway:.07},{sway:[0,.12]}):kind==='scatter'?numberSchema({radius:13,spread:.24,sway:.045},{radius:[6,24],spread:[.1,.35],sway:[0,.1]}):kind==='cycle'?numberSchema({holdMs:3200,blendMs:460},{holdMs:[800,3200],blendMs:[200,600]}):numberSchema({amplitude:.24,highlightWidth:90},{amplitude:[0,.4],highlightWidth:[20,180]}),frame:render,still:(ctx,opts)=>render({...ctx,frame:{...ctx.frame,timeMs:0,static:true}},opts)});
}
const ridge=chartFactories.ridge;
function seriesY(points,x){if(!points.length)return NaN;let left=points[0];for(let i=1;i<points.length;i++){const right=points[i];if(x<=right.x)return mix(left.y,right.y,clamp((x-left.x)/Math.max(1,right.x-left.x)));left=right;}return left.y;}
const morphWipe=defineAnimation({contractVersion:1,id:'dotquilt/chart/morph-wipe',family:'chart',phase:'handoff',options:numberSchema({morphEnd:.86,wipeStart:.29,edge:40},{morphEnd:[.55,.95],wipeStart:[.15,.6],edge:[4,80]}),duration:surface=>surface.input.points.length?900:150,
 prepare(surface){const columns=new Map();for(const d of surface.source){const key=Math.round(d.x);const prev=columns.get(key);if(!prev||d.opacity>prev.alpha)columns.set(key,{crest:d.y,alpha:d.opacity});}return{columns};},
 frame({surface,frame,prepared,dot,reveal},options){if(!surface.input.points.length){const q=ease(frame.progress);for(const d of surface.source)dot({...d,opacity:d.opacity*(1-q)});reveal({opacity:q});return;}const p=frame.progress,w=surface.width,front=smooth((p-options.wipeStart)/(1-options.wipeStart)),wipeX=front*w;reveal({opacity:1,clipStart:front});
  for(const d of surface.source){const nx=d.x/w,q=smooth((p-nx*.35)/Math.max(.1,options.morphEnd-.35)),crest=prepared.columns.get(Math.round(d.x))?.crest??d.y,tgt=seriesY(surface.input.points,d.x);let y=d.y+(tgt-crest)*q,size=d.size,alpha=d.opacity;const near=Math.abs(y-tgt)<5.5;const inArea=y>tgt&&y<surface.input.baseline;
   if(near){y=mix(y,tgt,q);size=mix(size,2.6,q);alpha=mix(alpha,.95,q);}else if(inArea){const depth=clamp(1-(y-tgt)/Math.max(1,surface.input.baseline-tgt));size=mix(size,1.6,q);alpha=mix(alpha,.05+depth*.22,q);}else alpha*=1-q*.97;
   const leave=front<=0?1:clamp((d.x-wipeX+options.edge)/options.edge);dotAt(dot,d.x,y,size,alpha*leave,q>.3?'accent':d.tone);
  }
 }
});
// A small hand-authored 5×7 alphabet. This is not copied from the source package.
const bitmap={
'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],'I':['11111','00100','00100','00100','00100','00100','11111'],'J':['00111','00010','00010','00010','10010','10010','01100'],'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],'W':['10001','10001','10001','10101','10101','11011','10001'],'X':['10001','10001','01010','00100','01010','10001','10001'],'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],
'$':['00100','01111','10100','01110','00101','11110','00100'],',':['00000','00000','00000','00000','00100','00100','01000'],'.':['00000','00000','00000','00000','00000','00110','00110'],'+':['00000','00100','00100','11111','00100','00100','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'%':['11001','11010','00100','00100','01000','10110','00110'],'/':['00001','00010','00010','00100','01000','01000','10000'],' ':['00000','00000','00000','00000','00000','00000','00000']};
function glyphDots(cell,character=cell.character,all=false){const b=cell.bounds||cell,grid=bitmap[String(character).toUpperCase()]||bitmap[' '],out=[];for(let row=0;row<7;row++)for(let col=0;col<5;col++){const on=grid[row][col]==='1';if(on||all)out.push({x:b.x+(col+.65)*b.width/6,y:b.y+(row+.5)*b.height/7,size:Math.max(.9,Math.min(3,b.height/12)),opacity:on?.85:.07,tone:'base',on});}return out;}
function renderScramble({surface,frame,dot},options){
 if(!surface.input.precise){for(const shape of surface.input.mask)for(let x=shape.bounds.x;x<shape.bounds.x+shape.bounds.width;x+=6)for(let y=shape.bounds.y;y<shape.bounds.y+shape.bounds.height;y+=6)dotAt(dot,x,y,2,.32);return;}
 for(let i=0;i<surface.input.mask.length;i++){const cell=surface.input.mask[i],punct=/[^A-Za-z0-9]/.test(cell.character),phase=frame.timeMs/1000*options.changesPerSecond+i*.27,k=Math.floor(phase),blend=smooth((phase-k-.68)/.32),pool=/[0-9]/.test(cell.character)?'0123456789':'ABCDEFGHIJKLMNOPQRSTUVWXYZ',a=pool[(k*7+i*3)%pool.length],b=pool[((k+1)*7+i*3)%pool.length];
  const first=glyphDots(cell,punct?cell.character:a,true),second=glyphDots(cell,punct?cell.character:b,true);
  for(let d=0;d<first.length;d++){const v=first[d];dotAt(dot,v.x,v.y,v.size,frame.static?(punct?v.opacity*.45:.11):punct?v.opacity*.4:mix(v.opacity,second[d].opacity,blend)*.6);}
 }
}
const scramble=defineAnimation({contractVersion:1,id:'dotquilt/text/scramble',family:'text',phase:'idle',options:numberSchema({changesPerSecond:2.8},{changesPerSecond:[.5,4]}),frame:renderScramble,still:(ctx,o)=>renderScramble({...ctx,frame:{...ctx.frame,static:true,timeMs:0}},o)});
const labelPulse=defineAnimation({contractVersion:1,id:'dotquilt/text/label-pulse',family:'text',phase:'idle',options:numberSchema({travelPxPerSecond:70},{travelPxPerSecond:[20,140]}),frame:({surface,frame,dot},options)=>{const cells=surface.input.mask;if(!cells.length)return;const start=cells[0].bounds.x,end=cells.at(-1).bounds.x+cells.at(-1).bounds.width,y=cells[0].bounds.y+cells[0].bounds.height*.55,front=start+(frame.timeMs/1000*options.travelPxPerSecond)%(end-start+80)-40;for(let x=start;x<end;x+=3){const k=Math.exp(-Math.pow((x-front)/18,2));dotAt(dot,x,y-k*1.2,2+k,.18+k*.55,k>.5?'accent':'base');}},still:({surface,dot})=>{for(const c of surface.input.mask)dotAt(dot,c.bounds.x+c.bounds.width/2,c.bounds.y+c.bounds.height/2,2,.3);}});
function lockFactory(print=false){
 const schema=numberSchema({staggerMs:24,reelMs:55,settleMs:90,pop:.2},{staggerMs:[0,40],reelMs:[0,100],settleMs:[40,180],pop:[0,.3]});
 const duration=(surface,o)=>print?180+(Math.min(220,(surface.input.value.length-1)*o.staggerMs)+o.reelMs+o.settleMs+100)/1.5:Math.min(220,Math.max(0,surface.input.value.length-1)*o.staggerMs)+o.reelMs+o.settleMs+100;
 return defineAnimation({contractVersion:1,id:print?'dotquilt/text/print':'dotquilt/text/lock',family:'text',phase:'handoff',options:schema,duration:(s,o)=>s.input.precise?duration(s,o):150,
 prepare:(surface,o)=>({duration:duration(surface,o),span:Math.min(220,Math.max(0,surface.input.value.length-1)*o.staggerMs)}),
 frame({surface,frame,prepared,dot,reveal},o){const p=frame.progress;if(!surface.input.precise){for(const d of surface.source)dot({...d,opacity:d.opacity*(1-ease(p))});reveal({opacity:ease(p)});return;}
  const scale=print?1.5:1,delay=print?180:0,ms=Math.max(0,(p*prepared.duration-delay)*scale),xfadeAt=prepared.span+o.reelMs+o.settleMs-50,canvasAlpha=1-clamp((ms-xfadeAt)/150);reveal({opacity:1-canvasAlpha});
  const cells=surface.input.value;
  const starts=cells.map((_,i)=>prepared.span*(1-Math.pow(1-(cells.length<2?0:i/(cells.length-1)),1.5)));
  for(const d of surface.source){const index=cells.findIndex(c=>d.x>=c.bounds.x&&d.x<=c.bounds.x+c.bounds.width);if(index<0||ms<starts[index])dot({...d,opacity:d.opacity*canvasAlpha});}
  for(let i=0;i<cells.length;i++){const local=ms-starts[i];if(local<0)continue;const cell=cells[i],punct=/[^A-Za-z0-9]/.test(cell.character);if(local<o.reelMs&&!punct){const alternate=String((Number(cell.character)||i)+1).slice(-1),q=local/Math.max(1,o.reelMs);for(const d of glyphDots(cell,alternate))dotAt(dot,d.x,d.y-cell.bounds.height*.3*(1-q),d.size,d.opacity*canvasAlpha);}
   else{const q=clamp((local-(punct?0:o.reelMs))/o.settleMs),u=q-1,back=1+2.6*u*u*u+1.6*u*u,drop=-cell.bounds.height*.22*(1-back),pop=1+o.pop*(1-ease(q));for(const d of glyphDots(cell,cell.character,true))dotAt(dot,d.x,d.y+drop,d.size*pop,(d.on?.9:d.opacity*(1-q))*canvasAlpha,q>.35?'accent':'base');}
  }
 }
 });
}
const lock=lockFactory(),printText=lockFactory(true);
function tablePending(cell,index,time,still,shimmerOnly=false,cellStyle='auto'){
 const b=cell.bounds,row=cell.rowIndex??0,col=cell.columnIndex??0,kind=cellStyle==='auto'?cell.kind:cellStyle,phase=(time-row*80-col*60)%1600,q=clamp(phase/600),erase=clamp((phase-1150)/350),run=still?.72:shimmerOnly?.72:.12+.74*(q-erase*.85),out=[];
 const band=(start,width,badge=false)=>{for(let x=start;x<start+width;x+=5)for(let y=b.y+b.height*(badge?.29:.40);y<b.y+b.height*(badge?.72:.65);y+=4){const wave=(Math.sin(x*.025+y*.01-time*.003)+1)*.5,caret=Math.exp(-Math.pow((x-start-width)/9,2));out.push({x,y,size:badge?2.1:1.7,opacity:still?.28:.20+wave*.23+caret*.25,tone:caret>.5&&!still?'accent':'base'});}};
 const available=Math.max(20,b.width-12),width=Math.max(15,available*run);
 if(kind==='badge')band(b.x+4,available*.45,true);
 else if(kind==='badge-text'){band(b.x+4,Math.min(24,available*.22),true);band(b.x+36,Math.max(10,Math.min(width,available-38)));}
 else if(kind==='text-badge'){const textWidth=Math.min(width,available*.58);band(b.x+4,textWidth);band(b.x+textWidth+14,Math.min(24,available*.22),true);}
 else if(kind==='date'){for(let group=0;group<3;group++)band(b.x+4+group*available*.24,available*.17);}
 else if(kind==='number')band(b.x+b.width-width-4,width);
 else band(b.x+4,width);
 return out;
}
const tableCellStyles=['auto','text','number','badge','date','badge-text','text-badge'];
const typeOnSchema={parse(value={}){const normalized=numberSchema({cadenceMs:600},{cadenceMs:[250,1200]}).parse(value);const cellStyle=value.cellStyle??'auto';if(!tableCellStyles.includes(cellStyle))throw new TypeError('Invalid cellStyle');return{...normalized,cellStyle};}};

function typeOnFactory(shimmer=false){return defineAnimation({contractVersion:1,id:`dotquilt/table/${shimmer?'shimmer':'type-on'}`,family:'table',phase:'idle',options:typeOnSchema,frame:({surface,frame,dot},o)=>{surface.input.cells.forEach((c,i)=>tablePending(c,i,frame.timeMs*600/o.cadenceMs,false,shimmer,o.cellStyle).forEach(dot));},still:({surface,dot},o)=>surface.input.cells.forEach((c,i)=>tablePending(c,i,0,true,shimmer,o.cellStyle).forEach(dot))});}
const typeOn=typeOnFactory(),tableShimmer=typeOnFactory(true);
const rows=defineAnimation({contractVersion:1,id:'dotquilt/table/rows',family:'table',phase:'handoff',options:numberSchema({staggerMs:35,settlePx:4},{staggerMs:[0,50],settlePx:[0,8]}),duration:(s,o)=>s.revealTargetIds.length?7*o.staggerMs+370:150,
 prepare(surface,o){const cells=surface.input.cells.map((c,i)=>({cell:c,source:surface.source.filter(d=>d.x>=c.bounds.x&&d.x<c.bounds.x+c.bounds.width&&d.y>=c.bounds.y&&d.y<c.bounds.y+c.bounds.height),target:(c.glyphs??[]).flatMap(g=>glyphDots(g,g.character)),index:i}));return{cells,duration:7*o.staggerMs+370};},
 frame({surface,frame,prepared,dot,reveal,revealTarget},o){if(!surface.revealTargetIds.length){const q=ease(frame.progress);for(const d of surface.source)dot({...d,opacity:d.opacity*(1-q)});reveal({opacity:q});return;}const ms=frame.progress*prepared.duration;reveal({opacity:1});const revealed=new Set();
  for(const {cell,source,target}of prepared.cells){const q=clamp((ms-Math.min(cell.rowIndex??0,7)*o.staggerMs)/360),morph=smooth(q/.65),alpha=1-ease((q-.45)/.55),count=Math.max(source.length,target.length);if(!revealed.has(cell.rowId)){const show=ease((q-.35)/.45);revealTarget(cell.rowId,{opacity:show,translateY:(1-show)*o.settlePx});revealed.add(cell.rowId);}
   for(let k=0;k<count;k++){const from=source[k%Math.max(1,source.length)],to=target[k%Math.max(1,target.length)];if(!from&&!to)continue;const a=from??to,b=to??from;dotAt(dot,mix(a.x,b.x,morph),mix(a.y,b.y,morph),mix(a.size,b.size,morph),mix(a.opacity,b.opacity,morph)*alpha,morph>.3?cell.tone:a.tone);}
  }
 }
});
function fadeFactory(family){return defineAnimation({contractVersion:1,id:`dotquilt/${family}/fade`,family,phase:'handoff',options:numberSchema({},{ }),duration:()=>150,prepare:()=>undefined,frame:({surface,frame,dot,reveal})=>{const q=ease(frame.progress);for(const d of surface.source)dot({...d,opacity:d.opacity*(1-q)});reveal({opacity:q});}});}
const fades=Object.fromEntries(['chart','text','table','skeleton','typing','region'].map(f=>[f,fadeFactory(f)]));
function shapesIdle(family){const render=({surface,frame,dot})=>{if(family==='typing'){for(let i=0;i<3;i++){const wave=frame.static?.5:(1+Math.sin(frame.timeMs*.005-i*1.15))*.5;dotAt(dot,22+i*18,surface.height/2,5+wave*2,.25+wave*.55);}return;}for(const shape of surface.input.shapes)for(let x=shape.x;x<shape.x+shape.width;x+=7)for(let y=shape.y;y<shape.y+shape.height;y+=7){const wave=frame.static?.35:(1+Math.sin(x*.025+y*.012-frame.timeMs*.003))*.5;dotAt(dot,x,y,1.8+wave*1.2,.17+wave*.48,wave>.92?'accent':'base');}};return defineAnimation({contractVersion:1,id:`dotquilt/${family}/pulse`,family,phase:'idle',options:numberSchema({},{}),frame:render,still:(ctx,o)=>render({...ctx,frame:{...ctx.frame,static:true}},o)});}
const shapeFactories=Object.fromEntries(['skeleton','typing','region'].map(f=>[f,shapesIdle(f)]));
const dissolve=defineAnimation({contractVersion:1,id:'dotquilt/skeleton/dissolve',family:'skeleton',phase:'handoff',options:numberSchema({fallPx:5},{fallPx:[0,8]}),duration:()=>300,prepare:()=>undefined,frame:({surface,frame,dot,reveal},o)=>{const p=frame.progress;reveal({opacity:ease((p-.12)/.88)});for(const d of surface.source){const q=ease((p-d.x/surface.width*.18)/.82);dotAt(dot,d.x,d.y+q*o.fallPx,d.size*(1-q*.7),d.opacity*(1-q),d.tone);}}});
