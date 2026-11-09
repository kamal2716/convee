const test=require('node:test');const assert=require('node:assert/strict');
const {formatInfo,extensions}=require('../src/formats/registry');
const {planConversion}=require('../src/engines/route-planner');
test('format registry includes every major screenshot family',()=>{for(const ext of ['heic','psd','pdf','docx','xlsx','pptx','hwp','epub','mp4','flac','srt','7z','ttf','dwg','gltf','geojson'])assert.ok(formatInfo(ext),ext+' missing from catalogue')});
test('format registry has no duplicate extension entries',()=>assert.equal(extensions.length,new Set(extensions).size));
test('route planner reports missing specialist engines instead of claiming readiness',()=>{const status={sharp:{available:true},imagemagick:{available:false},libreoffice:{available:false},pandoc:{available:false},calibre:{available:false},ffmpeg:{available:false},sevenZip:{available:false},gdal:{available:false},assimp:{available:false},blender:{available:false},oda:{available:false},fontforge:{available:false}};assert.equal(planConversion('dwg','dxf',status).available,false);assert.equal(planConversion('mp4','mp3',status).available,false)});
test('route planner exposes native raster route when Sharp is present',()=>{const status={sharp:{available:true}};assert.equal(planConversion('png','webp',status).available,true)});

test('route planner handles CSV as both data and spreadsheet input',()=>{const status={libreoffice:{available:true},data:{available:true}};assert.equal(planConversion('csv','xlsx',status).available,true)});
test('route planner exposes PDF rasterization only with ImageMagick',()=>{const status={imagemagick:{available:true}};assert.equal(planConversion('pdf','png',status).available,true);assert.equal(planConversion('png','pdf',status).available,true)});
test('route planner does not advertise RAR creation or DGN CAD export',()=>{const status={sevenZip:{available:true},oda:{available:true}};assert.equal(planConversion('zip','rar',status).available,false);assert.equal(planConversion('dgn','dwg',status).available,false)});
