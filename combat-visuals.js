import {clamp,lerp} from './math.js';

// Visual feedback uses simulation events. It never changes damage, collision or RNG.
export const projectileStyle=source=>{
  const type=source?.type??(source?.kind==='hero'?[3,0,1,2][source.heroIndex??0]:source?.kind==='illusion'?0:source?.kind==='golem'?1:3);
  const branch=source?.type!==undefined?source:source?.tower?.type===3?source.tower:null;return type*3+(branch?.level===4?1+(branch.spec||0):0);
};
export class CombatVisuals{
  constructor(world){this.w=world;this.effects=[];this.lastEvent=0;}
  reset(){this.effects=[];this.lastEvent=0;}
  update(dt,b){
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    for(const s of b.signals){if(s.id<=this.lastEvent)continue;this.lastEvent=s.id;
      if(s.type==='melee'&&!s.enemy)continue;
      if(['muzzle','contact','melee','guard','miss'].includes(s.type)&&this.effects.length<144){const life=s.type==='muzzle'?.12:s.large?.38:s.type==='guard'?.25:.28;this.effects.push({...s,life,max:life});}
    }
  }
  frame(id,phase=0){const meta=this.w.d.combat52.projectiles;return {img:this.w.a.get(meta.texture),rect:meta.entries[id].frames[Math.floor(phase)%2]};}
  projectile(s){
    const w=this.w,r=w.r,c=w.camera.scale,meta=w.d.combat52.projectiles.entries[s.visual??0];
    const raw=w.point(s.x,s.y),start=w.point(s.startX,s.startY),target=w.point(s.target.x,s.target.y);
    const progress=clamp(s.age/Math.max(.08,s.flightTime||.4),0,1),arc=s.kind==='rice'?Math.sin(progress*Math.PI)*(s.visual===7?54:40)*c:0;
    const lift=(s.target.flying?34:18)*c*progress,p={x:raw.x,y:raw.y-arc-lift};
    const dx=target.x-start.x,dy=target.y-start.y-(s.target.flying?34:18)*c,angle=Math.atan2(dy,dx);
    const color=meta.color,size=meta.size*c*1.08,tail=s.visual===2?30:15;
    r.line({x:p.x-Math.cos(angle)*tail*c,y:p.y-Math.sin(angle)*tail*c},p,(s.visual===2?3.5:2.5)*c,color,.4);
    const history=s.history||[];for(let i=1;i<Math.min(history.length,5);i+=2){const q=w.point(history[history.length-1-i].x,history[history.length-1-i].y);r.ellipse(q.x,q.y-arc-lift,(3-i*.3)*c,(3-i*.3)*c,color,.24/(i+1),3);}
    r.ellipse(p.x,p.y,size*.63,size*.63,color,.17,3);
    let rotation=s.kind==='star'?(s.visual===2?angle+Math.PI/4:s.age*(s.visual===1?5:9)):s.visual===8?angle:Math.sin(s.age*11)*.15;
    const frame=this.frame(s.visual||0,s.age*12);if(frame.img)r.quad(frame.img,frame.rect,p.x-size/2,p.y-size/2,size,size,{rotation});
  }
  hostile(s){const w=this.w,r=w.r,c=w.camera.scale,p=w.point(s.x,s.y),q=w.point(s.target.x,s.target.y-18),angle=Math.atan2(q.y-p.y,q.x-p.x);
    if(s.orb){const color=s.source.id===6?'#ffad63':s.source.id===20?'#a7baf8':'#df9ef1';r.line({x:p.x-Math.cos(angle)*16*c,y:p.y-Math.sin(angle)*16*c},p,7*c,color,.55);r.ellipse(p.x,p.y,10*c,10*c,color,.45,3);r.ellipse(p.x,p.y,4.5*c,4.5*c,'#fff0d1',.94,4);}
    else{const a={x:p.x-Math.cos(angle)*12*c,y:p.y-Math.sin(angle)*12*c};r.line(a,p,2.5*c,'#f3d6aa',1);for(const k of [-1,1])r.line(p,{x:p.x-Math.cos(angle+k*.5)*6*c,y:p.y-Math.sin(angle+k*.5)*6*c},2*c,'#e4e6df');}
  }
  draw(){const w=this.w,r=w.r,c=w.camera.scale;
    for(const e of this.effects){const p=w.point(e.x,e.y),t=1-e.life/e.max,alpha=1-t,meta=w.d.combat52.projectiles.entries[e.visual??0],color=meta.color;
      if(e.type==='muzzle'){r.ellipse(p.x,p.y,7*c*(1-t*.5),7*c*(1-t*.5),color,alpha*.6,4);continue;}
      if(e.type==='miss'){r.line({x:p.x-10*c,y:p.y-18*c},{x:p.x+10*c,y:p.y-13*c},2*c,'#c6bca5',alpha*.6);continue;}
      const y=p.y-(e.flying?32:18)*c;
      const atlas=w.d.combat52.contactVfx,img=atlas&&w.a.get(atlas.texture);
      if(img){
        const row=e.type==='guard'?3:e.type==='melee'||(e.visual??0)>=9?0:(e.visual??0)>=6?2:1;
        const entry=atlas.entries[row],index=w.weather===false?1:Math.min(5,Math.floor(t*6));
        const size=(e.large?52:row===0?40:row===2?43:row===3?36:31)*c;
        r.quad(img,entry.frames[index],p.x-size/2,y-size/2,size,size,{rotation:row===0?(e.angle||0):0,flip:e.flip||false,alpha:w.weather===false?alpha:.96,color:e.enemy?'#f4c5ac':'#ffffff'});
        continue;
      }
      if(e.type==='melee'||e.type==='guard'){
        if(e.enemy){for(let j=0;j<3;j++){const a=(e.angle||0)+j*.42-.6;r.line({x:p.x-Math.cos(a)*11*c,y:y-Math.sin(a)*7*c},{x:p.x+Math.cos(a)*12*c,y:y+Math.sin(a)*8*c},2.5*c,'#e6b4a1',Math.sin(t*Math.PI)*.8);}continue;}const f=this.frame(e.visual??9,t*2),size=(e.type==='guard'?37:46)*c*(.8+t*.3);
        if(f.img)r.quad(f.img,f.rect,p.x-size/2,y-size/2,size,size,{rotation:e.angle||0,flip:e.flip||false,alpha:Math.sin(t*Math.PI)*.87});
      }else{
        const radius=(e.large?23:12)*c;r.ellipse(p.x,y,radius*(.3+t),radius*(.18+t*.55),color,alpha*.72,2);
        for(let j=0;j<5;j++){const a=j*Math.PI*.4+(e.id||0),length=(5+t*14)*c,center={x:p.x+Math.cos(a)*length*.4,y:y+Math.sin(a)*length*.4};r.line(center,{x:p.x+Math.cos(a)*length,y:y+Math.sin(a)*length},(2-t)*c,color,alpha*.8);}
        r.ellipse(p.x,y,6*c,6*c,'#fff1c6',alpha*.7,4);
      }
    }
  }
}
