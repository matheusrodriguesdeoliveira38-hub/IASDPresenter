const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const os=require('node:os');
const source=fs.readFileSync('electron/main.ts','utf8');
for(const [type,filename,extension] of [['music','pt/song.mp3','.opus'],['covers','cover.bmp','.jpg']]) {
  test('downloads legacy '+filename+' through Workers format fallback',async()=>{
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),'iasd-media-'));
    const calls=[];
    const context={fs,path,Buffer,console,net:{fetch:async url=>{
      calls.push(url);
      return url.endsWith(extension)
        ? {ok:true,status:200,arrayBuffer:async()=>Buffer.from('media')}
        : {ok:false,status:404,body:{cancel:async()=>{}}};
    }}};
    vm.createContext(context);
    const start=source.indexOf('function buildApiUrl(');
    const end=source.indexOf('ipcMain.handle("download-media"',start);
    vm.runInContext(source.slice(start,end),context);
    try {
      const file=path.join(folder,'media');
      assert.equal(await context.performMediaDownload(type,filename,file),true);
      assert.equal(calls.length,2);
      assert.equal(fs.readFileSync(file,'utf8'),'media');
      assert.equal(await context.performMediaDownload(type,filename,file),true);
      assert.equal(calls.length,2);
    }finally{fs.rmSync(folder,{recursive:true,force:true});}
  });
}
