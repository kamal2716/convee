const {formatInfo,extensions}=require('../formats/registry');
const {detectEngines,engineForCategory}=require('./engine-manager');
const {engineRoutes}=require('./routes');
function categoriesFor(ext,primary){const extra=[];if(['csv','tsv'].includes(ext))extra.push('spreadsheets');return[primary,...extra]}
function planConversion(from,to,status=detectEngines()){
 const source=formatInfo(from),target=formatInfo(to);
 if(!source||!target)return{available:false,engine:null,reason:'This format is not in the Convee format catalogue.'};
 const fromCategories=categoriesFor(String(from).toLowerCase(),source.category),toCategories=categoriesFor(String(to).toLowerCase(),target.category);
 const candidates=engineRoutes.filter(r=>r.from.some(x=>fromCategories.includes(x))&&r.to.some(x=>toCategories.includes(x))&&r.extensions(from,to));
 for(const route of candidates){if(status[route.engine]?.available)return{available:true,engine:route.engine,route:route.id,reason:null}}
 const needed=candidates[0]?.engine||engineForCategory(target.category,status);
 return{available:false,engine:needed,reason:needed?'Install or enable '+needed+' to use this conversion route.':'No conversion adapter is configured for this format pair.'};
}
function listFormats(from){return extensions.filter(to=>to!==String(from||'').toLowerCase()).map(to=>{const plan=planConversion(from,to);return{ext:to,label:to.toUpperCase(),ready:plan.available,engine:plan.engine,note:plan.reason}}).filter(x=>x.ready||x.engine)}
module.exports={planConversion,listFormats};
