const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync,execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);const sharp=require('sharp');const {PDFDocument}=require('pdf-lib');
const {detectEngines}=require('./engines/engine-manager');
const {listFormats}=require('./engines/route-planner');
const {convertWithEngine}=require('./engines/conversion-runner');
const imageFormats=['png','jpg','jpeg','webp','avif','tiff','gif','bmp'];
const toolCache={};function tool(name){if(!(name in toolCache)){const cmd=process.platform==='win32'?'where':'which';toolCache[name]=spawnSync(cmd,[name],{stdio:'ignore'}).status===0}return toolCache[name]}
function engineStatus(){const detected=detectEngines();return Object.fromEntries(Object.entries(detected).map(([k,v])=>[k,v.available]));}
function getFormats(ext){return listFormats(ext)}
async function convertFile({input,format,outputDir,quality=88,mediaPreset='balanced',crop}){const ext=path.extname(input).slice(1).toLowerCase(),target=format.toLowerCase(),base=path.basename(input,path.extname(input)),folder=outputDir||path.dirname(input);await fs.mkdir(folder,{recursive:true});let output=path.join(folder,base+'.'+target);if(output===input)output=path.join(folder,base+'-converted.'+target);let suffix=1;while(true){try{await fs.access(output);output=path.join(folder,base+'-converted-'+suffix+'.'+target);suffix++}catch{break}}
 if(imageFormats.includes(ext)&&imageFormats.includes(target)&&!['bmp','gif'].includes(target)){let p=sharp(input,{animated:target==='gif'}).rotate();if(crop){const meta=await p.metadata();const left=Math.max(0,Math.min(meta.width-1,Math.round(crop.left*meta.width))),top=Math.max(0,Math.min(meta.height-1,Math.round(crop.top*meta.height))),width=Math.max(1,Math.min(meta.width-left,Math.round(crop.width*meta.width))),height=Math.max(1,Math.min(meta.height-top,Math.round(crop.height*meta.height)));p=p.extract({left,top,width,height})}if(['jpg','jpeg'].includes(target))p=p.jpeg({quality:+quality,mozjpeg:true});else if(target==='png')p=p.png({compressionLevel:9});else if(target==='webp')p=p.webp({quality:+quality});else if(target==='avif')p=p.avif({quality:+quality});else if(target==='tiff')p=p.tiff({quality:+quality});await p.toFile(output);return{output,message:'Image converted successfully'}}
 if(ext==='pdf'&&target==='pdf'){
  if(statusGhostscript()){
   const gs=tool('gswin64c')?'gswin64c':tool('gswin32c')?'gswin32c':'gs';
   await run(gs,['-sDEVICE=pdfwrite','-dCompatibilityLevel=1.5','-dPDFSETTINGS=/ebook','-dNOPAUSE','-dBATCH','-dQUIET','-sOutputFile='+output,input],{timeout:300000});
   return{output,message:'PDF compressed with Ghostscript'};
  }
  const doc=await PDFDocument.load(await fs.readFile(input));
  await fs.writeFile(output,await doc.save({useObjectStreams:true,objectsPerTick:50}));
  return{output,message:'PDF structure optimized (install Ghostscript for image recompression)'};
 }
 // All non-native conversions use the same route planner and execution adapters.
 const result=await convertWithEngine({input,format:target,output,quality,mediaPreset});
 const info=await fs.stat(output);if(!info.isFile()||info.size===0)throw new Error('The conversion engine did not produce a non-empty output file.');
 return{...result,output,message:result.message||'Converted successfully'};
}
function statusGhostscript(){return tool('gs')||tool('gswin64c')||tool('gswin32c')}
function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
async function pdfOperation({operation,inputs,output,pages}){if(!inputs?.length)throw new Error('Select at least one PDF file');let result=await PDFDocument.create();if(operation==='merge'){for(const input of inputs){const src=await PDFDocument.load(await fs.readFile(input));const copied=await result.copyPages(src,src.getPageIndices());copied.forEach(p=>result.addPage(p))}}else{const src=await PDFDocument.load(await fs.readFile(inputs[0]));let indexes;if(operation==='extract'){indexes=(pages||'1').split(',').flatMap(part=>{const [a,b]=part.trim().split('-').map(Number);return Number.isFinite(b)?Array.from({length:Math.max(0,b-a+1)},(_,i)=>a-1+i):[a-1]})}else if(operation==='split'){const saved=[];for(let i=0;i<src.getPageCount();i++){const doc=await PDFDocument.create();doc.addPage((await doc.copyPages(src,[i]))[0]);const dest=output.replace(/\.pdf$/i,'')+'-page-'+(i+1)+'.pdf';await fs.writeFile(dest,await doc.save({useObjectStreams:true}));saved.push(dest)}return{outputs:saved,message:saved.length+' pages extracted'}}else indexes=src.getPageIndices();const valid=indexes.filter(i=>i>=0&&i<src.getPageCount());const copied=await result.copyPages(src,valid);copied.forEach(p=>result.addPage(p))}await fs.writeFile(output,await result.save({useObjectStreams:true,objectsPerTick:50}));return{output,message:operation+' completed'}}
module.exports={convertFile,getFormats,engineStatus,pdfOperation};
