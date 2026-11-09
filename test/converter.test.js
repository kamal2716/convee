const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {getFormats,convertFile}=require('../src/converter');
test('only offers safe built-in text conversions',()=>{
 const formats=getFormats('txt').map(x=>x.ext);
 assert.deepEqual(formats,['md','html']);
 assert.deepEqual(getFormats('hwp'),[]);
});
test('pretty-prints valid JSON into a new file',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-test-'));
 try{
  const input=path.join(dir,'sample.json');
  await fs.writeFile(input,'{"hello":"world"}');
  const result=await convertFile({input,format:'json'});
  assert.notEqual(result.output,input);
  assert.equal(await fs.readFile(result.output,'utf8'),'{\n  "hello": "world"\n}');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('does not overwrite an existing output',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-test-'));
 try{
  const input=path.join(dir,'notes.txt'),existing=path.join(dir,'notes.md');
  await fs.writeFile(input,'hello');await fs.writeFile(existing,'keep me');
  const result=await convertFile({input,format:'md'});
  assert.notEqual(result.output,existing);
  assert.equal(await fs.readFile(existing,'utf8'),'keep me');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
