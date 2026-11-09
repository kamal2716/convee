const {formatInfo,extensions}=require('../formats/registry');
const {detectEngines,engineForCategory}=require('./engine-manager');
const {engineRoutes}=require('./routes');
function planConversion(from,to,status=detectEngines()){
 const source=formatInfo(from),target=formatInfo(to);
 if(!source||!target)return{available:false,engine:null,reason:'This format is not in the Convee format catalogue.'};
 const candidates=engineRoutes.filter(r=>r.from.includes(source.category)&&r.to.includes(target.category)&&r.extensions(from,to));
 for(const route of candidates){if(status[route.engine]?.available)return{available:true,engine:route.engine,route:route.id,reason:null}}
 const needed=candidates[0]?.engine||engineForCategory(target.category,status);
 return{available:false,engine:needed,reason:needed?'Install or enable '+needed+' to use this conversion route.':'No conversion adapter is configured for this format pair.'};
}
function listFormats(from){return extensions.filter(to=>to!==String(from||'').toLowerCase()).map(to=>{const plan=planConversion(from,to);return{ext:to,label:to.toUpperCase(),ready:plan.available,engine:plan.engine,note:plan.reason}}).filter(x=>x.ready||x.engine)}
module.exports={planConversion,listFormats};
