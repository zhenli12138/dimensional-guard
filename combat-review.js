import {Assets} from './assets.js';
import {Renderer} from './renderer.js';
import {World} from './world.js';
import {createBattleClass} from './battle.js';

const canvas=document.getElementById('stage'),labels=document.getElementById('labels'),assets=new Assets(),r=new Renderer(canvas),names=['game','towers-2d','heroes-art','enemies-art-2d','bosses-art','combat-52'],loaded=await Promise.all(names.map(n=>assets.json(n)));
const [game,towers,heroes,enemies,bosses,combat52]=loaded;Object.assign(TD,game);TD.art={towers,heroes,enemies,combat52};const d={towers,heroes,enemies,bosses,combat52},w=new World(r,assets,d),B=createBattleClass(TD);
await assets.loadTree([towers,heroes,enemies,combat52]);document.getElementById('status').remove();
let mode='towers',paused=false,slow=false,clock=0,last=performance.now(),battle;
const dir=['e','se','s','sw','w','nw','n','ne'];
function resize(){r.resize(canvas.parentElement.clientWidth,Math.max(160,canvas.parentElement.clientHeight));labels.replaceChildren();}addEventListener('resize',resize);resize();
function label(text,x,y){const span=document.createElement('span');span.textContent=text;span.style.left=x+'px';span.style.top=y+'px';labels.append(span);}
function newBattle(){const profile=TD.Progress.defaults();profile.heroProgress[0]={xp:2000,skills:[0,0,0,0,0]};const level={...TD.levels[0],paths:[[[80,310],[920,310]]],slots:[[430,360]],approachSegments:[0]};TD.levels[0]=level;battle=new B(0,0,profile,55);battle.hero.x=580;battle.hero.y=310;battle.gold=10000;const tower=battle.build(0,3);tower.rally={x:505,y:310};for(const [i,id]of [0,17,16].entries()){const e=battle.spawn(id,0,390+i*20);e.maxHp=e.hp=id===17?1800:900;e.dmg=8;}w.combat.reset();}
newBattle();
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;labels.replaceChildren();document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
document.getElementById('baseline').onclick=e=>{w.baselineVisible=!w.baselineVisible;e.currentTarget.setAttribute('aria-pressed',String(w.baselineVisible));};document.getElementById('slow').onclick=e=>{slow=!slow;e.currentTarget.setAttribute('aria-pressed',String(slow));};
document.getElementById('family').onchange=()=>labels.replaceChildren();document.getElementById('state').onchange=()=>labels.replaceChildren();document.getElementById('pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'继续':'暂停';};document.getElementById('reset').onclick=()=>{clock=0;newBattle();labels.replaceChildren();};
function base(){r.begin('#243133');w.hits=[];w.selected=null;w.alpha=1;w.point=(x,y)=>({x,y});w.camera.scale=Math.min(r.width/1100,r.height/620)*1.5;w.battle={time:clock,heroIndex:0};}
function towerPage(){const cols=r.width<800?2:4,rows=Math.ceil(8/cols),width=r.width/cols,height=r.height/rows;w.camera.scale=Math.min(width/245,height/190)*1.35;
  for(let i=0;i<8;i++){const type=Math.floor(i/2),spec=i%2,x=(i%cols+.5)*width,y=(Math.floor(i/cols)+.75)*height,t=clock%2.3;
    w.tower({type,level:4,spec,x,y,locked:0,anim:{state:'attack',time:t,duration:.95,left:t<.95?1:0}});if(!labels.childElementCount||labels.childElementCount<8)label(TD.towers[type].specs[spec][0],x,y+28);
  }
}
function directionNow(){const v=document.getElementById('direction').value;return v==='auto'?dir[Math.floor(clock/1.2)%8]:v;}
function enemyPage(){const family=+document.getElementById('family').value,state=document.getElementById('state').value,cols=r.width<800?2:4,width=r.width/cols,height=r.height/(cols===2?2:1),direction=directionNow();w.camera.scale=Math.min(width/140,height/140)*1.45;
  for(let j=0;j<4;j++){const id=family*4+j,x=(j%cols+.5)*width,y=(Math.floor(j/cols)+.58)*height,phase=clock%1.1,index=dir.indexOf(direction),dx=[1,.707,0,-.707,-1,-.707,0,.707][index],dy=[0,.707,1,.707,0,-.707,-1,-.707][index];w.point=(wx,wy)=>({x:x+wx*1.3645*w.camera.scale,y:y+wy*1.2387*w.camera.scale});const e={...TD.enemies[id],id,uid:j+1,x:0,y:0,hp:100,maxHp:100,age:10,kind:null,dead:state==='death',life:Math.max(.01,1.1-phase),max:1.1,anim:{direction,heading:Math.atan2([0,1,1,1,0,-1,-1,-1][dir.indexOf(direction)],[1,1,0,-1,-1,-1,0,1][dir.indexOf(direction)]),state,time:phase,left:state==='attack'||state==='hurt'?1:0,duration:.65,facing:['w','sw','nw'].includes(direction)?-1:1,walkDistance:clock*28,lastStep:0,walkBlend:state==='walk'?1:0,moving:state==='walk',vx:dx*25,vy:dy*25,prevX:0,prevY:0,impactLife:state==='hurt'?.1:0,impactX:1}};w.actor(e);if(labels.childElementCount<4)label(TD.enemies[id].name,x,y+35);}
}
function allyPage(){const state=document.getElementById('state').value,direction=directionNow(),cols=r.width<800?2:4,width=r.width/cols,height=r.height/(cols===2?2:1);w.camera.scale=Math.min(width/150,height/160)*1.45;
  for(let j=0;j<4;j++){const x=(j%cols+.5)*width,y=(Math.floor(j/cols)+.62)*height,phase=clock%1.1;w.point=(wx,wy)=>({x:x+wx*1.3645*w.camera.scale,y:y+wy*1.2387*w.camera.scale});const e={kind:j===0?'hero':'soldier',heroIndex:0,tower:j>1?{level:4,spec:j-2}:null,uid:j+1,x:0,y:0,hp:100,maxHp:100,age:10,dead:state==='death',life:1.5,max:1.5,anim:{direction,state,time:phase,duration:.65,facing:['w','sw','nw'].includes(direction)?-1:1,walkDistance:clock*28,lastStep:0,moving:state==='walk',prevX:0,prevY:0}};w.actor(e);if(labels.childElementCount<4)label(combat52.allies[j].name,x,y+35);}
}
function projectilePage(){const cols=4,width=r.width/cols,height=r.height/3;w.camera.scale=Math.min(width/210,height/100)*1.7;
  for(let id=0;id<12;id++){const x=(id%cols+.5)*width,y=(Math.floor(id/cols)+.55)*height,t=clock%1.25;if(id<9){w.combat.projectile({x:x-65+t/1.25*130,y,age:t,visual:id,kind:id<3?'star':id<6?'book':'rice',startX:x-65,startY:y,flightTime:1.25,target:{x:x+65,y}});}else{w.combat.effects=[{id,x,y,type:'melee',visual:id,life:.4-t% .4,max:.4}];w.combat.draw();}if(labels.childElementCount<12)label(combat52.projectiles.entries[id].key,x,y+45);}
}
let accumulator=0;
function meleePage(dt){accumulator+=dt;let ticks=0;while(accumulator>=1/30&&ticks++<5){battle.update(1/30);w.combat.update(1/30,battle);accumulator-=1/30;}if(!battle.enemies.length||battle.hero.dead&&battle.units.every(u=>u.dead))newBattle();w.battle=battle;w.camera.scale=1.75;w.point=(x,y)=>({x:(x-500)*1.55+r.width*.5,y:(y-310)*1.55+r.height*.52});r.quad(null,null,0,r.height*.52-34,r.width,68,{mode:6,color:'#8a8065'});r.line({x:0,y:r.height*.52-35},{x:r.width,y:r.height*.52-35},2,'#c1b385',.5);for(const t of battle.towers)w.tower(t);for(const e of [...battle.units.filter(e=>!e.dead),...battle.enemies,...battle.corpses].sort((a,b)=>a.y-b.y))w.actor(e);for(const shot of battle.shots)w.combat.projectile(shot);for(const shot of battle.hostileShots)w.combat.hostile(shot);w.combat.draw();}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!paused&&!document.hidden)clock+=dt*(slow?.5:1);base();if(mode==='towers')towerPage();if(mode==='enemies')enemyPage();if(mode==='allies')allyPage();if(mode==='projectiles')projectilePage();if(mode==='melee')meleePage(paused?0:dt*(slow?.5:1));r.end();requestAnimationFrame(frame);}requestAnimationFrame(frame);
