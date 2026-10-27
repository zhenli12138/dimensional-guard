import {clamp,lerp} from './math.js';
import {actorClip,actionDuration,frameAt,actorHeight} from './animation.js';
export function drawActor(w,e){
 const r=w.r,c=w.camera.scale,a=e.anim||{},entry=w.spriteEntry(e);if(!entry)return;
 const p=w.point(a.moving&&!e.dead?lerp(a.prevX,e.x,w.alpha??1):e.x,a.moving&&!e.dead?lerp(a.prevY,e.y,w.alpha??1):e.y),hero=e.kind==='hero',height=actorHeight(e)*c,state=e.dead?'death':a.state||'idle',selected=actorClip(entry,state,a.direction||'se'),clip=selected.clip;if(!clip?.frames?.length)return;
 const phase=(e.uid||0)*.381966,time=Math.max(0,a.time||0);let idx;
 if(state==='walk'&&!e.flying&&(entry.locomotion||entry.motion)){const travelled=(a.walkDistance||0)-(a.lastStep||0)*(1-(w.alpha??1)),stride=entry.locomotion?.stride||entry.motion.stride||29;idx=Math.floor((Math.max(0,travelled)/stride+phase)*clip.frames.length)%clip.frames.length;}
 else idx=clip.loop?Math.floor((state==='walk'?w.battle.time+phase:time)*(clip.fps||7))%clip.frames.length:frameAt(clip,time,actionDuration(clip,a,state));
 const f=selected.frame||clip.frames[idx],flip=selected.flip??a.facing<0;let alpha=e.dead?clamp(e.life/Math.min(.7,e.max),0,1):e.ability==='cloak'&&e.age%10<2?.25:e.kind==='illusion'?.55:1;if(!e.kind&&!e.dead)alpha*=clamp((e.age||0)/.28,0,1);
 const motion=w.weather!==false,lift=e.flying?18*c*(e.dead?clamp(e.life/e.max,0,1):1):0,hit=motion?clamp((a.impactLife||0)/.17,0,1):0,x=p.x+(a.impactX||0)*hit*hit*height*.026,y=p.y+(a.impactY||0)*hit*hit*height*.018-lift-(motion&&e.flying&&!e.dead?Math.sin(w.battle.time*2.6+phase)*c:0);
 r.ellipse(p.x,p.y+2*c,height*.24,height*(e.flying?.06:.07),'#142326',alpha*(e.flying?.18:.28));if(e.shield>0)r.ellipse(x,y-height*.38,height*.38,height*.47,'#aecfde',.1+(a.shieldHit||0)*.22,2);
 const frame={sourceSize:clip.sourceSize||entry.frameSize,anchor:clip.anchor||entry.anchor,...f},scale=height/(clip.nominalHeight||entry.nominalHeight||frame.sourceSize[1]),bounds=r.frame(w.a.get(clip.texture),frame,x,y,scale,{flip,alpha,color:a.hit>.085?[1.16,1.12,1.07,1]:'#ffffff'});
 if(w.baselineVisible)r.line({x:p.x-25*c,y:p.y},{x:p.x+25*c,y:p.y},1.3*c,'#d7c393',.9);
 if(!e.dead){w.hits.push({e,bounds,depth:e.y});if(e.hp<e.maxHp||w.selected===e||hero){const width=(e.boss?70:hero?37:25)*c,bx=p.x-width/2,by=p.y-height-lift-5*c;r.quad(null,null,bx-1,by-1,width+2,5*c,{mode:6,color:'#131e22',alpha:.88});r.quad(null,null,bx,by,width*clamp(e.hp/e.maxHp,0,1),3*c,{mode:6,color:e.kind?'#9fc779':e.boss?'#db8b79':'#d3b27d'});}}
}
