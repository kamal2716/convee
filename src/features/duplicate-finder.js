// Exact duplicate finder. It hashes files locally and never uploads file contents.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');

async function hashFile(file){
  const hash=crypto.createHash('sha256');
  const handle=await fs.open(file,'r');
  try{
    const buffer=Buffer.allocUnsafe(1024*1024);
    let position=0;
    while(true){
      const {bytesRead}=await handle.read(buffer,0,buffer.length,position);
      if(!bytesRead)break;
      hash.update(buffer.subarray(0,bytesRead));
      position+=bytesRead;
    }
    return hash.digest('hex');
  }finally{await handle.close()}
}
async function findDuplicates(root,{maxFiles=50000,maxDepth=32}={}){
  const base=path.resolve(root),queue=[{dir:base,depth:0}],groups=new Map();
  let scanned=0,skipped=0;
  while(queue.length){
    const current=queue.shift();
    if(current.depth>maxDepth){skipped++;continue}
    let entries;
    try{entries=await fs.readdir(current.dir,{withFileTypes:true})}catch{skipped++;continue}
    for(const entry of entries){
      if(entry.name.startsWith('.convee-'))continue;
      const full=path.join(current.dir,entry.name);
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){queue.push({dir:full,depth:current.depth+1});continue}
      if(!entry.isFile())continue;
      if(scanned>=maxFiles)throw new Error('Scan limit reached ('+maxFiles+' files). Choose a smaller folder.');
      let stat;
      try{stat=await fs.stat(full)}catch{skipped++;continue}
      if(stat.size===0)continue;
      const sizeKey=String(stat.size);
      if(!groups.has(sizeKey))groups.set(sizeKey,[]);
      groups.get(sizeKey).push({path:full,name:entry.name,size:stat.size,modified:stat.mtimeMs});
      scanned++;
    }
  }
  const duplicates=[];
  for(const candidates of groups.values()){
    if(candidates.length<2)continue;
    const byHash=new Map();
    for(const file of candidates){
      try{const digest=await hashFile(file.path);if(!byHash.has(digest))byHash.set(digest,[]);byHash.get(digest).push(file)}catch{skipped++}
    }
    for(const [hash,files] of byHash)if(files.length>1)duplicates.push({hash,size:files[0].size,files});
  }
  duplicates.sort((a,b)=>b.size-a.size);
  const reclaimable=duplicates.reduce((sum,g)=>sum+g.size*(g.files.length-1),0);
  return{root:base,scanned,skipped,groups:duplicates,reclaimable};
}
module.exports={findDuplicates,hashFile};
