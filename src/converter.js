const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

const imageFormats = ['png','jpg','jpeg','webp','avif','tiff','gif'];
const textFormats = ['txt','md','html','htm','json','csv','xml'];
const labels = { png:'PNG image', jpg:'JPEG image', jpeg:'JPEG image', webp:'WebP image', avif:'AVIF image', tiff:'TIFF image', gif:'GIF image', txt:'Plain text', md:'Markdown', html:'HTML', json:'JSON', csv:'CSV', xml:'XML', pdf:'PDF' };
function getFormats(ext) {
  ext = (ext || '').toLowerCase();
  if (imageFormats.includes(ext)) return imageFormats.filter(x => x !== ext).map(x => ({ ext:x, label:labels[x], ready:true }));
  if (textFormats.includes(ext)) return textFormats.filter(x => x !== ext).map(x => ({ ext:x, label:labels[x], ready:true }));
  if (ext === 'pdf') return [{ ext:'pdf', label:'PDF (optimize / rewrite)', ready:true }, { ext:'txt', label:'Text extraction', ready:false, note:'Requires a PDF text engine' }];
  const office = ['doc','docx','odt','rtf','xls','xlsx','ods','ppt','pptx','odp','hwp','hwpx'];
  if (office.includes(ext)) return [{ ext:'pdf', label:'PDF', ready:false, note:'Install LibreOffice for office conversions' }, { ext:'docx', label:'DOCX', ready:false, note:'Install LibreOffice for office conversions' }];
  return [{ ext:'pdf', label:'PDF', ready:false, note:'An external conversion engine is required' }];
}
async function convertFile({ input, format, outputDir, quality = 88 }) {
  const ext = path.extname(input).slice(1).toLowerCase();
  const target = format.toLowerCase();
  const base = path.basename(input, path.extname(input));
  const folder = outputDir || path.dirname(input);
  await fs.mkdir(folder, { recursive:true });
  let output = path.join(folder, base + '.' + target);
  if (output === input) output = path.join(folder, base + '-converted.' + target);
  if (imageFormats.includes(ext) && imageFormats.includes(target)) {
    let pipeline = sharp(input, { animated: target === 'gif' }).rotate();
    if (target === 'jpg' || target === 'jpeg') pipeline = pipeline.jpeg({ quality:Number(quality), mozjpeg:true });
    else if (target === 'png') pipeline = pipeline.png({ compressionLevel:9 });
    else if (target === 'webp') pipeline = pipeline.webp({ quality:Number(quality) });
    else if (target === 'avif') pipeline = pipeline.avif({ quality:Number(quality) });
    else if (target === 'tiff') pipeline = pipeline.tiff({ quality:Number(quality) });
    else if (target === 'gif') throw new Error('GIF output is not supported by this build of the image engine yet.');
    await pipeline.toFile(output);
    return { output, message:'Image converted successfully' };
  }
  if (textFormats.includes(ext) && textFormats.includes(target)) {
    const raw = await fs.readFile(input, 'utf8');
    let converted = raw;
    if (target === 'json') { converted = JSON.stringify(JSON.parse(raw), null, 2); }
    if (target === 'html' && ext !== 'html' && ext !== 'htm') converted = '<!doctype html><meta charset="utf-8"><pre>' + escapeHtml(raw) + '</pre>';
    if ((target === 'txt' || target === 'md') && (ext === 'html' || ext === 'htm')) converted = raw.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
    await fs.writeFile(output, converted, 'utf8');
    return { output, message:'Document converted successfully' };
  }
  if (ext === 'pdf' && target === 'pdf') {
    const bytes = await fs.readFile(input);
    const doc = await PDFDocument.load(bytes);
    const saved = await doc.save({ useObjectStreams:true });
    await fs.writeFile(output, saved);
    return { output, message:'PDF rewritten successfully' };
  }
  throw new Error('This format pair is not enabled yet. For Office, HWP, video, audio, CAD and specialist formats, connect a compatible local engine such as LibreOffice, FFmpeg or ImageMagick.');
}
function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
module.exports = { convertFile, getFormats };
