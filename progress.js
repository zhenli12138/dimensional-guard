(function(root){'use strict';
const D=root.TD||{costs:[1,1,1,1,2]};
const heroXP=[0,150,400,750,1200,1800,2600,3600,4800,6200];
const heroPoints=[1,2,3,4,5,7,9,11,13,15];
function heroLevel(xp){let level=1;for(let i=0;i<heroXP.length;i++)if(xp>=heroXP[i])level=i+1;return level;}
function heroBudget(xp){return heroPoints[heroLevel(xp)-1];}
function defaultHero(xp=0){const skills=[0,0,0,0,0],order=[4,0,1,2,3];for(let i=0;i<heroBudget(xp);i++)skills[order[i%5]]++;return {xp,skills};}
function migrateHeroes(best){const xp=Math.min(6200,best.reduce((a,b)=>a+b,0)*180);return Array.from({length:4},()=>defaultHero(xp));}
const defaults=()=>({version:1,best:Array(12).fill(0),ranks:Array(6).fill(0),hero:0,difficulty:1,sound:true,music:true,motion:true,heroProgress:Array.from({length:4},()=>defaultHero())});
function validate(s){
 if(!s||s.version!==1||!Array.isArray(s.best)||s.best.length!==12||!Array.isArray(s.ranks)||s.ranks.length!==6||!s.best.every(n=>Number.isInteger(n)&&n>=0&&n<=3)||!s.ranks.every(n=>Number.isInteger(n)&&n>=0&&n<=5)||!Number.isInteger(s.hero)||s.hero<0||s.hero>3||!Number.isInteger(s.difficulty)||s.difficulty<0||s.difficulty>2)throw Error('存档格式不正确，请选择本游戏导出的 JSON 存档。');
 for(const key of ['sound','music','motion'])if(s[key]!==undefined&&typeof s[key]!=='boolean')throw Error('存档中的音效与显示设置格式不正确。');
 const result={...defaults(),version:1,best:s.best.slice(),ranks:s.ranks.slice(),hero:s.hero,difficulty:s.difficulty};
 for(const key of ['sound','music','motion'])if(s[key]!==undefined)result[key]=s[key];
 if(spent(result)>total(result))throw Error('存档中的升级点数超过已获得星星。');
 if(s.heroProgress===undefined)result.heroProgress=migrateHeroes(s.best);
 else{
  if(!Array.isArray(s.heroProgress)||s.heroProgress.length!==4)throw Error('英雄成长资料必须包含四位英雄。');
  result.heroProgress=s.heroProgress.map(h=>{
   if(!h||!Number.isInteger(h.xp)||h.xp<0||h.xp>6200||!Array.isArray(h.skills)||h.skills.length!==5||!h.skills.every(n=>Number.isInteger(n)&&n>=0&&n<=3))throw Error('英雄经验或技能等级格式不正确。');
   if(h.skills.reduce((a,b)=>a+b,0)>heroBudget(h.xp))throw Error('英雄已分配技能点超过当前等级可用点数。');
   return {xp:h.xp,skills:h.skills.slice()};
  });
 }
 return result;
}
function total(s){return s.best.reduce((a,b)=>a+b,0);}function spent(s){return s.ranks.reduce((a,n)=>a+D.costs.slice(0,n).reduce((x,y)=>x+y,0),0);}function available(s){return total(s)-spent(s);}function unlocked(s){const n=s.best.findIndex(v=>v===0);return n===-1?12:n+1;}
function reward(s,level,stars){if(!Number.isInteger(level)||level<0||level>11||!Number.isInteger(stars)||stars<1||stars>3)throw Error('无效的关卡结算。');const old=s.best[level];s.best[level]=Math.max(old,stars);return s.best[level]-old;}
function buy(s,branch){const n=s.ranks[branch];if(n===undefined||n>=5||available(s)<D.costs[n])return false;s.ranks[branch]++;return true;}
D.Progress={defaults,validate,total,spent,available,unlocked,reward,buy,heroLevel,heroBudget,defaultHero,heroXP,heroPoints};
if(typeof module!=='undefined'&&module.exports)module.exports=D.Progress;
})(globalThis);
