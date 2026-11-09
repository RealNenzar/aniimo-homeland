import { optimize } from './solver.js';
self.onmessage=async e=>{try{const result=await optimize(e.data.catalog,e.data.state,key=>self.postMessage({progress:key}));self.postMessage({result});}catch(error){self.postMessage({error:error.message});}};
