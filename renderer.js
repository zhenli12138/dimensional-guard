import {hex,clamp} from './math.js';
const VERT=`#version 300 es
precision highp float;
in vec2 a_position;in vec2 a_uv;in vec4 a_color;in float a_mode;in float a_texture;
uniform vec2 u_resolution;out vec2 v_uv;out vec4 v_color;flat out int v_mode;flat out int v_texture;
void main(){vec2 p=a_position/u_resolution*2.0-1.0;gl_Position=vec4(p.x,-p.y,0,1);v_uv=a_uv;v_color=a_color;v_mode=int(a_mode+.5);v_texture=int(a_texture+.5);}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 v_uv;in vec4 v_color;flat in int v_mode;flat in int v_texture;
uniform sampler2D u_tex0;uniform sampler2D u_tex1;uniform sampler2D u_tex2;uniform sampler2D u_tex3;uniform sampler2D u_tex4;uniform sampler2D u_tex5;uniform sampler2D u_tex6;uniform sampler2D u_tex7;
out vec4 outColor;
vec4 atlas(){if(v_texture==0)return texture(u_tex0,v_uv);if(v_texture==1)return texture(u_tex1,v_uv);if(v_texture==2)return texture(u_tex2,v_uv);if(v_texture==3)return texture(u_tex3,v_uv);if(v_texture==4)return texture(u_tex4,v_uv);if(v_texture==5)return texture(u_tex5,v_uv);if(v_texture==6)return texture(u_tex6,v_uv);return texture(u_tex7,v_uv);}
void main(){vec4 c;vec2 p=v_uv*2.0-1.0;float d=length(p);float aa=max(fwidth(d),.012);
if(v_mode==0){c=atlas();if(c.a<.055)discard;c.rgb*=v_color.rgb*v_color.a;c.a*=v_color.a;}
else{float a=1.0;if(v_mode==1)a=1.0-smoothstep(1.0-aa,1.0+aa,d);
else if(v_mode==2)a=(1.0-smoothstep(.04,.04+aa,abs(d-.89)));
else if(v_mode==3)a=exp(-d*d*4.5)*(1.0-smoothstep(.75,1.0,d));
else if(v_mode==4){float r=abs(p.x)+abs(p.y);a=1.0-smoothstep(.48,.52,r);a=max(a,exp(-d*7.0)*.4);}
else if(v_mode==5){float r=abs(p.y);a=exp(-r*r*12.0)*(1.0-smoothstep(.8,1.0,abs(p.x)));}
c=vec4(v_color.rgb*v_color.a*a,v_color.a*a);}outColor=c;}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
export class Renderer{
  constructor(canvas,forcedCanvas=false){this.canvas=canvas;this.commands=[];this.textures=new Map();this.backend='Canvas 2D';this.drawCalls=0;this.quality=1;this.lost=false;this.width=1;this.height=1;
    if(forcedCanvas==='webgpu')return;
    if(!forcedCanvas){try{this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});if(this.gl){this.initGL();this.backend='WebGL 2';}}catch(e){console.warn('WebGL 初始化失败',e);}}
    if(!this.gl){this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('浏览器未提供绘图环境，请启用硬件加速。');}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.onLost?.();});canvas.addEventListener('webglcontextrestored',()=>{this.textures.clear();this.initGL();this.lost=false;this.onRestored?.();});
  }
  initGL(){const gl=this.gl;this.prog=program(gl,VERT,FRAG);this.buffer=gl.createBuffer();this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);this.data=new Float32Array(4096*6*10);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);const names=[['a_position',2],['a_uv',2],['a_color',4],['a_mode',1],['a_texture',1]];let off=0;for(const [name,size] of names){const a=gl.getAttribLocation(this.prog,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,off*4);off+=size;}gl.useProgram(this.prog);this.resolution=gl.getUniformLocation(this.prog,'u_resolution');for(let i=0;i<8;i++)gl.uniform1i(gl.getUniformLocation(this.prog,'u_tex'+i),i);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);this.count=0;this.slots=[];this.slotIds=new Map();}
  resize(w,h){this.width=w;this.height=h;const ratio=Math.min(devicePixelRatio||1,this.quality===0?1:1.75);const pw=Math.round(w*ratio),ph=Math.round(h*ratio);if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}this.ratio=ratio;}
  texture(img){if(this.textures.has(img))return this.textures.get(img);const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.textures.set(img,t);return t;}
  invalidate(img){if(this.gl&&this.textures.has(img)){this.gl.deleteTexture(this.textures.get(img));this.textures.delete(img);}}
  begin(color='#182722'){this.drawCalls=0;this.commands.length=0;if(this.lost)return;if(this.gl){const gl=this.gl,c=hex(color);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(c[0],c[1],c[2],1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.prog);gl.bindVertexArray(this.vao);gl.uniform2f(this.resolution,this.width,this.height);this.count=0;this.slots=[];this.slotIds.clear();}else{const c=this.ctx;c.setTransform(this.ratio,0,0,this.ratio,0,0);c.fillStyle=color;c.fillRect(0,0,this.width,this.height);}}
  quad(img,rect,x,y,w,h,{color='#ffffff',alpha=1,flip=false,rotation=0,mode=0}={}){if(this.lost||alpha<=0||w<=0||h<=0)return;const c=hex(color);c[3]=alpha;
    if(!this.gl&&!this.gpu){this.canvasQuad(img,rect,x,y,w,h,c,flip,rotation,mode);return;}
    if(this.count>=4095)this.flush();let id=0;if(mode===0){if(!img)return;if(!this.slotIds.has(img)){if(this.slots.length>=8)this.flush();id=this.slots.length;this.slots.push(img);this.slotIds.set(img,id);}else id=this.slotIds.get(img);}
    const r=rect||[0,0,img?.width||1,img?.height||1],iw=img?.width||1,ih=img?.height||1;let u0=r[0]/iw,u1=(r[0]+r[2])/iw,v0=r[1]/ih,v1=(r[1]+r[3])/ih;if(flip)[u0,u1]=[u1,u0];const cx=x+w/2,cy=y+h/2,co=Math.cos(rotation),si=Math.sin(rotation),a=this.data;let n=this.count*60;
    for(const [px,py,u,v] of [[x,y,u0,v0],[x+w,y,u1,v0],[x,y+h,u0,v1],[x,y+h,u0,v1],[x+w,y,u1,v0],[x+w,y+h,u1,v1]]){const dx=px-cx,dy=py-cy;a[n++]=cx+dx*co-dy*si;a[n++]=cy+dx*si+dy*co;a[n++]=u;a[n++]=v;a[n++]=c[0];a[n++]=c[1];a[n++]=c[2];a[n++]=alpha;a[n++]=mode;a[n++]=id;}this.count++;
  }
  canvasQuad(img,rect,x,y,w,h,c,flip,rotation,mode){const ctx=this.ctx;ctx.save();ctx.globalAlpha=c[3];ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation);if(flip)ctx.scale(-1,1);if(!mode){if(img){const r=rect||[0,0,img.width,img.height];ctx.drawImage(img,...r,-w/2,-h/2,w,h);}}else{const color=`rgb(${c.slice(0,3).map(v=>Math.round(v*255)).join(',')})`;ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,Math.min(w,h)*.04);if(mode===3||mode===5){const g=ctx.createRadialGradient(0,0,0,0,0,Math.max(w,h)/2);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(-w/2,-h/2,w,h);}else if(mode===4){ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(w*.16,-h*.12);ctx.lineTo(w/2,0);ctx.lineTo(w*.12,h*.16);ctx.lineTo(0,h/2);ctx.lineTo(-w*.12,h*.16);ctx.lineTo(-w/2,0);ctx.lineTo(-w*.16,-h*.12);ctx.closePath();ctx.fill();}else if(mode===6){ctx.fillRect(-w/2,-h/2,w,h);}else{ctx.beginPath();ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);if(mode===2)ctx.stroke();else ctx.fill();}}ctx.restore();this.drawCalls++;}
  flush(){if(!this.gl||!this.count||this.lost)return;const gl=this.gl;for(let i=0;i<this.slots.length;i++){gl.activeTexture(gl.TEXTURE0+i);const texture=this.texture(this.slots[i]);gl.bindTexture(gl.TEXTURE_2D,texture);}gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,this.count*60));gl.drawArrays(gl.TRIANGLES,0,this.count*6);this.drawCalls++;this.count=0;this.slots=[];this.slotIds.clear();}
  end(){this.flush();}
  ellipse(x,y,rx,ry,color,alpha=1,mode=1){this.quad(null,null,x-rx,y-ry,rx*2,ry*2,{mode,color,alpha});}
  line(a,b,width,color,alpha=1){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);this.quad(null,null,(a.x+b.x-len)/2,(a.y+b.y-width)/2,len,width,{mode:5,color,alpha,rotation:Math.atan2(dy,dx)});}
  meshFrame(img,frame,x,y,scale,{warp,grid,flip=false,alpha=1,color='#ffffff'}={}){
    if(!img||alpha<=0)return [x,y,0,0];const [rx,ry,w,h]=frame.rect,ss=frame.sourceSize||[w,h],an=frame.anchor||[.5,.9],off=frame.offset||[0,0],xs=grid?.x||[0,.25,.5,.75,1],ys=grid?.y||[0,1/6,2/6,.5,4/6,5/6,1],cols=xs.length-1,rows=ys.length-1,tint=hex(color),nodes=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const tx=xs[i],ty=ys[j],u=(off[0]+w*tx)/ss[0],v=(off[1]+h*ty)/ss[1],d=warp?.(flip?1-u:u,v)||[0,0];nodes.push({x:x+(u-an[0])*ss[0]*scale*(flip?-1:1)+d[0],y:y+(v-an[1])*ss[1]*scale+d[1],u:(rx+w*tx)/img.width,v:(ry+h*ty)/img.height,sx:rx+w*tx,sy:ry+h*ty});}
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const n=j*(cols+1)+i,points=[nodes[n],nodes[n+1],nodes[n+cols+1],nodes[n+cols+1],nodes[n+1],nodes[n+cols+2]];
      if(!this.gl&&!this.gpu){for(let k=0;k<6;k+=3){const [a,b,c]=points.slice(k,k+3),den=a.sx*(b.sy-c.sy)+b.sx*(c.sy-a.sy)+c.sx*(a.sy-b.sy);if(Math.abs(den)<.0001)continue;const solve=key=>[(a[key]*(b.sy-c.sy)+b[key]*(c.sy-a.sy)+c[key]*(a.sy-b.sy))/den,(a[key]*(c.sx-b.sx)+b[key]*(a.sx-c.sx)+c[key]*(b.sx-a.sx))/den,(a[key]*(b.sx*c.sy-c.sx*b.sy)+b[key]*(c.sx*a.sy-a.sx*c.sy)+c[key]*(a.sx*b.sy-b.sx*a.sy))/den],ax=solve('x'),ay=solve('y'),ctx=this.ctx;ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();ctx.transform(ax[0],ay[0],ax[1],ay[1],ax[2],ay[2]);ctx.drawImage(img,0,0);ctx.restore();this.drawCalls++;}continue;}
      if(this.count>=4095)this.flush();if(!this.slotIds.has(img)){if(this.slots.length>=8)this.flush();this.slotIds.set(img,this.slots.length);this.slots.push(img);}const id=this.slotIds.get(img);let k=this.count*60;for(const p of points){this.data[k++]=p.x;this.data[k++]=p.y;this.data[k++]=p.u;this.data[k++]=p.v;this.data[k++]=tint[0];this.data[k++]=tint[1];this.data[k++]=tint[2];this.data[k++]=alpha;this.data[k++]=0;this.data[k++]=id;}this.count++;
    }
    const bx=nodes.map(v=>v.x),by=nodes.map(v=>v.y),left=Math.min(...bx),top=Math.min(...by);return[left,top,Math.max(...bx)-left,Math.max(...by)-top];
  }
  frame(img,frame,x,y,scale=1,opts={}){const [,,w,h]=frame.rect,ss=frame.sourceSize||[w,h],an=frame.anchor||[.5,.9],off=frame.offset||[0,0];let dx=(off[0]-ss[0]*an[0])*scale;if(opts.flip)dx=-dx-w*scale;this.quad(img,frame.rect,x+dx,y+(off[1]-ss[1]*an[1])*scale,w*scale,h*scale,opts);return [x+dx,y+(off[1]-ss[1]*an[1])*scale,w*scale,h*scale];}
}
