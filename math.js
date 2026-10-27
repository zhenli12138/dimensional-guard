export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const lerp=(a,b,t)=>a+(b-a)*t;
export const hex=s=>{if(Array.isArray(s))return s; const n=parseInt(s.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1];};
export function rng(seed=1){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
export class SpatialGrid{
  constructor(size=48){this.size=size;this.cells=new Map();}
  build(items){this.cells.clear();for(const e of items){if(e.dead)continue;const k=`${Math.floor(e.x/this.size)},${Math.floor(e.y/this.size)}`;let a=this.cells.get(k);if(!a)this.cells.set(k,a=[]);a.push(e);}return this;}
  near(x,y,r){const out=[],s=this.size;for(let j=Math.floor((y-r)/s);j<=Math.floor((y+r)/s);j++)for(let i=Math.floor((x-r)/s);i<=Math.floor((x+r)/s);i++){const a=this.cells.get(`${i},${j}`);if(a)for(const e of a)if((e.x-x)**2+(e.y-y)**2<r*r)out.push(e);}return out;}
}
// A continuous road surface, not a list of one-dimensional lanes. The grid is
// only the navigation accelerator; final motion is clipped to capsule geometry.
export class RoadSurface{
  constructor(paths,half=23){this.paths=paths;this.half=half;this.cell=8;this.cols=126;this.rows=79;this.segmentCells=new Map();this.segments=[];paths.forEach((r,index)=>r.seg.forEach(s=>{const item={s,index};this.segments.push(item);for(let y=Math.floor((Math.min(s.a[1],s.b[1])-40)/64);y<=Math.floor((Math.max(s.a[1],s.b[1])+40)/64);y++)for(let x=Math.floor((Math.min(s.a[0],s.b[0])-40)/64);x<=Math.floor((Math.max(s.a[0],s.b[0])+40)/64);x++){const k=`${x},${y}`;if(!this.segmentCells.has(k))this.segmentCells.set(k,[]);this.segmentCells.get(k).push(item);}}));this.mask=new Uint8Array(this.cols*this.rows);for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const n=this.nearest({x:x*8,y:y*8},null,true);this.mask[y*this.cols+x]=n.distance<=(n.radius||half)-5;}}
  nearest(p,pathOnly=null,localOnly=false){let best={distance:Infinity};let candidates=this.segmentCells.get(`${Math.floor(p.x/64)},${Math.floor(p.y/64)}`)||[];if(!localOnly&&(!candidates.length||pathOnly!==null&&!candidates.some(v=>v.index===pathOnly)))candidates=this.segments;for(const {s,index} of candidates){if(pathOnly!==null&&index!==pathOnly)continue;const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],t=clamp(((p.x-s.a[0])*dx+(p.y-s.a[1])*dy)/(s.len*s.len),0,1);const x=s.a[0]+dx*t,y=s.a[1]+dy*t,d=Math.hypot(p.x-x,p.y-y);if(d<best.distance)best={x,y,distance:d,path:index,s:s.start+s.len*t,radius:s.radius||this.half,nx:-dy/s.len,ny:dx/s.len};}return best;}
  project(p,margin=4){const n=this.nearest(p),r=Math.max(1,n.radius-margin);if(n.distance<=r)return {...n,x:p.x,y:p.y,distance:0};const f=r/Math.max(.001,n.distance);return {...n,x:n.x+(p.x-n.x)*f,y:n.y+(p.y-n.y)*f,distance:n.distance-r};}
  visible(a,b){const d=distance(a,b),n=Math.ceil(d/4);for(let i=0;i<=n;i++){const p=this.nearest({x:lerp(a.x,b.x,i/Math.max(1,n)),y:lerp(a.y,b.y,i/Math.max(1,n))});if(p.distance>p.radius-4)return false;}return true;}
  node(p){let best=-1,dist=Infinity;const cx=Math.round(p.x/8),cy=Math.round(p.y/8);for(let j=-4;j<=4;j++)for(let i=-4;i<=4;i++){const x=cx+i,y=cy+j,k=y*this.cols+x;if(x<0||y<0||x>=this.cols||y>=this.rows||!this.mask[k])continue;const d=(p.x-x*8)**2+(p.y-y*8)**2;if(d<dist){dist=d;best=k;}}return best;}
  path(a,b){a=this.project(a);b=this.project(b);if(this.visible(a,b))return [b];const start=this.node(a),end=this.node(b);if(start<0||end<0)return [];const n=this.mask.length,score=new Float32Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),heap=[];score[start]=0;
    const heuristic=k=>Math.hypot(k%this.cols-end%this.cols,Math.floor(k/this.cols)-Math.floor(end/this.cols));
    const push=(k,f)=>{let i=heap.length;heap.push([k,f]);while(i){let p=(i-1)>>1;if(heap[p][1]<=f)break;heap[i]=heap[p];i=p;}heap[i]=[k,f];};
    const pop=()=>{const v=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][1]<heap[j][1])j++;if(heap[j][1]>=last[1])break;heap[i]=heap[j];i=j;}heap[i]=last;}return v[0];};
    push(start,heuristic(start));let found=false;
    while(heap.length){const k=pop();if(closed[k])continue;if(k===end){found=true;break;}closed[k]=1;const x=k%this.cols,y=Math.floor(k/this.cols);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy,j=yy*this.cols+xx;if(xx<0||yy<0||xx>=this.cols||yy>=this.rows||!this.mask[j]||closed[j])continue;if(dx&&dy&&(!this.mask[y*this.cols+xx]||!this.mask[yy*this.cols+x]))continue;const g=score[k]+(dx&&dy?1.414:1);if(g<score[j]){score[j]=g;parent[j]=k;push(j,g+heuristic(j));}}}
    if(!found)return [];const route=[b];for(let k=end;k!==start;k=parent[k]){if(k<0)return [];route.push({x:(k%this.cols)*8,y:Math.floor(k/this.cols)*8});}route.reverse();const smooth=[];let from=a;for(let i=0;i<route.length;){let j=route.length-1;while(j>i&&!this.visible(from,route[j]))j--;smooth.push(route[j]);from=route[j];i=j+1;}return smooth;
  }
  move(e,target,dt){if(!target)return true;const changed=!e.navGoal||distance(e.navGoal,target)>12; if(changed||!e.nav||!e.nav.length){e.navGoal={...target};e.nav=this.path(e,target);}if(!e.nav.length)return false;let left=e.speed*dt;while(left>0&&e.nav.length){const p=e.nav[0],d=distance(e,p);if(d<=left){e.x=p.x;e.y=p.y;e.nav.shift();left-=d;}else{e.x+=(p.x-e.x)/d*left;e.y+=(p.y-e.y)/d*left;left=0;}}const p=this.project(e);e.x=p.x;e.y=p.y;return distance(e,target)<5;}
}
