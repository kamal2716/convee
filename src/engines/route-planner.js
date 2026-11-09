const {formatInfo,extensions}=require('../formats/registry');
const {detectEngines}=require('./engine-manager');
const {engineRoutes}=require('./routes');
function categoriesFor(ext,primary){const extra=[];if(['csv','tsv'].includes(ext))extra.push('spreadsheets','gis');return[primary,...extra]}
function planConversion(from,to,status=detectEngines()){
 const source=formatInfo(from),target=formatInfo(to);
 if(!source||!target)return{available:false,engine:null,reason:'This format is not in the Convee format catalogue.'};
 const fromCategories=categoriesFor(String(from).toLowerCase(),source.category),toCategories=categoriesFor(String(to).toLowerCase(),target.category);
 const candidates=engineRoutes.filter(r=>r.from.some(x=>fromCategories.includes(x))&&r.to.some(x=>toCategories.includes(x))&&r.extensions(from,to));
 const supports=(route)=> {
  if(route.engine==='sharp')return Boolean(status.sharp?.readable?.[from]&&status.sharp?.writable?.[to]);
  if(route.engine==='imagemagick')return Boolean(status.imagemagick?.available&&status.imagemagick.readable?.[from]&&status.imagemagick.writable?.[to]);
  return true;
 };
 for(const route of candidates){if(status[route.engine]?.available&&supports(route))return{available:true,engine:route.engine,route:route.id,reason:null}}
 const usable=candidates.find(route=>supports(route));
 const needed=usable?.engine||candidates[0]?.engine||null;
 return{available:false,engine:needed,reason:needed?'Install or enable '+needed+' to use this conversion route.':'No conversion adapter is configured for this format pair.'};
}
function recommendation(from,to){
 const source=String(from||'').toLowerCase(),target=String(to||'').toLowerCase();
 const preferred={jpg:['webp','avif','png'],jpeg:['webp','avif','png'],png:['webp','avif','jpg'],tiff:['webp','jpg','png'],bmp:['png','webp'],docx:['pdf','odt'],doc:['pdf','docx'],odt:['pdf','docx'],xlsx:['pdf','csv','ods'],xls:['xlsx','pdf','csv'],pptx:['pdf','odp'],ppt:['pptx','pdf'],mp4:['webm','mkv'],mov:['mp4','webm'],wav:['flac','mp3'],aiff:['flac','mp3'],flac:['mp3','wav'],srt:['vtt'],csv:['json','xlsx'],json:['csv','yaml'],xml:['json','yaml']};
 const rank=(preferred[source]||[]).indexOf(target);
 return rank===0?{recommended:true,reason:'Best general-purpose choice'}:rank>0?{recommended:false,reason:null}:{recommended:false,reason:null};
}
function listFormats(from){return extensions.filter(to=>to!==String(from||'').toLowerCase()).map(to=>{const plan=planConversion(from,to);return{ext:to,label:to.toUpperCase(),ready:plan.available,engine:plan.engine,note:plan.reason,...recommendation(from,to)}}).filter(x=>x.ready||x.engine).sort((a,b)=>Number(b.ready)-Number(a.ready)||Number(b.recommended)-Number(a.recommended)||a.ext.localeCompare(b.ext))}
module.exports={planConversion,listFormats};
