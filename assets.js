export const assetURL=p=>p.replace('res://','');
export class Assets{
  constructor(progress=()=>{}){this.images=new Map();this.jobs=new Map();this.progress=progress;this.done=0;}
  async json(name){const r=await fetch(`data/${name}.json`);if(!r.ok)throw Error(`数据加载失败：${name}`);return r.json();}
  async image(path){path=assetURL(path);if(this.images.has(path))return this.images.get(path);if(this.jobs.has(path))return this.jobs.get(path);const job=new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>{this.images.set(path,img);this.progress(++this.done);resolve(img);};img.onerror=()=>reject(Error(`图片加载失败：${path}`));img.src=path+'?v=5.4.0';});this.jobs.set(path,job);return job;}
  get(path){return this.images.get(assetURL(path));}
  async loadTree(tree){const paths=new Set();function visit(v){if(typeof v==='string'&&/^res:\/\/.*\.(png|webp|jpg)$/.test(v))paths.add(v);else if(v&&typeof v==='object')Object.values(v).forEach(visit);}visit(tree);const list=[...paths];let index=0;await Promise.all(Array.from({length:Math.min(4,list.length)},async()=>{while(index<list.length)await this.image(list[index++]);}));}
  frameCanvas(texture,frame){const img=this.get(texture),[x,y,w,h]=frame.rect,c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);c.getContext('2d').drawImage(img,x,y,w,h,0,0,w,h);return c;}
}
