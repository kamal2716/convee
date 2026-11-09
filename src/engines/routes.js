// Explicit engine routes prevent the UI from promising unsupported format pairs.
const any=()=>true;
const engineRoutes=[
 {id:'image-raster',engine:'sharp',from:['images'],to:['images'],extensions:(a,b)=>!['ico','icns','jxl','psd','psb','dng','cr2','cr3','nef','arw','rw2','orf','pef','x3f','svg','svgz','emf','wmf','ai','eps','ps','cdr','vsd','cgm','odd','fodg'].includes(a)&&!['ico','icns','jxl','psd','psb','dng','cr2','cr3','nef','arw','rw2','orf','pef','x3f','svg','svgz','emf','wmf','ai','eps','ps','cdr','vsd','cgm','odd','fodg'].includes(b)},
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
 {id:'data',engine:'python',from:['data'],to:['data'],extensions:(a,b)=>['csv','json','xml','yaml','yml','toml'].includes(a)&&['csv','json','xml','yaml','yml','toml'].includes(b)}
];
module.exports={engineRoutes};
