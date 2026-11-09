const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {promisify}=require('node:util');const {execFile}=require('node:child_process');const run=promisify(execFile);
const {planConversion}=require('./route-planner');
const {detectEngines}=require('./engine-manager');
const {convertStructured}=require('./data-converters');
const imageExt=new Set('jpg jpeg png webp avif tiff bmp gif'.split(' '));
const videoExt=new Set('mp4 mov mkv webm avi wmv flv mpeg mpg m4v 3gp ogv vob ts mts m2ts'.split(' '));
const audioExt=new Set('mp3 wav aac ogg opus flac m4a wma aiff aif ape alac amr ac3 eac3 dts caf au'.split(' '));
const archiveExt=new Set('zip 7z rar tar gz bz2 xz zst lz lzma cab iso arj lzh'.split(' '));
async function convertWithEngine({input,format,output,quality=88,mediaPreset='balanced'}){
 const from=path.extname(input).slice(1).toLowerCase(),to=format.toLowerCase(),status=detectEngines(),plan=planConversion(from,to,status);
 if(!plan.available)throw new Error(plan.reason||'No compatible conversion engine is installed.');
 const dir=path.dirname(output);await fs.mkdir(dir,{recursive:true});
 const timeout=15*60*1000;
 if(plan.engine==='data')return convertStructured({input,output,from,to});
 if(plan.engine==='text'){
  let value=await fs.readFile(input,'utf8');
  if(['txt','md'].includes(to)&&['html','htm'].includes(from))value=value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
  else if(['html','htm'].includes(to))value='<!doctype html><meta charset="utf-8"><pre>'+value.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))+'</pre>';
  await fs.writeFile(output,value,'utf8');return{output,engine:'Convee text adapters'};
 }
 if(plan.engine==='imagemagick'){await run('magick',[input,output],{timeout});return{output,engine:'ImageMagick'}}
 if(plan.engine==='ffmpeg'){
  const args=['-nostdin','-y','-i',input,'-map_metadata','0'];
  if(videoExt.has(to)){const q=mediaPreset==='small'?'30':mediaPreset==='high'?'18':'23';args.push('-c:v','libx264','-crf',q,'-preset',mediaPreset==='high'?'slow':'medium','-c:a','aac')}
  else if(audioExt.has(to)){args.push('-vn');if(to==='mp3')args.push('-c:a','libmp3lame','-q:a','2');else if(to==='aac'||to==='m4a')args.push('-c:a','aac','-b:a','192k');else if(to==='opus')args.push('-c:a','libopus','-b:a','160k')}
  else if(to==='srt'||to==='ass'||to==='vtt')args.push('-map','0:s:0');
  args.push(output);await run(status.ffmpeg.command,args,{timeout,maxBuffer:16*1024*1024});return{output,engine:'FFmpeg'}
 }
 if(plan.engine==='libreoffice'){const bin=status.libreoffice.command;await run(bin,['--headless','--convert-to',to,'--outdir',dir,input],{timeout});const generated=path.join(dir,path.basename(input,path.extname(input))+'.'+to);if(generated!==output)await fs.rename(generated,output);return{output,engine:'LibreOffice'}}
 if(plan.engine==='pandoc'){await run('pandoc',[input,'-o',output],{timeout});return{output,engine:'Pandoc'}}
 if(plan.engine==='calibre'){await run('ebook-convert',[input,output],{timeout});return{output,engine:'Calibre'}}
 if(plan.engine==='sevenZip'){
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'convee-archive-'));
  try{await run(status.sevenZip.command,['x',input,'-o'+temp,'-y'],{timeout});await run(status.sevenZip.command,['a','-t'+(to==='gz'?'gzip':to==='bz2'?'bzip2':to),output,'.'],{cwd:temp,timeout});return{output,engine:'7-Zip'}}finally{await fs.rm(temp,{recursive:true,force:true})}
 }
 if(plan.engine==='gdal'){
  const drivers={shp:'ESRI Shapefile',geojson:'GeoJSON',kml:'KML',kmz:'LIBKML',gpkg:'GPKG',gpx:'GPX',csv:'CSV'};
  const driver=drivers[to];if(!driver)throw new Error('GDAL output driver is not mapped for .'+to);
  await run('ogr2ogr',['-f',driver,output,input],{timeout});return{output,engine:'GDAL'}
 }
 if(plan.engine==='assimp'){await run('assimp',['export',input,output],{timeout});return{output,engine:'Assimp'}}
 if(plan.engine==='blender'){const script="import bpy,sys\nsrc=sys.argv[-2]; dst=sys.argv[-1]\nbpy.ops.wm.open_mainfile(filepath=src)\next=dst.rsplit('.',1)[-1].lower()\nif ext=='obj': bpy.ops.wm.obj_export(filepath=dst)\nelif ext=='stl': bpy.ops.wm.stl_export(filepath=dst)\nelif ext in ('gltf','glb'): bpy.ops.export_scene.gltf(filepath=dst)\n";const tmp=path.join(os.tmpdir(),'convee-blender-export.py');await fs.writeFile(tmp,script);try{await run('blender',['-b','--python',tmp,'--',input,output],{timeout})}finally{await fs.rm(tmp,{force:true})}return{output,engine:'Blender'}}
 if(plan.engine==='oda'){
  if(!['dwg','dxf'].includes(from)||!['dwg','dxf'].includes(to))throw new Error('ODA adapter supports DWG and DXF pairs only.');
  const inputDir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-cad-in-')),outputDir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-cad-out-'));
  try{await fs.copyFile(input,path.join(inputDir,path.basename(input)));await run(status.oda.command,[inputDir,outputDir,'ACAD2018',to.toUpperCase(),'0','1'],{timeout});const files=await fs.readdir(outputDir);const generated=files.find(f=>path.extname(f).toLowerCase()==='.'+to);if(!generated)throw new Error('ODA did not produce a .'+to+' file. Check source compatibility and ODA version.');await fs.copyFile(path.join(outputDir,generated),output);return{output,engine:'ODA File Converter'}}finally{await fs.rm(inputDir,{recursive:true,force:true});await fs.rm(outputDir,{recursive:true,force:true})}
 }
 if(plan.engine==='fontforge'){
  const supported=new Set(['ttf','otf','woff','woff2','pfa','pfb','sfd']);
  if(!supported.has(from)||!supported.has(to))throw new Error('FontForge adapter supports TTF, OTF, WOFF, WOFF2, PFA, PFB and SFD only.');
  await run(status.fontforge.command,['-lang=ff','-c','Open($1); Generate($2)',input,output],{timeout});return{output,engine:'FontForge'};
 }
 throw new Error('The selected engine route has no execution adapter yet.');
}
module.exports={convertWithEngine};
