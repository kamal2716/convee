// Canonical format inventory. A format is listed here only once; engines decide which
// input/output pairs are executable on this machine.
const groups = {
 images: 'jpg jpeg png webp avif tiff bmp gif apng ico icns jxl psd psb tga ppm heic heif dng cr2 cr3 nef arw rw2 orf pef x3f svg svgz emf wmf ai eps ps cdr vsd cgm odd fodg',
 documents: 'pdf doc docx docm dot dotx odt ott rtf wps wpd pages txt md html htm xml json csv tex org rst epub mobi azw3 azw kfx fb2 cbz cbr djvu hwp hwpx xps oxps',
 spreadsheets: 'xls xlsx xlsm xlsb xlt xltx xltm ods ots csv tsv dif fods numbers',
 presentations: 'ppt pptx pptm pps ppsx pot potx odp otp fodp key',
 video: 'mp4 mov mkv webm avi wmv flv mpeg mpg m4v 3gp ogv vob ts mts m2ts',
 audio: 'mp3 wav aac ogg opus flac m4a wma aiff aif ape alac amr ac3 eac3 dts caf au',
 subtitles: 'srt ass ssa vtt sami smi lrc ttml mcc scc',
 archives: 'zip 7z rar tar gz bz2 xz zst lz lzma cab iso arj lzh',
 fonts: 'ttf otf woff woff2 eot fon fnt pfb pfa',
 cad: 'dwg dxf dgn dwt dws',
 data: 'csv json xml yaml yml toml sql db sqlite parquet avro orc',
 models3d: 'gltf glb obj stl ply fbx 3ds dae blend usd usdz abc step stp iges igs',
 gis: 'shp geojson kml kmz gpkg gpx tif vrt csv'
};
const labels = Object.fromEntries(Object.entries(groups).flatMap(([category,list])=>list.split(' ').map(ext=>[ext,{ext,category}])));
module.exports={groups,labels,extensions:Object.keys(labels),formatInfo:ext=>labels[String(ext||'').toLowerCase()]||null};
