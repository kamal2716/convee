const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {getFormats,convertFile}=require('../src/converter');
test('format catalogue includes text conversions and does not claim unsupported HWP routes',()=>{
 const formats=getFormats('txt').map(x=>x.ext);
 assert.ok(formats.includes('md'));
 assert.ok(formats.includes('html'));
 assert.ok(formats.includes('htm'));
 assert.equal(getFormats('hwp').length,0);
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

const {PDFDocument}=require('pdf-lib');
const {pdfOperation}=require('../src/converter');
test('merge PDFs locally and preserve page count',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-pdf-'));
 try{const inputs=[];for(let i=0;i<2;i++){const d=await PDFDocument.create();d.addPage();const p=path.join(dir,'in'+i+'.pdf');await fs.writeFile(p,await d.save());inputs.push(p)}const output=path.join(dir,'merged.pdf');const result=await pdfOperation({operation:'merge',inputs,output});const merged=await PDFDocument.load(await fs.readFile(result.output));assert.equal(merged.getPageCount(),2)}finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('extract selected PDF page ranges',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-pdf-'));
 try{const d=await PDFDocument.create();d.addPage();d.addPage();d.addPage();const input=path.join(dir,'three.pdf');await fs.writeFile(input,await d.save());const output=path.join(dir,'extract.pdf');await pdfOperation({operation:'extract',inputs:[input],output,pages:'1,3'});const result=await PDFDocument.load(await fs.readFile(output));assert.equal(result.getPageCount(),2)}finally{await fs.rm(dir,{recursive:true,force:true})}
});

const sharp=require('sharp');
test('visual crop coordinates produce a cropped raster output',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-crop-'));
 try{
  const input=path.join(dir,'source.png');
  await sharp({create:{width:100,height:80,channels:3,background:'#ff0000'}}).png().toFile(input);
  const result=await convertFile({input,format:'png',crop:{left:.25,top:.25,width:.5,height:.5}});
  const meta=await sharp(result.output).metadata();
  assert.equal(meta.width,50);assert.equal(meta.height,40);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('Markdown is rendered to HTML by the built-in route',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-md-'));
 try{
  const input=path.join(dir,'notes.md');await fs.writeFile(input,'# Hello\n\n**Convee** works.');
  const result=await convertFile({input,format:'html'});
  const html=await fs.readFile(result.output,'utf8');
  assert.ok(html.includes('<h1>Hello</h1>'));assert.ok(html.includes('<strong>Convee</strong>'));
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('CSV converts to JSON through the public conversion API',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-csv-'));
 try{
  const input=path.join(dir,'rows.csv');await fs.writeFile(input,'name,city\nAda,Chennai\n');
  const result=await convertFile({input,format:'json'});
  const rows=JSON.parse(await fs.readFile(result.output,'utf8'));
  assert.equal(rows[0].city,'Chennai');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});

test('rotate PDF pages clockwise without changing page count',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-pdf-'));
 try{const d=await PDFDocument.create();d.addPage();const input=path.join(dir,'source.pdf');await fs.writeFile(input,await d.save());const output=path.join(dir,'rotated.pdf');await pdfOperation({operation:'rotate',inputs:[input],output,rotation:90});const result=await PDFDocument.load(await fs.readFile(output));assert.equal(result.getPageCount(),1);assert.equal(result.getPage(0).getRotation().angle,90)}finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('add page numbers to every PDF page',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'convee-pdf-'));
 try{const d=await PDFDocument.create();d.addPage();d.addPage();const input=path.join(dir,'source.pdf');await fs.writeFile(input,await d.save());const output=path.join(dir,'numbered.pdf');const result=await pdfOperation({operation:'number',inputs:[input],output});const numbered=await PDFDocument.load(await fs.readFile(result.output));assert.equal(numbered.getPageCount(),2);assert.ok(numbered.getPage(0).getSize().height>0)}finally{await fs.rm(dir,{recursive:true,force:true})}
});
