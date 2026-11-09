const {spawnSync}=require('node:child_process');
const path=require('node:path');
const sharp=require('sharp');
const {probe}=require('./image-magick');
const definitions={
 sharp:{commands:[],categories:['images'],builtin:true},
 data:{commands:[],categories:['data'],builtin:true},
 text:{commands:[],categories:['documents'],builtin:true},
 ffmpeg:{commands:['ffmpeg','ffprobe'],categories:['video','audio','subtitles'],bundled:()=>require('ffmpeg-static')},
 libreoffice:{commands:['soffice','libreoffice'],categories:['documents','spreadsheets','presentations']},
 pandoc:{commands:['pandoc'],categories:['documents']},
 calibre:{commands:['ebook-convert'],categories:['documents']},
 hwp5odt:{commands:['hwp5odt'],categories:['documents']},
 imagemagick:{commands:['magick','convert'],categories:['images']},
 ghostscript:{commands:['gswin64c','gswin32c','gs'],categories:['documents']},
 sevenZip:{commands:['7z','7zz'],categories:['archives'],bundled:()=>require('7zip-bin').path7za},
 unrar:{commands:['unrar'],categories:['archives']},
 gdal:{commands:['ogr2ogr'],categories:['gis']},
 assimp:{commands:['assimp'],categories:['models3d']},
 blender:{commands:['blender'],categories:['models3d']},
 oda:{commands:['ODAFileConverter'],categories:['cad']},
 fontforge:{commands:['fontforge'],categories:['fonts']},
 inkscape:{commands:['inkscape'],categories:['images','cad']}
};
function locate(command){if(!command)return null;const windows=process.platform==='win32';const result=spawnSync(windows?'where':'which',[command],{encoding:'utf8',stdio:['ignore','pipe','ignore']});return result.status===0?(result.stdout||'').split(/\r?\n/)[0].trim():null}
function detectEngines(){
 const status={};
 for(const [key,def] of Object.entries(definitions)){
  if(def.builtin){status[key]={available:true,command:'built-in'};continue}
  let bundled=null;try{bundled=def.bundled?.()||null}catch{}
  const found=def.commands.map(command=>({command,path:locate(command)})).find(x=>x.path);
  const command=bundled||found?.path||null;
  status[key]={available:Boolean(command),command,source:bundled?'bundled':found?'system':null};
  if(key==='imagemagick'&&command){
   const details=probe(command);
   Object.assign(status[key],details,{command,source:bundled?'bundled':found?'system':null});
  }
 }
 return status;
}
function engineForCategory(category,status){return Object.entries(definitions).filter(([,d])=>d.categories.includes(category)).map(([key])=>key).find(key=>status[key]?.available)||null}
module.exports={definitions,detectEngines,engineForCategory};
