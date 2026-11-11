// Versioned share codes contain only the planner settings, never browser storage.
// Codes may be used directly or placed in a URL fragment as #plan=<code>.
const PREFIX='hp1';
const MAX_JSON_BYTES=2*1024*1024;
const MAX_CODE_CHARS=3*1024*1024;
const MAX_DEPTH=40;
const MAX_NODES=200000;
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});

function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}

export function validateSharePlan(value){
 if(!isObject(value)||!isObject(value.facilities)||!isObject(value.modules)||!Array.isArray(value.priorities))throw new Error('Invalid plan format');
 for(const key of ['disabled','notes','daily','custom','roster'])if(key in value&&!Array.isArray(value[key]))throw new Error('Invalid plan format');
 for(const key of ['power','stock','targets','workerCounts','familyCounts','dailyRewards','dailyFuture'])if(key in value&&!isObject(value[key]))throw new Error('Invalid plan format');
 if(value.priorities.some(p=>!isObject(p)||typeof p.id!=='string'||typeof p.enabled!=='boolean'))throw new Error('Invalid plan format');
 for(const facility of Object.values(value.facilities))if(!isObject(facility)||('groups' in facility&&(!Array.isArray(facility.groups)||facility.groups.some(group=>!isObject(group)))))throw new Error('Invalid plan format');
 const stack=[[value,0]];let nodes=0;
 while(stack.length){
  const [node,depth]=stack.pop();
  if(++nodes>MAX_NODES||depth>MAX_DEPTH)throw new Error('Plan is too complex');
  if(node&&typeof node==='object')for(const [key,child] of Object.entries(node)){
   if(key==='__proto__'||key==='constructor'||key==='prototype')throw new Error('Invalid plan property');
   stack.push([child,depth+1]);
  }
 }
 return value;
}

function base64url(bytes){
 let binary='';
 for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function unbase64url(value){
 if(!value||!/^[A-Za-z0-9_-]+$/.test(value)||value.length%4===1)throw new Error('Invalid share code');
 const padded=value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4);
 let binary;try{binary=atob(padded)}catch{throw new Error('Invalid share code')}
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function transform(bytes,stream){
 const reader=new Blob([bytes]).stream().pipeThrough(stream).getReader();
 const chunks=[];let total=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_JSON_BYTES){await reader.cancel();throw new Error('Plan is too large')}chunks.push(value)}
 }finally{reader.releaseLock()}
 const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}return result;
}

export async function encodeSharePlan(plan,{compress=true}={}){
 validateSharePlan(plan);
 let json;try{json=JSON.stringify(plan)}catch{throw new Error('Invalid plan format')}
 const raw=encoder.encode(json);if(raw.length>MAX_JSON_BYTES)throw new Error('Plan is too large');
 let kind='j',bytes=raw;
 if(compress&&typeof globalThis.CompressionStream==='function'){
  try{const compressed=await transform(raw,new CompressionStream('gzip'));if(compressed.length<raw.length){kind='g';bytes=compressed}}catch{/* Raw format works without compression support. */}
 }
 const code=PREFIX+kind+base64url(bytes);
 if(code.length>MAX_CODE_CHARS)throw new Error('Plan is too large');
 return code;
}

export function sharePlanFromHash(hash){
 const fragment=String(hash||'').replace(/^#/,'');
 return new URLSearchParams(fragment).get('plan');
}

export async function decodeSharePlan(input){
 const text=String(input||'').trim();
 let code=text.startsWith('#')?sharePlanFromHash(text):text;
 if(/^https?:\/\//i.test(text)){try{code=sharePlanFromHash(new URL(text).hash)}catch{throw new Error('Invalid share code')}}
 if(!code||code.length>MAX_CODE_CHARS||!code.startsWith(PREFIX))throw new Error('Invalid share code');
 const kind=code[3];if(kind!=='j'&&kind!=='g')throw new Error('Unsupported share code');
 let bytes=unbase64url(code.slice(4));
 if(kind==='g'){
  if(typeof globalThis.DecompressionStream!=='function')throw new Error('Compressed share codes are not supported by this browser');
  try{bytes=await transform(bytes,new DecompressionStream('gzip'))}catch(error){if(error.message==='Plan is too large')throw error;throw new Error('Invalid compressed share code')}
 }
 if(bytes.length>MAX_JSON_BYTES)throw new Error('Plan is too large');
 let value;try{value=JSON.parse(decoder.decode(bytes))}catch{throw new Error('Invalid share code')}
 return validateSharePlan(value);
}
