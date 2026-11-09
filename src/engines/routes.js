// Explicit engine routes prevent the UI from promising unsupported format pairs.
const any=()=>true;
const engineRoutes=[
 {id:'text-basic',engine:'text',from:['documents'],to:['documents'],extensions:(a,b)=>['txt','md','html','htm'].includes(a)&&['txt','md','html','htm'].includes(b)},
 {id:'structured-data',engine:'data',from:['data'],to:['data'],extensions:(a,b)=>['csv','tsv','json','xml','yaml','yml','toml'].includes(a)&&['csv','tsv','json','xml','yaml','yml','toml'].includes(b)},
 {id:'image-raster',engine:'sharp',from:['images'],to:['images'],extensions:(a,b)=>['jpg','jpeg','png','webp','avif','tiff'].includes(a)&&['jpg','jpeg','png','webp','avif','tiff'].includes(b)},
 {id:'image-extended',engine:'imagemagick',from:['images'],to:['images'],extensions:any},
 {id:'office',engine:'libreoffice',from:['documents','spreadsheets','presentations'],to:['documents','spreadsheets','presentations'],extensions:any},
 {id:'pandoc',engine:'pandoc',from:['documents'],to:['documents'],extensions:any},
 {id:'ebooks',engine:'calibre',from:['documents'],to:['documents'],extensions:(a,b)=>['epub','mobi','azw3','azw','kfx','fb2','txt','pdf','docx','html','rtf','odt'].includes(a)&&['epub','mobi','azw3','azw','kfx','fb2','txt','pdf','docx','html','rtf','odt'].includes(b)},
 {id:'media',engine:'ffmpeg',from:['video','audio','subtitles'],to:['video','audio','subtitles'],extensions:any},
 {id:'archive',engine:'sevenZip',from:['archives'],to:['archives'],extensions:any},
 {id:'gis',engine:'gdal',from:['gis'],to:['gis'],extensions:any},
 {id:'cad',engine:'oda',from:['cad'],to:['cad'],extensions:(a,b)=>['dwg','dxf','dgn'].includes(a)&&['dwg','dxf','dgn'].includes(b)},
 {id:'3d',engine:'assimp',from:['models3d'],to:['models3d'],extensions:(a,b)=>!['blend','usd','usdz','abc'].includes(a)&&!['blend','usd','usdz','abc'].includes(b)},
 {id:'3d-blender',engine:'blender',from:['models3d'],to:['models3d'],extensions:any},
 {id:'fonts',engine:'fontforge',from:['fonts'],to:['fonts'],extensions:any},

];
module.exports={engineRoutes};
