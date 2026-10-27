import {clamp,lerp} from './math.js';
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function solveLeg(hip,knee,ankle,target,bend=1,origin=hip){
  const upper=distance(hip,knee),lower=distance(knee,ankle),dx=target[0]-origin[0],dy=target[1]-origin[1],d=clamp(Math.hypot(dx,dy),Math.abs(upper-lower)+.00001,upper+lower-.00001),angle=Math.atan2(dy,dx),offset=Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1));
  const posedKnee=[origin[0]+Math.cos(angle+bend*offset)*upper,origin[1]+Math.sin(angle+bend*offset)*upper],posedAnkle=[origin[0]+Math.cos(angle)*d,origin[1]+Math.sin(angle)*d];return{hip:origin,knee:posedKnee,ankle:posedAnkle};
}
export function advanceGait(e,rig,dt){
  const a=e.anim,step=Math.hypot(e.x-a.prevX,e.y-a.prevY),teleport=step>25;
  a.lastStep=teleport?0:step;a.walkDistance=(a.walkDistance||0)+a.lastStep;a.walkBlend=(a.walkBlend||0)+((a.moving?1:0)-(a.walkBlend||0))*Math.min(1,dt*14);
  a.runBlend=(a.runBlend||0)+((Math.hypot(a.vx,a.vy)>(rig?.runSpeed||44)?1:0)-(a.runBlend||0))*Math.min(1,dt*8);
  if(!rig?.legsByDirection||e.flying)return;const stride=lerp(rig.strideWalk,rig.strideRun,a.runBlend),duty=lerp(.62,.36,a.runBlend);a.prevGaitCycle=a.gaitCycle||0;a.gaitCycle=a.prevGaitCycle+a.lastStep/stride;
  if(teleport)a.legContacts=null;a.legContacts??=[{},{}];const speed=Math.hypot(a.vx,a.vy),forward=speed>1?[a.vx/speed,a.vy/speed]:a.walkForward||[1,0];a.walkForward=forward;
  for(let i=0;i<2;i++){const phase=(a.gaitCycle+i*.5)%1,foot=a.legContacts[i];if(phase<duty){if(!foot.planted){foot.x=e.x+forward[0]*stride*(duty/2-phase);foot.y=e.y+forward[1]*stride*(duty/2-phase);}foot.planted=true;}else foot.planted=false;foot.phase=phase;}
}
function transform(p,from,to,angle){const x=p[0]-from[0],y=p[1]-from[1],c=Math.cos(angle),s=Math.sin(angle);return[to[0]+x*c-y*s,to[1]+x*s+y*c];}
export function bipedPose(e,rig,height){
  const a=e.anim||{},direction=a.direction||'se',legs=rig.legsByDirection?.[direction];if(!legs||e.dead||!['idle','walk'].includes(a.state)||!(a.walkBlend>0))return null;
  const blend=a.walkBlend,run=a.runBlend||0,duty=lerp(.62,.36,run),stride=lerp(rig.strideWalk||13,rig.strideRun||23,run),alpha=rig.renderAlpha??1,cycle=a.gaitCycle!==undefined?lerp(a.prevGaitCycle??a.gaitCycle,a.gaitCycle,alpha):(a.walkDistance||0)/stride;
  const unit=height*256/(rig.nominalHeight||207),worldX=rig.worldPixelsX||1.3645,worldY=rig.worldPixelsY||1.2387,rootX=lerp(a.prevX??e.x,e.x,alpha),rootY=lerp(a.prevY??e.y,e.y,alpha),speed=Math.hypot(a.vx||0,a.vy||0)||1,forward=[(a.vx||0)/speed,(a.vy||0)/speed];
  const drop=(.026+Math.sin(cycle*Math.PI*4)*.004)*blend,posed=legs.map((leg,i)=>{
    const phase=((cycle+i*.5)%1+1)%1,contact=a.legContacts?.[i];let dx,dy,lift=0;
    if(phase<duty&&contact?.planted){dx=(contact.x-rootX)*worldX;dy=(contact.y-rootY)*worldY;}
    else{const t=phase<duty?phase/duty:(phase-duty)/(1-duty),step=phase<duty?stride*duty*(.5-t):stride*duty*(t-.5);dx=forward[0]*step*worldX;dy=forward[1]*step*worldY;if(phase>=duty)lift=Math.sin(t*Math.PI)*height*(run?.085:.052);}
    const target=[leg.ankle[0]+dx/unit*blend,leg.ankle[1]+(dy-lift)/unit*blend],hip=[leg.hip[0],leg.hip[1]+drop],p=solveLeg(leg.hip,leg.knee,leg.ankle,target,leg.bend,hip);
    const upper=Math.atan2(p.knee[1]-p.hip[1],p.knee[0]-p.hip[0])-Math.atan2(leg.knee[1]-leg.hip[1],leg.knee[0]-leg.hip[0]),lower=Math.atan2(p.ankle[1]-p.knee[1],p.ankle[0]-p.knee[0])-Math.atan2(leg.ankle[1]-leg.knee[1],leg.ankle[0]-leg.knee[0]);return{leg,p,upper,lower};
  });
  return{grid:rig.meshByDirection?.[direction],bones:posed,warp(u,v){
    const body=[0,drop*(.15+.85*smooth(.25,.645,v))];let x=0,y=0,total=0;
    for(const bone of posed){const {leg,p}=bone,center=lerp(leg.hip[0],leg.ankle[0],smooth(leg.hip[1],leg.ankle[1],v)),mask=smooth(leg.hip[1]-.02,leg.hip[1]+.035,v)*(1-smooth(leg.radius*.6,leg.radius,Math.abs(u-center)));
      if(mask<=0)continue;const point=[u,v],thigh=transform(point,leg.hip,p.hip,bone.upper),calf=transform(point,leg.knee,p.knee,bone.lower),shoe=[u+p.ankle[0]-leg.ankle[0],v+p.ankle[1]-leg.ankle[1]],kneeBlend=smooth(leg.knee[1]-.025,leg.knee[1]+.025,v),shoeBlend=smooth(leg.ankle[1]-.012,leg.ankle[1]+.01,v),px=lerp(lerp(thigh[0],calf[0],kneeBlend),shoe[0],shoeBlend),py=lerp(lerp(thigh[1],calf[1],kneeBlend),shoe[1],shoeBlend);x+=(px-u)*mask;y+=(py-v)*mask;total+=mask;
    }
    if(rig.exclusions?.some(([x0,y0,x1,y1])=>u>=x0&&u<=x1&&v>=y0&&v<=y1))total=0;
    const weight=Math.min(1,total);return[(total?x/total*weight:0)*unit,(total?y/total*weight+body[1]*(1-weight):body[1])*unit];
  }};
}
