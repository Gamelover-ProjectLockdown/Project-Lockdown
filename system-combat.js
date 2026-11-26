/* System-test-only balance. Arrays: penetration, normal, blunt. */
(function(root){
'use strict';
const ammo={standard:[0,15,5],tracer:[0,15,5],nine:[0,30,10],rifle556:[30,45,10],rifle762:[20,60,20],government:[5,110,45],shot:[0,3,1],buckshot:[2,10,3]};
const bonuses={pistol9:[0,0,0],governmentRevolver:[0,0,0],pistol:[0,0,0],revolver:[0,0,0],heavyRevolver:[0,0,0],smg:[0,2,1],assaultRifle:[30,-25,2],lmg:[30,-25,3],battleRifle:[10,20,10],pumpShotgun:[0,8,4],shotgun:[0,0,0]};
const compatibleAmmo={pistol9:['nine'],governmentRevolver:['government'],pistol:['standard','tracer','shot'],revolver:['standard','tracer','shot'],heavyRevolver:['rifle762'],smg:['standard','tracer','shot'],assaultRifle:['rifle556'],lmg:['rifle556'],battleRifle:['rifle762'],pumpShotgun:['buckshot'],shotgun:['buckshot']};
// body/head = innate defense, toughness; armor = defense, durability.
const profiles={
 researcher:{hp:100,body:[0,0],head:[0,0],limit:15,recovery:8,delay:1},
 guard:{hp:125,body:[5,5],head:[2,3],limit:25,recovery:12,delay:.8,vest:[15,100]},
 soldier:{hp:150,body:[8,10],head:[4,6],limit:35,recovery:18,delay:.7,vest:[35,180],helmet:[12,100]},
 riot:{hp:200,body:[10,15],head:[5,8],limit:50,recovery:20,delay:.8,vest:[60,300],helmet:[18,180]},
 enhanced:{hp:500,body:[20,15],head:[25,20],limit:80,recovery:15,delay:1.2,vest:[20,150]},
 incompleteSuper:{hp:500,body:[22,32],head:[30,40],limit:100,recovery:24,delay:.85},
 superSoldier:{hp:1000,body:[38,55],head:[55,70],limit:180,recovery:38,delay:.65},
 player:{hp:1000,body:[30,40],head:[40,30],limit:160,recovery:45,delay:.7,
  shortStun:.35,longStun:1,immunity:.8,vest:[35,220],helmet:[30,140]},
 dummy:{hp:1000,body:[0,0],head:[0,0],limit:15,recovery:8,delay:1}
};
const tuning={shortStun:.6,longStun:2,immunity:.5,headImpact:1.5,armDamage:.65};
const part=(v)=>Math.max(0,Number.isFinite(v)?v:0);
function payload(id,weapon='',pellets=1){const a=ammo[id]||ammo.standard,b=bonuses[weapon]||[0,0,0];return a.map((x,i)=>x+b[i]/Math.max(1,pellets));}
function resolve(values,defense,toughness,region='body',options=null){
 const [p,n,b]=values.map(part),d=part(defense),t=part(toughness);
 const penetration=p*(d>=p*2?.5:1);
 const normal=n<=d*.5?0:n<=d*2?n*.5:n;
 const blunt=b<t*.5?0:b<=t?b*.5:b;
 const multiplier=region==='head'?(options?.headMultiplier??(p>=d?4:2)):region==='arm'?tuning.armDamage:1;
 const rawDamage=(penetration+normal+blunt)*multiplier;
 // A real hit always leaves at least one point of physical damage even when
 // armor/innate defense fully absorbs its normal damage. Impact may still be 0.
 const damage=p+n+b>0?Math.max(1,rawDamage):0;
 return {penetration,normal,blunt,multiplier,damage,
 impact:blunt*(region==='head'?tuning.headImpact:1),armorWear:p+n*.5,defense:d,toughness:t,region};
}
function armor(spec){return spec?{defense:spec[0],max:spec[1],hp:spec[1]}:null;}
function create(id='researcher',equipped=true){const p=profiles[id]||profiles.researcher;return {id,profile:p,vest:equipped?armor(p.vest):null,helmet:equipped?armor(p.helmet):null,impact:0,lastImpact:-Infinity,updatedAt:0,disabledUntil:0,immuneUntil:0,last:null};}
function recover(state,now){const start=Math.max(state.updatedAt,state.lastImpact+state.profile.delay);state.impact=Math.max(0,state.impact-state.profile.recovery*Math.max(0,now-start));state.updatedAt=now;}
function hit(state,values,region,now,options=null){
 recover(state,now);
 const p=state.profile,stats=region==='head'?p.head:p.body;
 const gear=region==='head'?state.helmet:region==='body'?state.vest:null;
 const defense=stats[0]+(gear?gear.defense*(gear.hp>0?1:.5):0);
 const result=resolve(values,defense,stats[1],region,options);
 result.armorBefore=gear?gear.hp:null;
 if(gear)gear.hp=Math.max(0,gear.hp-result.armorWear);
 result.armorAfter=gear?gear.hp:null;result.stun=0;
 if(result.impact>0&&now>=state.immuneUntil){
   state.lastImpact=now;state.impact+=result.impact;
   if(state.impact>=p.limit){
     result.stun=result.impact>=p.limit*2?(p.longStun??tuning.longStun):(p.shortStun??tuning.shortStun);
     state.disabledUntil=Math.max(state.disabledUntil,now+result.stun);
     state.immuneUntil=state.disabledUntil+(p.immunity??tuning.immunity);state.impact=0;
   }
 }
 result.accumulated=state.impact;state.last=result;return result;
}
const api={ammo,bonuses,compatibleAmmo,profiles,tuning,payload,resolve,create,hit,recover,armor};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SystemCombat=api;
})(globalThis);
