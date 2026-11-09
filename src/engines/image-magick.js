// ImageMagick CLI adapter. Capabilities are discovered from the installed build instead of
// assuming every ImageMagick installation contains the same delegates and coders.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');

const timeout=15*60*1000;
function parseFormats(text){
  const formats={};
  for(const line of String(text||'').split(/\r?\n/)){
    const match=line.match(/^\s*([A-Z0-9][A-Z0-9+,*_-]*)\*?\s+([r-][w-][+-]?)\b/i);
    if(!match)continue;
    const id=match[1].toLowerCase();
    const flags=match[2].toLowerCase();
    formats[id]={read:flags.includes('r'),write:flags.includes('w')};
  }
  return formats;
}
function runSync(command,args){
  return spawnSync(command,args,{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:8*1024*1024});
}
function probe(command){
  if(!command)return{available:false,readable:{},writable:{},reason:'ImageMagick is not installed.'};
  const result=runSync(command,['-list','format']);
  if(result.error||result.status!==0)return{available:false,readable:{},writable:{},reason:result.error?.message||result.stderr||'ImageMagick format probe failed.'};
  const formats=parseFormats(result.stdout);
  const readable={},writable={};
  for(const [id,flags] of Object.entries(formats)){if(flags.read)readable[id]=true;if(flags.write)writable[id]=true;}
  return{available:Object.keys(readable).length>0&&Object.keys(writable).length>0,readable,writable,version:(runSync(command,['-version']).stdout||'').split(/\r?\n/)[0]||null};
}
function extensionAliases(ext){
  const map={jpg:'jpeg',jpe:'jpeg',tif:'tiff',heif:'heic',j2k:'jp2',jpf:'jp2',jpx:'jp2',pgm:'pgm',pbm:'pbm',pnm:'pnm',apng:'png',cur:'cur'};
  return map[String(ext).toLowerCase()]||String(ext).toLowerCase();
}
function canRead(status,ext){return Boolean(status?.readable?.[extensionAliases(ext)]);}
function canWrite(status,ext){return Boolean(status?.writable?.[extensionAliases(ext)]);}
function clamp(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null;}
async function convert({command,input,output,from,to,quality=88,crop,resize}){
  if(!command)throw new Error('ImageMagick is not available.');
  if(!canRead({readable:arguments[0].readable},from))throw new Error('This ImageMagick build cannot read .'+from+'.');
  if(!canWrite({writable:arguments[0].writable},to))throw new Error('This ImageMagick build cannot write .'+to+'.');
  const args=[input,'-auto-orient'];
  if(crop){
    const values=['left','top','width','height'].map(k=>clamp(crop[k],0,1));
    if(values.some(v=>v===null)||values[2]<=0||values[3]<=0)throw new Error('Crop rectangle is invalid.');
    const identify=runSync(command,['identify','-format','%w %h',input]);
    if(identify.error||identify.status!==0)throw new Error('Could not read image dimensions for cropping.');
    const [w,h]=identify.stdout.trim().split(/\s+/).map(Number);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)throw new Error('Image dimensions are invalid.');
    const left=Math.max(0,Math.min(w-1,Math.round(values[0]*w)));
    const top=Math.max(0,Math.min(h-1,Math.round(values[1]*h)));
    const width=Math.max(1,Math.min(w-left,Math.round(values[2]*w)));
    const height=Math.max(1,Math.min(h-top,Math.round(values[3]*h)));
    args.push('-crop',width+'x'+height+'+'+left+'+'+top,'+repage');
  }
  if(resize&&Number.isFinite(Number(resize.width))&&Number(resize.width)>0){
    const width=Math.round(Number(resize.width));
    const height=Number(resize.height)>0?Math.round(Number(resize.height))+'':'';
    args.push('-resize',width+'x'+height+(resize.fit==='contain'?'':'^'));
    if(resize.fit==='cover')args.push('-gravity','center','-extent',width+'x'+height);
  }
  const q=clamp(quality,1,100);
  if(q!==null&&['jpg','jpeg','webp','avif','heic','heif','jxl'].includes(to))args.push('-quality',String(Math.round(q)));
  args.push(output);
  const result=spawnSync(command,args,{encoding:'utf8',windowsHide:true,timeout,maxBuffer:16*1024*1024});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error((result.stderr||result.stdout||'ImageMagick conversion failed.').trim().slice(-3000));
  const stat=await fs.stat(output).catch(()=>null);
  if(!stat?.isFile()||stat.size===0)throw new Error('ImageMagick did not produce a non-empty output file.');
  return{output,engine:'ImageMagick'};
}
module.exports={parseFormats,probe,canRead,canWrite,convert};
