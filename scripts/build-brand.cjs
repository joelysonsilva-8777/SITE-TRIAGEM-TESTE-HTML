const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const temporary = path.join(root, '.tmp'); fs.mkdirSync(temporary,{recursive:true});
process.env.TEMP=temporary; process.env.TMP=temporary;
(async()=>{
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try {
  const page=await browser.newPage();
  const svg=fs.readFileSync(path.join(root,'assets/brand/mark.svg'),'utf8');
  for(const size of [1024,256,48]) {
   const png=await page.evaluate(async({svg,size})=>{const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#F3F6F9';ctx.fillRect(0,0,size,size);const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(svg);await img.decode();ctx.drawImage(img,size*.10,size*.19,size*.80,size*.65);return canvas.toDataURL('image/png').split(',')[1];},{svg,size});
   const bytes=Buffer.from(png,'base64');
   if(size===1024) fs.writeFileSync(path.join(root,'medfast-native/assets/icon.png'),bytes);
   if(size===48) fs.writeFileSync(path.join(root,'medfast-native/assets/favicon.png'),bytes);
   if(size===256) {
    const build=path.join(root,'medfast-desktop/build');fs.mkdirSync(build,{recursive:true});fs.writeFileSync(path.join(build,'icon.png'),bytes);
    const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(bytes.length,14);ico.writeUInt32LE(22,18);fs.writeFileSync(path.join(build,'icon.ico'),Buffer.concat([ico,bytes]));
   }
  }
 } finally {await browser.close();}
 console.log('Ícones MedFast gerados para celular e Windows.');
})().catch(e=>{console.error(e);process.exitCode=1;});
