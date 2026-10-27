import {Renderer} from './renderer.js';
const shader=`
struct Uniforms { resolution:vec2f, padding:vec2f }
@group(0) @binding(0) var<uniform> uniforms:Uniforms;
@group(0) @binding(1) var linearSampler:sampler;
@group(0) @binding(2) var tex0:texture_2d<f32>;
@group(0) @binding(3) var tex1:texture_2d<f32>;
@group(0) @binding(4) var tex2:texture_2d<f32>;
@group(0) @binding(5) var tex3:texture_2d<f32>;
@group(0) @binding(6) var tex4:texture_2d<f32>;
@group(0) @binding(7) var tex5:texture_2d<f32>;
@group(0) @binding(8) var tex6:texture_2d<f32>;
@group(0) @binding(9) var tex7:texture_2d<f32>;
struct Output { @builtin(position) position:vec4f, @location(0) uv:vec2f, @location(1) color:vec4f, @location(2) @interpolate(flat) mode:u32, @location(3) @interpolate(flat) textureId:u32 }
@vertex fn vertex(@location(0) position:vec2f,@location(1) uv:vec2f,@location(2) color:vec4f,@location(3) mode:f32,@location(4) textureId:f32)->Output {
var out:Output;let p=position/uniforms.resolution*2.0-1.0;out.position=vec4f(p.x,-p.y,0.0,1.0);out.uv=uv;out.color=color;out.mode=u32(mode+.5);out.textureId=u32(textureId+.5);return out;
}
fn atlas(i:u32,uv:vec2f)->vec4f {switch i {case 0u:{return textureSampleLevel(tex0,linearSampler,uv,0.0);}case 1u:{return textureSampleLevel(tex1,linearSampler,uv,0.0);}case 2u:{return textureSampleLevel(tex2,linearSampler,uv,0.0);}case 3u:{return textureSampleLevel(tex3,linearSampler,uv,0.0);}case 4u:{return textureSampleLevel(tex4,linearSampler,uv,0.0);}case 5u:{return textureSampleLevel(tex5,linearSampler,uv,0.0);}case 6u:{return textureSampleLevel(tex6,linearSampler,uv,0.0);}default:{return textureSampleLevel(tex7,linearSampler,uv,0.0);}}}
@fragment fn fragment(v:Output)->@location(0) vec4f {
let p=v.uv*2.0-1.0;let d=length(p);let aa=max(fwidth(d),.012);if(v.mode==0u){let tex=atlas(v.textureId,v.uv);if(tex.a<.055){discard;}return vec4f(tex.rgb*v.color.rgb*tex.a*v.color.a,tex.a*v.color.a);}
var alpha=1.0;if(v.mode==1u){alpha=1.0-smoothstep(1.0-aa,1.0+aa,d);}else if(v.mode==2u){alpha=1.0-smoothstep(.04,.04+aa,abs(d-.89));}else if(v.mode==3u){alpha=exp(-d*d*4.5)*(1.0-smoothstep(.75,1.0,d));}else if(v.mode==4u){alpha=max(1.0-smoothstep(.48,.52,abs(p.x)+abs(p.y)),exp(-d*7.0)*.4);}else if(v.mode==5u){alpha=exp(-p.y*p.y*12.0)*(1.0-smoothstep(.8,1.0,abs(p.x)));}
return vec4f(v.color.rgb*v.color.a*alpha,v.color.a*alpha);
}`;
export class WebGPURenderer extends Renderer{
  constructor(canvas){super(canvas,'webgpu');}
  async init(){if(!navigator.gpu||!isSecureContext)throw Error('WebGPU 需要受支持的浏览器和 HTTPS / 本机环境。');const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('未找到 WebGPU 设备');this.device=await adapter.requestDevice();const d=this.device;this.context=this.canvas.getContext('webgpu');if(!this.context)throw Error('无法创建 WebGPU 画布');this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:d,format:this.format,alphaMode:'opaque'});this.gpu=true;this.backend='WebGPU';this.data=new Float32Array(4096*60);this.count=0;this.slots=[];this.slotIds=new Map();this.batches=[];
    this.uniform=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.vertexBuffer=d.createBuffer({size:4*1024*1024,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});this.capacity=4*1024*1024;this.sampler=d.createSampler({magFilter:'linear',minFilter:'linear'});const module=d.createShaderModule({code:shader});const info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));this.pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex',buffers:[{arrayStride:40,attributes:[{shaderLocation:0,format:'float32x2',offset:0},{shaderLocation:1,format:'float32x2',offset:8},{shaderLocation:2,format:'float32x4',offset:16},{shaderLocation:3,format:'float32',offset:32},{shaderLocation:4,format:'float32',offset:36}]}]},fragment:{module,entryPoint:'fragment',targets:[{format:this.format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
    this.white=document.createElement('canvas');this.white.width=1;this.white.height=1;this.white.getContext('2d').fillRect(0,0,1,1);d.lost.then(()=>{this.lost=true;this.onLost?.();});return this;}
  texture(img){if(this.textures.has(img))return this.textures.get(img);const texture=this.device.createTexture({size:[img.width,img.height,1],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});this.device.queue.copyExternalImageToTexture({source:img},{texture,premultipliedAlpha:false},[img.width,img.height]);const entry={texture,view:texture.createView()};this.textures.set(img,entry);return entry;}
  invalidate(img){const entry=this.textures.get(img);if(entry){entry.texture.destroy();this.textures.delete(img);}}
  begin(){this.drawCalls=0;this.count=0;this.slots=[];this.slotIds.clear();this.batches=[];}
  flush(){if(!this.count||this.lost)return;this.batches.push({data:this.data.slice(0,this.count*60),images:this.slots.slice(),vertices:this.count*6});this.count=0;this.slots=[];this.slotIds.clear();}
  end(){this.flush();if(this.lost)return;const d=this.device,total=this.batches.reduce((n,b)=>n+b.data.length,0);if(total*4>this.capacity){this.vertexBuffer.destroy();this.capacity=Math.ceil(total*4/1048576)*1048576;this.vertexBuffer=d.createBuffer({size:this.capacity,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});}const data=new Float32Array(total);let offset=0;for(const b of this.batches){data.set(b.data,offset);b.offset=offset/10;offset+=b.data.length;}if(total)d.queue.writeBuffer(this.vertexBuffer,0,data);d.queue.writeBuffer(this.uniform,0,new Float32Array([this.width,this.height,0,0]));const encoder=d.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:.07,g:.12,b:.13,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.pipeline);pass.setVertexBuffer(0,this.vertexBuffer);for(const b of this.batches){const entries=[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:this.sampler}];for(let i=0;i<8;i++)entries.push({binding:i+2,resource:this.texture(b.images[i]||this.white).view});const group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries});pass.setBindGroup(0,group);pass.draw(b.vertices,1,b.offset);this.drawCalls++;}pass.end();d.queue.submit([encoder.finish()]);}
}
export async function makeRenderer(canvas,mode='webgl'){
  if(mode==='webgpu'){try{return await new WebGPURenderer(canvas).init();}catch(error){console.warn('WebGPU 未启用，回退 WebGL 2：',error.message);if(canvas.getContext('webgpu')){const next=canvas.cloneNode();canvas.replaceWith(next);canvas=next;}}}
  return new Renderer(canvas,mode==='canvas');
}
