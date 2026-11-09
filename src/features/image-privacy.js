// Local image metadata inspection and privacy export.
const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');

async function inspectImage(file){
  const m=await sharp(file,{failOn:'none'}).metadata();
  return {
    name:path.basename(file),format:m.format||'unknown',width:m.width||null,height:m.height||null,
    space:m.space||'unknown',channels:m.channels||null,depth:m.depth||'unknown',
    hasAlpha:!!m.hasAlpha,pages:m.pages||1,pageHeight:m.pageHeight||null,
    orientation:m.orientation||null,density:m.density||null,
    hasExif:!!m.exif,hasIcc:!!m.icc,hasIptc:!!m.iptc,hasXmp:!!m.xmp,
    profileBytes:m.icc?.length||0,exifBytes:m.exif?.length||0
  };
}

async function exportWithoutMetadata(file){
  const meta=await sharp(file,{failOn:'none'}).metadata();
  const ext=(meta.format||path.extname(file).slice(1)||'png').toLowerCase();
  const allowed=['jpeg','png','webp','avif','tiff','gif'];
  if(!allowed.includes(ext))throw new Error('Metadata-safe export is not supported for this image format.');
  const suffix=ext==='jpeg'?'jpg':ext;
  const dir=path.dirname(file),base=path.basename(file,path.extname(file));
  let output=path.join(dir,base+'-metadata-free.'+suffix),n=1;
  while(true){try{await fs.access(output);output=path.join(dir,base+'-metadata-free-'+n+'.'+suffix);n++}catch{break}}
  // Sharp does not copy EXIF, XMP, IPTC or ICC metadata unless explicitly requested.
  let pipeline=sharp(file,{failOn:'none'}).rotate();
  if(ext==='jpeg')pipeline=pipeline.jpeg({quality:92});
  else if(ext==='png')pipeline=pipeline.png();
  else if(ext==='webp')pipeline=pipeline.webp({quality:92});
  else if(ext==='avif')pipeline=pipeline.avif({quality:90});
  else if(ext==='tiff')pipeline=pipeline.tiff();
  else if(ext==='gif')pipeline=pipeline.gif();
  await pipeline.toFile(output);
  const stat=await fs.stat(output);
  if(!stat.isFile()||stat.size===0)throw new Error('Privacy export did not produce a valid output file.');
  return{output,format:ext,size:stat.size,message:'Exported without embedded metadata'};
}
module.exports={inspectImage,exportWithoutMetadata};
