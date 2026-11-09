const $=s=>document.querySelector(s);let dropped=[],formats=[];
function close(){window.convee.overlayClose()}
$('#quit').onclick=close;
window.convee.onOverlayState(s=>{if(!s.active){dropped=[];formats=[];$('#slices').innerHTML='';$('#hint').textContent='Release files here'}});
for(const ev of ['dragenter','dragover'])document.addEventListener(ev,e=>{e.preventDefault();$('#shell').classList.add('over')});
for(const ev of ['dragleave','drop'])document.addEventListener(ev,e=>{e.preventDefault();$('#shell').classList.remove('over')});
document.addEventListener('drop',async e=>{const paths=[...(e.dataTransfer?.files||[])].map(f=>f.path).filter(Boolean);if(!paths.length)return;dropped=paths;const info=await window.convee.inspect(paths);const perFile=await Promise.all(info.map(x=>window.convee.formats(x.ext)));formats=(perFile[0]||[]).filter(x=>x.ready&&perFile.every(list=>list.some(y=>y.ext===x.ext&&y.ready)));render();$('#hint').textContent=paths.length+' file(s) · choose output format'});
function render(){const host=$('#slices');host.innerHTML='';const usable=formats.filter(x=>x.ready).slice(0,8);if(!usable.length){$('#hint').textContent='No supported format · check installed engines';return}const center=180,r=130;usable.forEach((f,i)=>{const angle=(-Math.PI/2)+(i/usable.length)*Math.PI*2;const x=center+Math.cos(angle)*r-42,y=center+Math.sin(angle)*r-27;const b=document.createElement('button');b.className='slice';b.style.left=x+'px';b.style.top=y+'px';b.innerHTML='<b>.'+f.ext.toUpperCase()+'</b><span>'+f.label+'</span>';b.onclick=()=>convert(f.ext);host.appendChild(b)})}
async function convert(ext){if(!dropped.length)return;$('#hint').textContent='Converting locally…';$('#shell').classList.add('busy');try{const results=await Promise.allSettled(dropped.map(input=>window.convee.convert({input,format:ext})));const ok=results.filter(x=>x.status==='fulfilled').length;$('#hint').textContent=ok+'/'+dropped.length+' converted · saved beside originals';if(ok===dropped.length)setTimeout(close,1100);else $('#shell').classList.remove('busy')}catch(e){$('#hint').textContent=e.message;$('#shell').classList.remove('busy')}}

const defaultOverlayPrefs={accent:'#F28B75',donut:'#142238',warm:'#E9CDBB',opacity:94};
function applyOverlayPrefs(p={}){const v={...defaultOverlayPrefs,...p},root=document.documentElement.style;root.setProperty('--accent',v.accent);root.setProperty('--donut',v.donut);root.setProperty('--warm',v.warm);root.setProperty('--opacity',Math.max(35,Math.min(100,Number(v.opacity)||94))/100)}
window.convee.loadPreferences().then(applyOverlayPrefs).catch(()=>applyOverlayPrefs());
window.convee.onPreferencesChanged(applyOverlayPrefs);
