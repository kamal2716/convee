const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync,execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);const sharp=require('sharp');const {PDFDocument}=require('pdf-lib');
const imageFormats=['png','jpg','jpeg','webp','avif','tiff','gif','bmp'];
const textFormats=['txt','md','html','htm','json','csv','xml'];
const officeFormats=['doc','docx','odt','rtf','xls','xlsx','ods','ppt','pptx','odp','hwp','hwpx'];
const mediaFormats=['mp4','mov','mkv','webm','avi','wmv','flv','mpeg','mp3','wav','aac','ogg','flac','m4a'];
const archiveFormats=['zip','7z','tar','gz','bz2','xz'];
const labels={png:'PNG image',jpg:'JPEG image',jpeg:'JPEG image',webp:'WebP image',avif:'AVIF image',tiff:'TIFF image',gif:'GIF image',bmp:'Bitmap image',txt:'Plain text',md:'Markdown',html:'HTML',json:'JSON',csv:'CSV',xml:'XML',pdf:'PDF'};
const toolCache={};function tool(name){if(!(name in toolCache)){const cmd=process.platform==='win32'?'where':'which';toolCache[name]=spawnSync(cmd,[name],{stdio:'ignore'}).status===0}return toolCache[name]}
function engineStatus(){return{sharp:true,pdfLib:true,libreoffice:tool('libreoffice')||tool('soffice'),ffmpeg:tool('ffmpeg'),imagemagick:tool('magick')||tool('convert'),sevenZip:tool('7z'),gdal:tool('ogr2ogr')&&tool('gdalinfo'),pandoc:tool('pandoc'),ghostscript:tool('gs')||tool('gswin64c'),python:tool('python')||tool('python3')}}
function getFormats(ext){ext=(ext||'').toLowerCase();const engines=engineStatus();
 if(imageFormats.includes(ext))return imageFormats.filter(x=>x!==ext).map(x=>({ext:x,label:labels[x]||x.toUpperCase()+' image',ready:true}));
 if(textFormats.includes(ext))return textFormats.filter(x=>x!==ext).map(x=>({ext:x,label:labels[x]||x.toUpperCase(),ready:true}));
 if(ext==='pdf')return[{ext:'pdf',label:'Rewrite / optimize PDF',ready:true}];
 if(officeFormats.includes(ext))return[{ext:'pdf',label:'PDF document',ready:engines.libreoffice,note:engines.libreoffice?'':'Install LibreOffice'},{ext:'docx',label:'Word document',ready:engines.libreoffice,note:engines.libreoffice?'':'Install LibreOffice'},{ext:'odt',label:'OpenDocument text',ready:engines.libreoffice,note:engines.libreoffice?'':'Install LibreOffice'},{ext:'xlsx',label:'Excel workbook',ready:engines.libreoffice,note:engines.libreoffice?'':'Install LibreOffice'}];
 if(mediaFormats.includes(ext))return['mp4','webm','mp3','wav','m4a','flac'].filter(x=>x!==ext).map(x=>({ext:x,label:x.toUpperCase()+' media',ready:engines.ffmpeg,note:engines.ffmpeg?'':'Install FFmpeg'}));
 if(archiveFormats.includes(ext))return['zip','7z','tar','gz'].filter(x=>x!==ext).map(x=>({ext:x,label:x.toUpperCase()+' archive',ready:engines.sevenZip,note:engines.sevenZip?'':'Install 7-Zip'}));
 return[{ext:'pdf',label:'PDF',ready:engines.libreoffice,note:'Requires a compatible local conversion engine'}]
}
async function convertFile({input,format,outputDir,quality=88}){const ext=path.extname(input).slice(1).toLowerCase(),target=format.toLowerCase(),base=path.basename(input,path.extname(input)),folder=outputDir||path.dirname(input);await fs.mkdir(folder,{recursive:true});let output=path.join(folder,base+'.'+target);if(output===input)output=path.join(folder,base+'-converted.'+target);
 if(imageFormats.includes(ext)&&imageFormats.includes(target)){let p=sharp(input,{animated:target==='gif'}).rotate();if(['jpg','jpeg'].includes(target))p=p.jpeg({quality:+quality,mozjpeg:true});else if(target==='png')p=p.png({compressionLevel:9);else if(target==='webp')p=p.webp({quality:+quality});else if(target==='avif')p=p.avif({quality:+quality});else if(target==='tiff')p=p.tiff({quality:+quality});else if(target==='bmp')throw new Error('BMP output is not supported by the built-in image engine.');else if(target==='gif')throw new Error('Animated GIF export is not available in this build.');await p.toFile(output);return{output,message:'Image converted successfully'}}
 if(textFormats.includes(ext)&&textFormats.includes(target)){const raw=await fs.readFile(input,'utf8');let value=raw;if(target==='json')value=JSON.stringify(JSON.parse(raw),null,2);if(target==='html'&&!['html','htm'].includes(ext))value='<!doctype html><meta charset="utf-8"><pre>'+escapeHtml(raw)+'</pre>';if(['txt','md'].includes(target)&&['html','htm'].includes(ext))value=raw.replace(/<script[\\s\\S]*?<\\/script>/gi,'').replace(/<style[\\s\\S]*?<\\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');await fs.writeFile(output,value,'utf8');return{output,message:'Text conversion complete'}}
 if(ext==='pdf'&&target==='pdf'){const doc=await PDFDocument.load(await fs.readFile(input));await fs.writeFile(output,await doc.save({useObjectStreams:true}));return{output,message:'PDF rewritten successfully'}}
 const status=engineStatus();
 if(officeFormats.includes(ext)&&status.libreoffice){const bin=tool('libreoffice')?'libreoffice':'soffice';await run(bin,['--headless','--convert-to',target,'--outdir',folder,input],{timeout:120000});const generated=path.join(folder,base+'.'+target);if(generated!==output)await fs.rename(generated,output);return{output,message:'Office document converted with LibreOffice'}}
 if(mediaFormats.includes(ext)&&mediaFormats.includes(target)&&status.ffmpeg){await run('ffmpeg',['-y','-i',input,'-map_metadata','0',output],{timeout:300000});return{output,message:'Media converted with FFmpeg'}}
 if(archiveFormats.includes(ext)&&archiveFormats.includes(target)&&status.sevenZip){await run('7z',['a','-t'+target,output,input],{timeout:300000});return{output,message:'Archive created with 7-Zip'}}
 throw new Error('No compatible local engine is available for this format pair. Check Settings → Conversion engines and install the suggested engine.');
}
function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
module.exports={convertFile,getFormats,engineStatus};
