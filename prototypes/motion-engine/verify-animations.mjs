// Decision-prototype checks. Not a production SDK test suite.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import assert from 'node:assert/strict';
const base=new URL('.',import.meta.url),context=createContext({console,performance,setTimeout,clearTimeout});
for(const file of ['engine.js','animations.js','custom-motion.js'])runInContext(readFileSync(new URL(file,base),'utf8'),context,{filename:file});
const api=runInContext('({chartFactories,morphWipe,scramble,labelPulse,lock,printText,typeOn,tableShimmer,rows,fades,shapeFactories,dissolve,drift,fanReveal})',context);
const glyphs=[...'$12.40'].map((character,i)=>({character,bounds:{x:i*25,y:30,width:24,height:32}}));
const cells=[0,1].map(row=>({bounds:{x:0,y:30+row*40,width:210,height:40},text:'Paid',baseline:58+row*40,tone:'accent',rowId:`row-${row}`,rowIndex:row,columnIndex:0,kind:'text',glyphs:[...'PAID'].map((character,i)=>({character,bounds:{x:i*15,y:42+row*40,width:14,height:12}}))}));
const input={chart:{points:[{x:0,y:120},{x:120,y:50},{x:300,y:30}],baseline:190},text:{mask:glyphs,value:glyphs,precise:true},table:{cells},skeleton:{shapes:[{x:0,y:20,width:240,height:14}]},region:{shapes:[{x:0,y:20,width:240,height:14}]},typing:{count:3}};
let checks=0;
function outputDot(out){return d=>{assert.ok([d.x,d.y,d.size,d.opacity].every(Number.isFinite),'finite drawing output');out.push(d);};}
function surface(family,source=[]){return{width:320,height:220,input:input[family],source,revealTargetIds:family==='table'?['row-0','row-1']:[]};}
const idles=[...Object.values(api.chartFactories),api.scramble,api.labelPulse,api.typeOn,api.tableShimmer,...Object.values(api.shapeFactories),api.drift];
const snapshots={};
for(const factory of idles){const b=factory(),s=surface(b.family);for(const staticFrame of [false,true]){const out=[];(staticFrame?b.definition.still:b.definition.frame)({surface:s,frame:{timeMs:1170,deltaMs:16,progress:0,static:staticFrame},dot:outputDot(out)},b.options);assert.ok(out.length>0&&out.length<=4096,`${b.id}: bounded nonempty output`);snapshots[b.family]??=out;checks++;}}
const handoffs=[api.morphWipe,api.lock,api.printText,api.rows,api.dissolve,api.fanReveal,...Object.values(api.fades)];
for(const factory of handoffs){const b=factory(),s=surface(b.family,snapshots[b.family]),prepared=b.definition.prepare(s,b.options),duration=b.definition.duration(s,b.options);assert.ok(duration>=0&&duration<=4000);for(const progress of [0,.25,.5,.75,1]){const out=[],targets=[];let reveal=null;b.definition.frame({surface:s,prepared,frame:{timeMs:1100,deltaMs:16,progress,static:false},dot:outputDot(out),reveal:value=>{reveal=value;},revealTarget:(id,value)=>targets.push({id,...value})},b.options);assert.ok(reveal&&Number.isFinite(reveal.opacity));if(progress===1){assert.equal(reveal.opacity,1);if('clipStart'in reveal)assert.equal(reveal.clipStart,1);for(const target of targets)assert.equal(target.opacity,1);}checks++;}}
assert.equal(api.morphWipe().definition.duration({...surface('chart'),input:{points:[],baseline:190}},{}),150);checks++;
assert.equal(api.rows().definition.duration({...surface('table'),revealTargetIds:[]},{staggerMs:35}),150);checks++;
assert.throws(()=>api.chartFactories.ridge({amplitude:'bad'}));
assert.throws(()=>api.typeOn({cellStyle:'invalid'}));checks+=2;
assert.equal(api.drift({amplitude:99}).options.amplitude,.4);checks++;
console.log(`${checks} prototype animation checks passed: finite output, still paths, total durations, terminal reveal, target fallback and option validation.`);
