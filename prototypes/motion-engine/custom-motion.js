'use strict';
// User-authored demonstration. Uses the same definition seam as the built-ins.
const drift = defineAnimation({
 contractVersion:1,id:'example/drift',family:'chart',phase:'idle',
 options:numberSchema({amplitude:.18,wavelength:100},{amplitude:[0,.4],wavelength:[24,220]}),
 frame({surface,frame,dot},options){
  const w=surface.width,h=surface.height-25,t=frame.timeMs/1000;
  for(let x=6;x<w;x+=8){const ridge=h*(.5+Math.sin(x/options.wavelength-t*1.2)*options.amplitude);
   for(let y=8;y<h;y+=8){const distance=Math.abs(y-ridge),glow=Math.exp(-distance*distance/150);dot({x,y,size:1.4+glow*2,opacity:.045+glow*.65,tone:glow>.6?'accent':'base'});}
  }
 },
 still({surface,dot}){for(let x=8;x<surface.width;x+=8)dot({x,y:surface.height/2,size:2,opacity:.3,tone:'base'});}
});
const fanReveal = defineAnimation({
 contractVersion:1,id:'example/fan-reveal',family:'chart',phase:'handoff',
 options:numberSchema({spread:30},{spread:[0,60]}),duration:()=>700,prepare:()=>undefined,
 frame({surface,frame,dot,reveal},options){
  const p=frame.progress;reveal({opacity:ease((p-.25)/.75)});
  for(const source of surface.source){const q=ease((p-source.x/surface.width*.25)/.75),away=(source.x/surface.width-.5)*options.spread;dot({...source,x:source.x+away*q,y:source.y-options.spread*q*.22,size:Math.max(.3,source.size*(1-q*.7)),opacity:source.opacity*(1-q)});}
 }
});
