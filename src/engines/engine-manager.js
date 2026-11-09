const {spawnSync}=require('node:child_process');
const definitions={
 sharp:{commands:[''],categories:['images'],builtin:true},
 data:{commands:[''],categories:['data'],builtin:true},
 text:{commands:[''],categories:['documents'],builtin:true},
 ffmpeg:{commands:['ffmpeg','ffprobe'],categories:['video','audio','subtitles']},
 libreoffice:{commands:['soffice','libreoffice'],categories:['documents','spreadsheets','presentations']},
 pandoc:{commands:['pandoc'],categories:['documents']},
 calibre:{commands:['ebook-convert'],categories:['documents']},
 imagemagick:{commands:['magick','convert'],categories:['images']},
 ghostscript:{commands:['gswin64c','gswin32c','gs'],categories:['documents']},
 sevenZip:{commands:['7z','7zz'],categories:['archives']},
 unrar:{commands:['unrar'],categories:['archives']},
 gdal:{commands:['ogr2ogr','gdalinfo'],categories:['gis']},
 assimp:{commands:['assimp'],categories:['models3d']},
 blender:{commands:['blender'],categories:['models3d']},
 oda:{commands:['ODAFileConverter'],categories:['cad']},
 fontforge:{commands:['fontforge'],categories:['fonts']},
 inkscape:{commands:['inkscape'],categories:['images','cad']},

};
function locate(command){const windows=process.platform==='win32';const result=spawnSync(windows?'where':'which',[command],{encoding:'utf8',stdio:['ignore','pipe','ignore']});return result.status===0?(result.stdout||'').split(/\r?\n/)[0].trim():null}
function detectEngines(){const status={};for(const [key,def] of Object.entries(definitions)){status[key]=def.builtin?{available:true,command:'built-in'}:(def.commands.map(locate).find(Boolean)?{available:true,command:def.commands.find(c=>locate(c))}:{available:false,command:null})}return status}
function engineForCategory(category,status){return Object.entries(definitions).filter(([,d])=>d.categories.includes(category)).map(([key])=>key).find(key=>status[key]?.available)||null}
module.exports={definitions,detectEngines,engineForCategory};
