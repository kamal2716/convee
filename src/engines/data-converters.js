const fs=require('node:fs/promises'),path=require('node:path');
const YAML=require('yaml'),TOML=require('@iarna/toml');
const {XMLParser,XMLBuilder}=require('fast-xml-parser');
const {parse}=require('csv-parse/sync');const {stringify}=require('csv-stringify/sync');
const structured=new Set(['json','yaml','yml','toml','xml','csv','tsv']);
function parseCsv(text,delimiter=','){return parse(text,{columns:true,skip_empty_lines:true,relax_column_count:true,delimiter,cast:false})}
function serializeCsv(rows,delimiter=','){if(!Array.isArray(rows))throw new Error('CSV output requires an array of records');return stringify(rows,{header:true,delimiter})}
async function readStructured(file,ext){const s=await fs.readFile(file,'utf8');switch(ext){case'json':return JSON.parse(s);case'yaml':case'yml':return YAML.parse(s);case'toml':return TOML.parse(s);case'xml':return new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',parseTagValue:false}).parse(s);case'csv':return parseCsv(s);case'tsv':return parseCsv(s,'\t');default:throw new Error('Unsupported structured input: '+ext)}}
async function writeStructured(file,ext,value){let out;switch(ext){case'json':out=JSON.stringify(value,null,2);break;case'yaml':case'yml':out=YAML.stringify(value);break;case'toml':out=TOML.stringify(value);break;case'xml':out='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLBuilder({ignoreAttributes:false,attributeNamePrefix:'@_',format:true}).build(value);break;case'csv':out=serializeCsv(value);break;case'tsv':out=serializeCsv(value,'\t');break;default:throw new Error('Unsupported structured output: '+ext)}await fs.writeFile(file,out,'utf8')}
async function convertStructured({input,output,from,to}){if(!structured.has(from)||!structured.has(to))throw new Error('Unsupported structured conversion pair');const value=await readStructured(input,from);await writeStructured(output,to,value);return{output,engine:'Convee data adapters'}}
module.exports={structured,readStructured,writeStructured,convertStructured};
