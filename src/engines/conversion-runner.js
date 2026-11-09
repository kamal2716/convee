const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {promisify}=require('node:util');const {execFile}=require('node:child_process');const run=promisify(execFile);
const {planConversion}=require('./route-planner');
const {detectEngines}=require('./engine-manager');
const {convertStructured}=require('./data-converters');
const {marked}=require('marked');
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
  if(['html','htm'].includes(to)&&from==='md')value='<!doctype html><meta charset="utf-8">'+marked.parse(value);
  else if(['txt','md'].includes(to)&&['html','htm'].includes(from))value=value.replace(new RegExp('<script[^>]*>[\\s\\S]*?</script>','gi'),'').replace(new RegExp('<style[^>]*>[\\s\\S]*?</style>','gi'),'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
  else if(['html','htm'].includes(to))value='<!doctype html><meta charset="utf-8"><pre>'+value.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))+'</pre>';
  await fs.writeFile(output,value,'utf8');return{output,engine:'Convee text adapters'};
 }
 if(plan.engine==='imagemagick'){await run(status.imagemagick.command,[input,output],{timeout});return{output,engine:'ImageMagick'}}
 if(plan.engine==='ffmpeg'){
  const args=['-nostdin','-y','-i',input,'-map_metadata','0'];
  if(plan.route==='video-transcode'){
   const q=mediaPreset==='small'?'30':mediaPreset==='high'?'18':'23';
   const codecs={
    mp4:['libx264','aac'],mov:['libx264','aac'],mkv:['libx264','aac'],m4v:['libx264','aac'],
    webm:['libvpx-vp9','libopus'],avi:['mpeg4','libmp3lame'],wmv:['wmv2','wmav2'],
    flv:['flv','libmp3lame'],mpeg:['mpeg2video','mp2'],mpg:['mpeg2video','mp2'],
    '3gp':['h263','aac'],ogv:['libtheora','libvorbis'],vob:['mpeg2video','ac3'],ts:['mpeg2video','mp2'],mts:['mpeg2video','mp2'],m2ts:['mpeg2video','mp2']
   };
   const pair=codecs[to];if(!pair)throw new Error('FFmpeg video output .'+to+' is not mapped yet.');
   args.push('-c:v',pair[0],'-c:a',pair[1]);
   if(['libx264','libvpx-vp9','mpeg4'].includes(pair[0]))args.push('-crf',q);
   if(pair[0]==='libx264')args.push('-preset',mediaPreset==='high'?'slow':'medium');
  }else if(plan.route==='audio-transcode'){
   const codecs={mp3:['libmp3lame','-q:a','2'],wav:['pcm_s16le'],aac:['aac','-b:a','192k'],ogg:['libvorbis','-q:a','5'],opus:['libopus','-b:a','160k'],flac:['flac'],m4a:['aac','-b:a','192k'],wma:['wmav2','-b:a','192k'],aiff:['pcm_s16be'],aif:['pcm_s16be'],alac:['alac'],caf:['pcm_s16le'],au:['pcm_mulaw'],ac3:['ac3','-b:a','192k'],eac3:['eac3','-b:a','256k']};
   const pair=codecs[to];if(!pair)throw new Error('FFmpeg audio output .'+to+' is not mapped yet.');
   args.push('-vn','-c:a',pair[0],...pair.slice(1));
  }else if(plan.route==='subtitle-transcode'){
   const codecs={srt:'srt',ass:'ass',ssa:'ass',vtt:'webvtt'};
   args.push('-map','0:s:0','-c:s',codecs[to]);
  }
  args.push(output);await run(status.ffmpeg.command,args,{timeout,maxBuffer:16*1024*1024});
  return{output,engine:'FFmpeg'};

 }
 if(plan.engine==='libreoffice'){const bin=status.libreoffice.command,temp=await fs.mkdtemp(path.join(os.tmpdir(),'convee-office-'));try{await run(bin,['--headless','--convert-to',to,'--outdir',temp,input],{timeout});const generated=path.join(temp,path.basename(input,path.extname(input))+'.'+to);await fs.access(generated);await fs.copyFile(generated,output);return{output,engine:'LibreOffice'}}finally{await fs.rm(temp,{recursive:true,force:true})}}
 if(plan.engine==='pandoc'){await run(status.pandoc.command,[input,'-o',output],{timeout});return{output,engine:'Pandoc'}}
 if(plan.engine==='calibre'){await run(status.calibre.command,[input,output],{timeout});return{output,engine:'Calibre'}}
 if(plan.engine==='sevenZip'){
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'convee-archive-'));
  try{await run(status.sevenZip.command,['x',input,'-o'+temp,'-y'],{timeout});await run(status.sevenZip.command,['a','-t'+(to==='gz'?'gzip':to==='bz2'?'bzip2':to),output,'.'],{cwd:temp,timeout});return{output,engine:'7-Zip'}}finally{await fs.rm(temp,{recursive:true,force:true})}
 }
 if(plan.engine==='gdal'){
  const drivers={shp:'ESRI Shapefile',geojson:'GeoJSON',kml:'KML',kmz:'LIBKML',gpkg:'GPKG',gpx:'GPX',csv:'CSV'};
  const driver=drivers[to];if(!driver)throw new Error('GDAL output driver is not mapped for .'+to);
  await run(status.gdal.command,['-f',driver,output,input],{timeout});return{output,engine:'GDAL'}
 }
 if(plan.engine==='assimp'){await run(status.assimp.command,['export',input,output],{timeout});return{output,engine:'Assimp'}}
 if(plan.engine==='blender'){
  const script=[
   "import bpy,sys,os",
   "src=sys.argv[-2]; dst=sys.argv[-1]",
   "src_ext=os.path.splitext(src)[1].lower(); dst_ext=os.path.splitext(dst)[1].lower()",
   "if src_ext=='.blend': bpy.ops.wm.open_mainfile(filepath=src)",
   "elif src_ext=='.obj': bpy.ops.wm.obj_import(filepath=src) if hasattr(bpy.ops.wm,'obj_import') else bpy.ops.import_scene.obj(filepath=src)",
   "elif src_ext=='.stl': bpy.ops.wm.stl_import(filepath=src) if hasattr(bpy.ops.wm,'stl_import') else bpy.ops.import_mesh.stl(filepath=src)",
   "elif src_ext in ('.gltf','.glb'): bpy.ops.import_scene.gltf(filepath=src)",
   "elif src_ext=='.fbx': bpy.ops.import_scene.fbx(filepath=src)",
   "else: raise RuntimeError('Unsupported Blender input: '+src_ext)",
   "if dst_ext=='.obj': bpy.ops.wm.obj_export(filepath=dst) if hasattr(bpy.ops.wm,'obj_export') else bpy.ops.export_scene.obj(filepath=dst)",
   "elif dst_ext=='.stl': bpy.ops.wm.stl_export(filepath=dst) if hasattr(bpy.ops.wm,'stl_export') else bpy.ops.export_mesh.stl(filepath=dst)",
   "elif dst_ext in ('.gltf','.glb'): bpy.ops.export_scene.gltf(filepath=dst)",
   "elif dst_ext=='.fbx': bpy.ops.export_scene.fbx(filepath=dst)",
   "else: raise RuntimeError('Unsupported Blender output: '+dst_ext)"
  ].join("\n");
  const tmp=path.join(os.tmpdir(),'convee-blender-export.py');await fs.writeFile(tmp,script);
  try{await run(status.blender.command,['-b','--python',tmp,'--',input,output],{timeout})}finally{await fs.rm(tmp,{force:true})}
  return{output,engine:'Blender'};
 }
 if(plan.engine==='oda'){
  if(!['dwg','dxf','dgn'].includes(from)||!['dwg','dxf'].includes(to))throw new Error('ODA adapter supports DWG and DXF pairs only.');
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
