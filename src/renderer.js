const $ = s => document.querySelector(s);
let files = [], history = [], activeFile = null;
const formatModal = $('#formatModal');
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function bytes(n){if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'}
function addPaths(paths){const unique=paths.filter(p=>!files.some(f=>f.path===p));if(!unique.length)return;window.convee.inspect(unique).then(items=>{files.push(...items.map(x=>({...x,id:crypto.randomUUID(),status:'Ready'})));render();toast(unique.length+' file'+(unique.length>1?'s':'')+' added')}).catch(e=>toast(e.message))}
window.convee.onFilesChosen(addPaths);
$('#addFiles').onclick=()=>window.convee.chooseFiles();$('#browseBtn').onclick=()=>window.convee.chooseFiles();
$('#clearQueue').onclick=()=>{files=[];render()};
$('#batchConvert').onclick=()=>openBatch();
function render(){const q=$('#queue');$('#queueCount').textContent=files.length;if(!files.length){q.innerHTML='<div class="empty"><div class="empty-icon">▤</div><b>No files yet</b><span>Your next conversion starts here.</span></div>';return}
q.innerHTML=files.map(f=>'<div class="file-row"><div class="file-icon">'+(f.ext||'FILE')+'</div><div class="file-info"><b title="'+esc(f.name)+'">'+esc(f.name)+'</b><small>'+bytes(f.size)+' · '+(f.ext||'unknown').toUpperCase()+'</small></div><span class="file-status">'+esc(f.status)+'</span><div class="file-actions"><button class="small-btn convert" data-convert="'+f.id+'">Choose format ↗</button><button class="remove" title="Remove" data-remove="'+f.id+'">×</button></div></div>').join('');
q.querySelectorAll('[data-convert]').forEach(b=>b.onclick=()=>openFormats(files.find(f=>f.id===b.dataset.convert)));q.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{files=files.filter(f=>f.id!==b.dataset.remove);render()})}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function openFormats(file){if(!file)return;activeFile=file;$('#modalTitle').textContent=file.name;$('#modalSub').textContent='Choose a format to convert this '+(file.ext||'file')+' into.';const grid=$('#formatGrid');grid.innerHTML='<div class="empty">Loading formats…</div>';formatModal.classList.remove('hidden');const formats=await window.convee.formats(file.ext);grid.innerHTML=formats.map(f=>'<button class="format-option" '+(!f.ready?'disabled':'')+' data-format="'+f.ext+'">'+(f.recommended?'<i class="recommended-tag">SMART PICK</i>':'')+'<b>.'+f.ext.toUpperCase()+'</b><span>'+esc(f.label)+'</span>'+(f.note?'<small>'+esc(f.note)+'</small>':'')+'</button>').join('')||'<div class="empty">No compatible formats found.</div>';grid.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>runConversion(file,b.dataset.format))}
async function runConversion(file,format){formatModal.classList.add('hidden');file.status='Converting…';render();try{const result=await window.convee.convert({input:file.path,format,mediaPreset:$('#mediaPreset')?.value||'balanced'});file.status='Converted';history.unshift({name:file.name,output:result.output,format:format.toUpperCase(),date:new Date().toLocaleString()});await window.convee.saveHistory(history);files=files.filter(f=>f.id!==file.id);render();renderHistory();toast(result.message+' · '+result.output.split(/[\\/]/).pop())}catch(e){file.status='Could not convert';render();toast(e.message)}}

async function openBatch(){if(!files.length){toast('Add files to the queue first');return}const ext=files[0].ext;const compatible=files.filter(f=>f.ext===ext);if(compatible.length!==files.length)toast('Batch will include '+compatible.length+' '+ext.toUpperCase()+' files; other formats are skipped');const grid=$('#formatGrid');$('#modalTitle').textContent='Convert '+compatible.length+' files';$('#modalSub').textContent='Choose one output format for this batch.';grid.innerHTML='<div class="empty">Loading formats…</div>';formatModal.classList.remove('hidden');const options=await window.convee.formats(ext);grid.innerHTML=options.map(f=>'<button class="format-option" '+(!f.ready?'disabled':'')+' data-batch-format="'+f.ext+'"><b>.'+f.ext.toUpperCase()+'</b><span>'+esc(f.label)+'</span></button>').join('')||'<div class="empty">No compatible formats found.</div>';grid.querySelectorAll('[data-batch-format]').forEach(b=>b.onclick=()=>runBatch(compatible,b.dataset.batchFormat))}
async function runBatch(batch,format){formatModal.classList.add('hidden');toast('Converting '+batch.length+' files…');const results=await Promise.allSettled(batch.map(async file=>{file.status='Converting…';const result=await window.convee.convert({input:file.path,format,mediaPreset:$('#mediaPreset')?.value||'balanced'});return{file,result}}));const done=[];for(const item of results){if(item.status==='fulfilled'){const {file,result}=item.value;done.push(file.id);history.unshift({name:file.name,output:result.output,format:format.toUpperCase(),date:new Date().toLocaleString()})}else toast(item.reason?.message||'A file could not be converted')}files=files.filter(f=>!done.includes(f.id));await window.convee.saveHistory(history);render();renderHistory();toast(done.length+' of '+batch.length+' files converted')}

function renderHistory(){const el=$('#historyList');if(!history.length){el.innerHTML='<div class="empty"><div class="empty-icon">◷</div><b>Nothing converted yet</b><span>Your finished files will show up here.</span></div>';return}el.innerHTML=history.map(h=>'<div class="file-row"><div class="file-icon">'+h.format+'</div><div class="file-info"><b>'+esc(h.output.split(/[\\/]/).pop())+'</b><small>'+esc(h.date)+' · '+esc(h.name)+'</small></div><div class="file-actions"><button class="small-btn" data-open="'+esc(h.output)+'">Open</button><button class="small-btn" data-reveal="'+esc(h.output)+'">Show in folder</button></div></div>').join('');el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.convee.open(b.dataset.open));el.querySelectorAll('[data-reveal]').forEach(b=>b.onclick=()=>window.convee.reveal(b.dataset.reveal))}
$('#closeModal').onclick=()=>formatModal.classList.add('hidden');formatModal.querySelector('.modal-backdrop').onclick=()=>formatModal.classList.add('hidden');document.addEventListener('keydown',e=>{if(e.key==='Escape')formatModal.classList.add('hidden')});
for(const ev of ['dragenter','dragover'])$('#dropzone').addEventListener(ev,e=>{e.preventDefault();$('#dropzone').classList.add('drag')});for(const ev of ['dragleave','drop'])$('#dropzone').addEventListener(ev,e=>{e.preventDefault();$('#dropzone').classList.remove('drag')});document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();const paths=[...(e.dataTransfer?.files||[])].map(f=>f.path).filter(Boolean);if(paths.length)addPaths(paths)});
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#'+b.dataset.view+'View').classList.add('active');$('#pageTitle').textContent={home:'Good files. Better flow.',history:'Your conversion history',settings:'Make it yours'}[b.dataset.view]});
function toggleTheme(){prefs.theme=prefs.theme==='navy'?'cream':'navy';persistPreferences()}$('#themeBtn').onclick=toggleTheme;
render();window.convee.loadHistory().then(items=>{history=items||[];renderHistory()}).catch(()=>renderHistory());

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

async function runPdfTool(operation){const paths=await window.convee.choosePdfFiles();if(!paths.length)return;if(operation==='merge'&&paths.length<2){toast('Choose at least two PDFs to merge');return}let pages;if(operation==='extract'){pages=prompt('Pages to extract (examples: 1,3,5-8):','1');if(!pages)return}const first=paths[0],output=operation==='merge'?first.replace(/\.pdf$/i,'-merged.pdf'):first.replace(/\.pdf$/i,'-'+operation+'.pdf');try{const result=await window.convee.pdfOperation({operation,inputs:paths,output,pages});toast(result.message+' · '+(result.output||result.outputs?.length+' files'));if(result.output)window.convee.reveal(result.output)}catch(e){toast('PDF tool: '+e.message)}}
$('#pdfMerge').onclick=()=>runPdfTool('merge');$('#pdfSplit').onclick=()=>runPdfTool('split');$('#pdfExtract').onclick=()=>runPdfTool('extract');$('#pdfCompress').onclick=async()=>{const paths=await window.convee.choosePdfFiles();if(!paths.length)return;try{const result=await window.convee.convert({input:paths[0],format:'pdf'});toast('PDF rewritten · '+result.output);window.convee.reveal(result.output)}catch(e){toast(e.message)}};
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
