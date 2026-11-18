const $=s=>document.querySelector(s);
let dropped=[],formats=[],inspectedKey='',dragActive=false;
function close(){window.convee.overlayClose()}
$('#quit').onclick=close;
window.convee.onOverlayState(s=>{if(!s.active){dropped=[];formats=[];inspectedKey='';dragActive=false;$('#slices').innerHTML='';$('#hint').textContent='Hold Ctrl and drag a file'}});
function render(){
 const host=$('#slices');host.innerHTML='';
 const usable=formats.filter(x=>x.ready).slice(0,8);
 if(!usable.length){$('#hint').textContent=dropped.length?'No supported conversions for this file':'Drag a file here';return}
 const center=180,r=130;
 usable.forEach((f,i)=>{
  const angle=(-Math.PI/2)+(i/usable.length)*Math.PI*2;
  const x=center+Math.cos(angle)*r-42,y=center+Math.sin(angle)*r-27;
  const b=document.createElement('button');b.className='slice';b.dataset.format=f.ext;
  b.style.left=x+'px';b.style.top=y+'px';
  b.innerHTML='<b>.'+f.ext.toUpperCase()+'</b><span>'+(f.recommended?'SMART PICK':f.label)+'</span>';
  b.onclick=()=>convert(f.ext);host.appendChild(b);
 });
}
async function inspectDraggedFiles(dt){
 const paths=[...(dt?.files||[])].map(f=>f.path).filter(Boolean);
 if(!paths.length)return;
 const key=paths.join('|');
 if(key===inspectedKey)return;
 inspectedKey=key;dropped=paths;formats=[];$('#hint').textContent='Reading available conversions…';
 try{
  const info=await window.convee.inspect(paths);
  const perFile=await Promise.all(info.map(x=>window.convee.formats(x.ext)));
  formats=(perFile[0]||[]).filter(x=>x.ready&&perFile.every(list=>list.some(y=>y.ext===x.ext&&y.ready)));
  render();$('#hint').textContent=paths.length+' file(s) · release on a format or choose one';
 }catch(error){$('#hint').textContent='Could not read file: '+error.message}
}
for(const ev of ['dragenter','dragover'])document.addEventListener(ev,e=>{
 e.preventDefault();dragActive=true;$('#shell').classList.add('over');
 inspectDraggedFiles(e.dataTransfer);
});
for(const ev of ['dragleave'])document.addEventListener(ev,e=>{
 if(e.relatedTarget===null){dragActive=false;$('#shell').classList.remove('over')}
});
document.addEventListener('drop',async e=>{
 e.preventDefault();dragActive=false;$('#shell').classList.remove('over');
 await inspectDraggedFiles(e.dataTransfer);
 const target=e.target.closest?.('[data-format]');
 if(target){await convert(target.dataset.format);return}
 if(dropped.length)$('#hint').textContent='File ready · click a format to convert';
});
async function convert(ext){
 if(!dropped.length)return;
 const chosen=dropped.slice();$('#hint').textContent='Converting '+chosen.length+' file(s) locally…';$('#shell').classList.add('busy');
 const results=await Promise.allSettled(chosen.map(input=>window.convee.convertFromOverlay({input,format:ext})));
 const ok=results.filter(x=>x.status==='fulfilled').length;
 const failed=results.length-ok;
 $('#hint').textContent=ok+' converted'+(failed?' · '+failed+' failed':'')+' · saved beside originals';
 if(failed){$('#shell').classList.remove('busy');return}
 setTimeout(close,1300);
}

const defaultOverlayPrefs={accent:'#F28B75',donut:'#142238',warm:'#E9CDBB',opacity:94};
function applyOverlayPrefs(p={}){const v={...defaultOverlayPrefs,...p},root=document.documentElement.style;root.setProperty('--accent',v.accent);root.setProperty('--donut',v.donut);root.setProperty('--warm',v.warm);root.setProperty('--opacity',Math.max(35,Math.min(100,Number(v.opacity)||94))/100)}
window.convee.loadPreferences().then(applyOverlayPrefs).catch(()=>applyOverlayPrefs());
window.convee.onPreferencesChanged(applyOverlayPrefs);
