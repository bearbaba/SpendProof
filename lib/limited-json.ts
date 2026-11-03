export class BoundedBodyError extends Error {
  constructor(public readonly status:400|413, message:string) { super(message); }
}

export async function readBoundedJson(request:Request, maxBytes=6_000):Promise<unknown> {
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared) && declared>maxBytes) {
    throw new BoundedBodyError(413,'JSON request exceeds the allowed size.');
  }
  if(!request.body) throw new BoundedBodyError(400,'Request body is required.');
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];
  let bytes=0;
  try {
    for (;;) {
      const part=await reader.read();
      if(part.done)break;
      bytes+=part.value.byteLength;
      if(bytes>maxBytes) {
        await reader.cancel('Request is too large.');
        throw new BoundedBodyError(413,'JSON request exceeds the allowed size.');
      }
      chunks.push(part.value);
    }
  }catch(error) {
    if(error instanceof BoundedBodyError)throw error;
    throw new BoundedBodyError(400,'Malformed request stream.');
  }finally {
    reader.releaseLock();
  }
  const combined=new Uint8Array(bytes);
  let offset=0;
  for(const part of chunks) {combined.set(part,offset);offset+=part.byteLength;}
  try {
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(combined));
  }catch {
    throw new BoundedBodyError(400,'Invalid JSON body.');
  }
}
