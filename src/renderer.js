const $ = s => document.querySelector(s);
let history = [];
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function historyCsvCell(value){return '"'+String(value??'').replace(/"/g,'""')+'"'}
$('#exportHistory').onclick=()=>{
 if(!history.length){toast('There is no conversion history to export');return}
 const rows=[['Original file','Output file','Format','Date'],...history.map(h=>[h.name,h.output,h.format,h.date])];
 const csv='\\uFEFF'+rows.map(row=>row.map(historyCsvCell).join(',')).join('\\r\\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='convee-conversion-history.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 toast('History CSV exported');
};
$('#clearHistory').onclick=async()=>{
 if(!history.length){toast('History is already empty');return}
 if(!confirm('Clear all saved conversion history? Your converted files will not be deleted.'))return;
 history=[];await window.convee.saveHistory(history);renderHistory();toast('Conversion history cleared');
};
function renderHistory(){const el=$('#historyList');if(!history.length){el.innerHTML='<div class="empty"><div class="empty-icon">◷</div><b>Nothing converted yet</b><span>Your finished files will show up here.</span></div>';return}el.innerHTML=history.map(h=>'<div class="file-row"><div class="file-icon">'+h.format+'</div><div class="file-info"><b>'+esc(h.output.split(/[\\/]/).pop())+'</b><small>'+esc(h.date)+' · '+esc(h.name)+'</small></div><div class="file-actions"><button class="small-btn" data-open="'+esc(h.output)+'">Open</button><button class="small-btn" data-reveal="'+esc(h.output)+'">Show in folder</button></div></div>').join('');el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.convee.open(b.dataset.open));el.querySelectorAll('[data-reveal]').forEach(b=>b.onclick=()=>window.convee.reveal(b.dataset.reveal))}

// File conversion is initiated from the Explorer donut, not by importing files into this window.
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#'+b.dataset.view+'View').classList.add('active');$('#pageTitle').textContent={home:'Good files. Better flow.',history:'Your conversion history',settings:'Make it yours'}[b.dataset.view]});
function toggleTheme(){prefs.theme=prefs.theme==='navy'?'cream':'navy';persistPreferences()}$('#themeBtn').onclick=toggleTheme;
window.convee.loadHistory().then(items=>{history=items||[];renderHistory()}).catch(()=>renderHistory());
 window.convee.onHistoryUpdated(items=>{history=items||[];renderHistory()});

async function showEngines(){const host=$('#engineTags');if(!host)return;try{const data=await window.convee.engines();host.innerHTML=Object.entries(data).map(([k,v])=>'<span class="engine-tag '+(v?'ok':'missing')+'">'+(v?'● ':'○ ')+k+'</span>').join('')}catch(e){host.textContent='Could not read engine status'}}
showEngines();

const defaultPrefs={accent:'#F28B75',donut:'#142238',canvas:'#F6F0E6',warm:'#E9CDBB',opacity:94,theme:'cream'};
let prefs={...defaultPrefs};
function hexRgb(hex){const v=parseInt(hex.slice(1),16);return[(v>>16)&255,(v>>8)&255,v&255]}
function validHex(v){return /^#[0-9a-fA-F]{6}$/.test(v)}
function applyPreferences(){const root=document.documentElement.style;root.setProperty('--lime',prefs.accent);root.setProperty('--coral',prefs.accent);root.setProperty('--bg',prefs.canvas);root.setProperty('--navy',prefs.donut);root.setProperty('--warm',prefs.warm);root.setProperty('--accent',prefs.accent);document.body.classList.toggle('navy-theme',prefs.theme==='navy');document.body.classList.toggle('cream-theme',prefs.theme!=='navy');const mini=$('#miniDonut');if(mini)mini.style.background='radial-gradient(circle,'+prefs.donut+' 0 39%,transparent 40%),conic-gradient(from 10deg,'+prefs.accent+' 0 20%,'+prefs.warm+' 20% 36%,'+prefs.accent+' 36% 52%,'+prefs.warm+' 52% 70%,'+prefs.accent+' 70% 100%)';if(mini)mini.style.setProperty('--accent',prefs.accent);document.querySelectorAll('.theme-chip').forEach(b=>b.classList.toggle('selected',b.dataset.theme===prefs.theme));}
async function persistPreferences(){applyPreferences();await window.convee.savePreferences(prefs)}
function syncColorField(name,color){prefs[name]=color.toUpperCase();const picker=$('#'+name+'Color'),hex=$('#'+name+'Hex');if(picker)picker.value=prefs[name];if(hex)hex.value=prefs[name];const rgb=hexRgb(prefs[name]);const group=document.querySelector('[data-rgb="'+name+'"]');if(group)group.querySelectorAll('input').forEach((input,i)=>input.value=rgb[i]);applyPreferences()}
function bindColorStudio(){for(const name of ['accent','donut','canvas','warm']){const picker=$('#'+name+'Color'),hex=$('#'+name+'Hex'),group=document.querySelector('[data-rgb="'+name+'"]');picker.addEventListener('input',()=>{syncColorField(name,picker.value);persistPreferences()});hex.addEventListener('change',()=>{if(validHex(hex.value)){syncColorField(name,hex.value);persistPreferences()}else{hex.value=prefs[name];toast('Enter a valid 6-digit hex colour')}});group.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{const rgb=[...group.querySelectorAll('input')].map(x=>Math.max(0,Math.min(255,Number(x.value)||0)));const value='#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join('');syncColorField(name,value);persistPreferences()}));}}
function loadColorFields(){for(const name of ['accent','donut','canvas','warm'])syncColorField(name,prefs[name]);$('#donutOpacity').value=prefs.opacity;$('#opacityValue').textContent=prefs.opacity+'%';}
$('#donutOpacity').addEventListener('input',e=>{prefs.opacity=Number(e.target.value);$('#opacityValue').textContent=prefs.opacity+'%';persistPreferences()});
document.querySelectorAll('.theme-chip').forEach(b=>b.addEventListener('click',()=>{prefs.theme=b.dataset.theme==='navy'?'navy':'cream';persistPreferences()}));
$('#presetDefault').addEventListener('click',()=>{prefs={...defaultPrefs};loadColorFields();persistPreferences();toast('Signature palette restored')});
async function initializeAppearance(){try{prefs={...defaultPrefs,...await window.convee.loadPreferences()}}catch{}loadColorFields();bindColorStudio();applyPreferences()}
initializeAppearance();
async function syncRuntimeSettings(){const gesture=$('#toggleGesture'),startup=$('#toggleStartup');try{const enabled=await window.convee.gestureEnabled();gesture.textContent=enabled?'Disable Ctrl + drag':'Enable Ctrl + drag';gesture.dataset.enabled=String(enabled);$('#gestureDot').classList.toggle('off',!enabled);$('#gestureTitle').textContent=enabled?'Convee is ready in File Explorer':'Ctrl + drag is off';$('#gestureDescription').textContent=enabled?'Select a file in Explorer, hold Ctrl and drag it to the donut. Only files you drag are accessed.':'Enable the gesture in Settings. Convee only accesses files you deliberately drag to its donut; it does not scan your drives.';const auto=await window.convee.startupEnabled();startup.textContent=auto?'Disable startup':'Enable startup';startup.dataset.enabled=String(auto)}catch{gesture.textContent='Unavailable';startup.textContent='Unavailable'}}
$('#toggleGesture').addEventListener('click',async()=>{const next=$('#toggleGesture').dataset.enabled!=='true';try{const actual=await window.convee.setGestureEnabled(next);await syncRuntimeSettings();toast(actual?'Ctrl + drag is enabled':'Could not enable Ctrl + drag. Check OS permissions or app logs.')}catch(error){toast('Could not change gesture setting: '+error.message)}});
$('#toggleStartup').addEventListener('click',async()=>{const next=$('#toggleStartup').dataset.enabled!=='true';try{await window.convee.setStartupEnabled(next);await syncRuntimeSettings();toast(next?'Convee will start when you sign in':'Startup launch disabled')}catch(error){toast('Could not change startup setting: '+error.message)}});
syncRuntimeSettings();

let watchedFolders=[];
function renderWatchFolders(){
 const host=$('#watchList');if(!host)return;
 $('#watchStatus').textContent=watchedFolders.length+' folder(s) · watching for new files';
 host.innerHTML=watchedFolders.map(x=>'<div class="watch-row"><span title="'+esc(x.folder)+'">'+esc(x.folder)+'</span><small>→ '+esc((x.format||'').toUpperCase())+'</small><button class="small-btn" data-unwatch="'+esc(x.id)+'">Stop</button></div>').join('')||'<small>No folders watched yet</small>';
 host.querySelectorAll('[data-unwatch]').forEach(b=>b.onclick=async()=>{await window.convee.unwatchFolder(b.dataset.unwatch);watchedFolders=watchedFolders.filter(x=>x.id!==b.dataset.unwatch);renderWatchFolders();toast('Watch folder removed')});
}
async function loadWatchFolders(){try{watchedFolders=await window.convee.watchFolders()||[]}catch{watchedFolders=[]}renderWatchFolders()}
async function addWatchFolder(){
 const folder=await window.convee.chooseFolder();if(!folder)return;
 const cfg={id:folder,folder,format:$('#watchFormat').value};
 try{await window.convee.watchFolder(cfg);watchedFolders=watchedFolders.filter(x=>x.id!==cfg.id);watchedFolders.push(cfg);renderWatchFolders();toast('Watch folder enabled and saved')}
 catch(e){toast('Watch folder unavailable: '+e.message)}
}
$('#watchAdd').addEventListener('click',addWatchFolder);
loadWatchFolders();

async function runPdfTool(operation){const paths=await window.convee.choosePdfFiles();if(!paths.length)return;if(operation==='merge'&&paths.length<2){toast('Choose at least two PDFs to merge');return}let pages,rotation=90;if(operation==='extract'){pages=prompt('Pages to extract (examples: 1,3,5-8):','1');if(!pages)return}if(operation==='rotate'){rotation=Number(prompt('Rotate each page clockwise by 90, 180 or 270 degrees:','90'));if(![90,180,270].includes(rotation)){toast('Choose 90, 180 or 270 degrees');return}}const first=paths[0],output=operation==='merge'?first.replace(/\.pdf$/i,'-merged.pdf'):first.replace(/\.pdf$/i,'-'+operation+'.pdf');try{const result=await window.convee.pdfOperation({operation,inputs:paths,output,pages,rotation});toast(result.message+' · '+(result.output||result.outputs?.length+' files'));if(result.output)window.convee.reveal(result.output)}catch(e){toast('PDF tool: '+e.message)}}
$('#pdfMerge').onclick=()=>runPdfTool('merge');$('#pdfSplit').onclick=()=>runPdfTool('split');$('#pdfExtract').onclick=()=>runPdfTool('extract');$('#pdfRotate').onclick=()=>runPdfTool('rotate');$('#pdfNumber').onclick=()=>runPdfTool('number');$('#pdfCompress').onclick=async()=>{const paths=await window.convee.choosePdfFiles();if(!paths.length)return;try{const result=await window.convee.convert({input:paths[0],format:'pdf'});toast('PDF rewritten · '+result.output);window.convee.reveal(result.output)}catch(e){toast(e.message)}};
let cropInput=null,cropRect=null,cropStart=null;
const cropEditor=$('#cropEditor'),cropFrame=$('#cropFrame'),cropPreview=$('#cropPreview'),cropSelection=$('#cropSelection');
function closeCrop(){cropEditor.classList.add('hidden');cropInput=null;cropRect=null;cropStart=null;cropPreview.removeAttribute('src');cropSelection.style.display='none'}
$('#cropChoose').onclick=async()=>{
 const input=await window.convee.chooseImage();if(!input)return;
 try{const preview=await window.convee.previewImage(input);cropInput=input;cropRect=null;cropPreview.onload=()=>{cropSelection.style.display='none'};cropPreview.src=preview;cropEditor.classList.remove('hidden')}
 catch(e){toast('Could not preview image: '+e.message)}
};
$('#cropClose').onclick=closeCrop;
$('#cropEditor').addEventListener('click',e=>{if(e.target===cropEditor)closeCrop()});
function cropPoint(e){const r=cropFrame.getBoundingClientRect();return{x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top)),width:r.width,height:r.height}}
function drawCrop(x,y,w,h){cropSelection.style.display='block';cropSelection.style.left=x+'px';cropSelection.style.top=y+'px';cropSelection.style.width=w+'px';cropSelection.style.height=h+'px'}
cropFrame.addEventListener('pointerdown',e=>{if(!cropInput)return;cropFrame.setPointerCapture(e.pointerId);const p=cropPoint(e);cropStart=p;cropRect=null;drawCrop(p.x,p.y,0,0)});
cropFrame.addEventListener('pointermove',e=>{if(!cropStart)return;const p=cropPoint(e),x=Math.min(cropStart.x,p.x),y=Math.min(cropStart.y,p.y),w=Math.abs(p.x-cropStart.x),h=Math.abs(p.y-cropStart.y);drawCrop(x,y,w,h);cropRect={left:x/p.width,top:y/p.height,width:w/p.width,height:h/p.height}});
cropFrame.addEventListener('pointerup',e=>{if(!cropStart)return;const p=cropPoint(e);if(Math.abs(p.x-cropStart.x)<8||Math.abs(p.y-cropStart.y)<8){cropRect=null;cropSelection.style.display='none'}cropStart=null});
cropFrame.addEventListener('pointercancel',()=>{cropStart=null});
$('#cropReset').onclick=()=>{cropRect=null;cropSelection.style.display='none'};
$('#cropQuality').addEventListener('input',e=>$('#cropQualityValue').textContent=e.target.value);
$('#cropExport').onclick=async()=>{
 if(!cropInput)return;
 const format=$('#cropFormat').value,quality=Number($('#cropQuality').value);
 try{const result=await window.convee.convert({input:cropInput,format,quality,crop:cropRect||undefined});closeCrop();toast('Cropped image saved · '+result.output);window.convee.reveal(result.output)}
 catch(e){toast('Crop failed: '+e.message)}
};


// Exact duplicate finder: scan a user-selected folder and show safe review results.
const duplicateButton=$('#duplicateScan');
if(duplicateButton)duplicateButton.addEventListener('click',async()=>{
 const folder=await window.convee.chooseFolder();if(!folder)return;
 const summary=$('#duplicateSummary'),host=$('#duplicateResults');
 duplicateButton.disabled=true;summary.textContent='Scanning files locally…';host.innerHTML='';
 try{
  const result=await window.convee.scanDuplicates(folder);
  const pretty=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(2)+' GB';
  summary.textContent=result.groups.length+' duplicate group(s) · '+result.scanned+' files scanned · '+pretty(result.reclaimable)+' potentially reclaimable';
  if(!result.groups.length){host.innerHTML='<div class="duplicate-empty">No exact duplicates found in this folder.</div>';return}
  host.innerHTML=result.groups.map((group,index)=>'<div class="duplicate-group"><b>Group '+(index+1)+' · '+pretty(group.size)+' each</b><small>'+group.files.length+' identical files · '+esc(group.hash.slice(0,16))+'…</small>'+group.files.map(file=>'<div class="duplicate-file"><span title="'+esc(file.path)+'">'+esc(file.path)+'</span><button class="small-btn" data-reveal-duplicate="'+esc(file.path)+'">Show</button></div>').join('')+'</div>').join('');
  host.querySelectorAll('[data-reveal-duplicate]').forEach(button=>button.addEventListener('click',()=>window.convee.reveal(button.dataset.revealDuplicate)));
  if(result.skipped)summary.textContent+=' · '+result.skipped+' item(s) skipped';
 }catch(error){summary.textContent='Scan stopped: '+error.message}
 finally{duplicateButton.disabled=false}
});


// Image metadata inspector and explicit metadata-free export.
let privacyImage=null;
const privacyChoose=$('#imageMetadataChoose'),privacyExport=$('#imageMetadataStrip');
if(privacyChoose&&privacyExport){
 privacyChoose.addEventListener('click',async()=>{
  const file=await window.convee.chooseImage();if(!file)return;
  privacyImage=file;privacyChoose.disabled=true;privacyExport.disabled=true;
  const summary=$('#imageMetadataSummary'),details=$('#imageMetadataDetails');
  summary.textContent='Reading image metadata locally…';details.innerHTML='';
  try{
   const m=await window.convee.inspectImageMetadata(file);
   summary.textContent=m.name+' · '+m.format.toUpperCase()+' · '+(m.width||'?')+' × '+(m.height||'?')+' px';
   const rows=[
    ['Colour space',m.space],['Channels',m.channels],['Bit depth',m.depth],
    ['Transparency',m.hasAlpha?'Yes':'No'],['Animation/pages',m.pages],
    ['EXIF metadata',m.hasExif?'Present':'Not detected'],['ICC colour profile',m.hasIcc?'Present':'Not detected'],
    ['IPTC metadata',m.hasIptc?'Present':'Not detected'],['XMP metadata',m.hasXmp?'Present':'Not detected']
   ];
   details.innerHTML=rows.map(([k,v])=>'<div class="metadata-row"><span>'+esc(k)+'</span><b>'+esc(String(v??'—'))+'</b></div>').join('');
   privacyExport.disabled=false;
  }catch(error){privacyImage=null;summary.textContent='Could not inspect image: '+error.message}
  finally{privacyChoose.disabled=false}
 });
 privacyExport.addEventListener('click',async()=>{
  if(!privacyImage)return;
  privacyExport.disabled=true;const summary=$('#imageMetadataSummary');
  try{const result=await window.convee.exportImageWithoutMetadata(privacyImage);summary.textContent=result.message+' · '+result.output.split(/[\\/]/).pop();window.convee.reveal(result.output);toast('Privacy-safe image copy created')}
  catch(error){summary.textContent='Export failed: '+error.message}
  finally{privacyExport.disabled=false}
 });
}
