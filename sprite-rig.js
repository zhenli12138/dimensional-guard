import {clamp} from './math.js';
import {bipedPose} from './biped-ik.js';
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

export function actorPose(e,height,time,rig={}){
  const a=e.anim||{},moving=(a.walkBlend||0)>.005&&!e.dead,phase=((a.walkDistance||0)-(a.lastStep||0)*(1-(rig.renderAlpha??1)))/(rig.stride||25),theta=phase*Math.PI*2,aim=a.heading??0,forward=[Math.cos(aim),Math.sin(aim)];
  const hit=clamp((a.impactLife||0)/.19,0,1),attack=a.state==='attack'&&a.left>0&&!a.windup,progress=attack?clamp(a.time/Math.max(.1,a.duration),0,1):0,lunge=attack?Math.sin(Math.PI*clamp((progress-.12)/.65,0,1))*.052:0;
  const recoil=hit*hit*.045,offsetX=(a.impactX||0)*recoil*height,offsetY=(a.impactY||0)*recoil*height,flight=e.flying&&!e.dead,bob=flight?Math.sin(time*3.1+(e.uid||0))*.035*height:0;
  const skeletal=bipedPose(e,rig,height),stride=(rig.stridePixels||height*.6)/height,speed=Math.hypot(a.vx||0,a.vy||0)||1,walkForward=[(a.vx||Math.cos(aim))/speed,(a.vy||0)/speed*.9078];
  const foot=delta=>{const p=((phase+delta)%1+1)%1;if(p<.6)return{step:(.3-p)*stride,lift:0};const t=(p-.6)/.4;return{step:(t-.5)*.6*stride,lift:Math.sin(t*Math.PI)*.055};},feet=[foot(0),foot(.5)],wing=Math.sin(time*6.5+(e.uid||0));
  const warp=(u,v)=>{
    let x=0,y=0;const bottom=smooth(.63,.9,v),side=u<.5?0:1;
    if(skeletal){const d=skeletal.warp(u,v);x+=d[0]/height;y+=d[1]/height;}
    else if(moving&&!flight){const leg=feet[side],blend=a.walkBlend||0;x+=leg.step*bottom*walkForward[0]*blend;y+=(leg.step*bottom*walkForward[1]-leg.lift*bottom)*blend;}
    if(moving&&!flight){const arm=smooth(.14,.38,Math.abs(u-.5))*(1-smooth(.64,.74,v))*smooth(.22,.48,v);x-=Math.sin(theta+(side?Math.PI:0))*.022*arm*(a.walkBlend||0);}
    if(flight&&rig.kind!=='float'){const wings=smooth(.15,.42,Math.abs(u-.5))*(1-smooth(.64,.83,v));x+=(u-.5)*wing*.06*wings;y+=wing*.075*wings;}
    if(flight&&rig.kind==='float'){x+=Math.sin(time*2.7+v*3)*.018*bottom;y+=Math.sin(time*3+u*6)*.025*bottom;}
    if(attack){const upper=1-smooth(.58,.88,v),arms=smooth(.13,.37,Math.abs(u-.5))*upper*smooth(.22,.45,v),swing=Math.sin(progress*Math.PI*2-.8);x+=(arms*swing*.06+lunge*upper)*forward[0];y+=(arms*swing*.045+lunge*upper)*forward[1];}
    return[x*height,y*height];
  };
  return{offsetX,offsetY:offsetY-bob,warp,grid:skeletal?.grid,phase,flight,bones:skeletal?.bones};
}
