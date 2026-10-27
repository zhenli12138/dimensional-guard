(function(root){
'use strict';
const P=root.TD.Progress;
const online=/^https?:$/.test(location.protocol)&&location.pathname.startsWith('/game/');
const offlineKey='dimensional-guard-v1';
const apiBase=online?new URL('api/',location.href):null;
let player=null,revision=0,csrf='',current=P.defaults(),dirty=false,sequence=0,inflight=null,timer=null,conflict=null,initialized=false,backupOK=true;
let state=online?'loading':'local',error='',updatedAt='',listener=()=>{};
let writer;
try{writer=sessionStorage.getItem('dimensional-guard-tab');if(!writer){writer=crypto.randomUUID();sessionStorage.setItem('dimensional-guard-tab',writer);}}catch{writer=Date.now()+'-'+Math.random();}
const clone=p=>P.validate(p);
const cacheKey=()=>player?'dimensional-guard-online-v1:'+player.id:null;
function snapshot(){return {online,player,revision,state,error,updatedAt,dirty,backupOK,serverProfile:conflict?clone(conflict.profile):null};}
function emit(){listener(snapshot());}
function setState(next,message=''){state=next;error=message;emit();}
function backup(){
  try{
    if(online&&!dirty){let previous=null;try{previous=JSON.parse(localStorage.getItem(cacheKey())||'null');}catch{}if(previous?.dirty&&previous.writer!==writer){backupOK=true;return;}}
    localStorage.setItem(online?cacheKey():offlineKey,JSON.stringify(online?{profile:current,revision,dirty,writer}:current));backupOK=true;
  }
  catch{backupOK=false;}
}
async function request(route,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(new URL(route,apiBase),{credentials:'same-origin',cache:'no-store',...options,headers:{'X-Game-Request':'1',...options.headers},signal:controller.signal});
    const data=await response.json().catch(()=>({message:'服务器响应格式不正确。'}));
    if(!response.ok)throw Object.assign(Error(data.message||'服务器暂时无法连接。'),{status:response.status,data});
    return data;
  }catch(e){if(e.name==='AbortError')throw Error('连接超时，请稍后重试。');throw e;}
  finally{clearTimeout(timeout);}
}
async function init(){
  if(!online){
    try{const saved=localStorage.getItem(offlineKey);if(saved)current=clone(JSON.parse(saved));}
    catch{error='旧存档无法读取，可在设置中导入备份。';}
    initialized=true;setState('local',error);return clone(current);
  }
  setState('loading');
  const session=await request('session');
  // 再读取一次，确认浏览器接受身份 Cookie 后才允许进入在线存档。
  const checked=await request('profile');
  if(checked.player.id!==session.player.id)throw Error('访客身份发生变化，请刷新页面。');
  player=checked.player;revision=checked.revision;csrf=checked.csrf;updatedAt=checked.updatedAt;current=clone(checked.profile);dirty=false;
  let saved=null;
  try{const raw=localStorage.getItem(cacheKey());if(raw)saved=JSON.parse(raw);}catch{backupOK=false;}
  if(saved?.dirty){
    try{
      current=clone(saved.profile);dirty=true;sequence++;
      if(saved.revision===revision){setState('pending','发现本机尚未同步的进度，正在恢复。');}
      else{conflict=checked;setState('conflict','本机备份与服务器版本不同，请选择要保留的进度。');}
    }catch{current=clone(checked.profile);dirty=false;setState('saved','本机备份无效，已读取服务器存档。');}
  }else setState('saved');
  initialized=true;backup();emit();if(dirty&&!conflict)schedule();return clone(current);
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>flush(),450);}
function save(profile){
  current=clone(profile);sequence++;
  if(!online){backup();setState('local',backupOK?'':'浏览器未允许保存，请导出存档。');return;}
  if(!initialized)return;
  dirty=true;backup();
  if(conflict||state==='expired'){emit();return;}
  setState('pending');schedule();
}
function flush(options={}){
  clearTimeout(timer);
  if(!online||!initialized||!dirty||conflict||state==='expired')return Promise.resolve();
  if(inflight)return inflight;
  const sentSequence=sequence,sent=clone(current),baseRevision=revision;
  setState('syncing');
  inflight=request('profile',{method:'PUT',keepalive:!!options.keepalive,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({profile:sent,revision:baseRevision})})
    .then(data=>{
      if(data.player.id!==player.id)throw Error('服务器返回了不同的访客身份，请导出进度后刷新。');
      revision=data.revision;updatedAt=data.updatedAt;dirty=sequence!==sentSequence;backup();setState(dirty?'pending':'saved');
    })
    .catch(e=>{
      if(e.status===409){conflict=e.data;setState('conflict',e.message);}
      else if(e.status===401||e.data?.code==='CSRF_REJECTED')setState('expired',e.message);
      else setState('error',e.message);
      backup();emit();
    })
    .finally(()=>{inflight=null;if(dirty&&state==='pending')schedule();else if(dirty&&state==='error')timer=setTimeout(()=>flush(),15000);});
  return inflight;
}
async function resolveConflict(choice){
  if(!conflict)return clone(current);
  const latest=await request('profile');
  if(latest.player.id!==player.id)throw Error('访客身份发生变化，请先导出进度。');
  revision=latest.revision;csrf=latest.csrf;updatedAt=latest.updatedAt;
  if(choice==='server'){current=clone(latest.profile);dirty=false;conflict=null;sequence++;backup();setState('saved');}
  else if(choice==='local'){conflict=null;dirty=true;sequence++;backup();setState('pending');await flush();}
  else throw Error('请选择要保留的进度。');
  return clone(current);
}
async function retry(){if(conflict||state==='expired')return;if(dirty)return flush();if(online){const data=await request('profile');if(data.revision!==revision){conflict=data;dirty=true;backup();setState('conflict','服务器已有更新，请选择要保留的进度。');}else setState('saved');}}
root.TD.Cloud={online,init,save,flush,retry,resolveConflict,snapshot,subscribe(fn){listener=fn;emit();}};
window.addEventListener('online',()=>{if(initialized&&dirty&&!conflict&&state!=='expired')flush();});
window.addEventListener('pagehide',()=>{if(!initialized)return;backup();flush({keepalive:true});});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&initialized){backup();flush({keepalive:true});}});
})(globalThis);
