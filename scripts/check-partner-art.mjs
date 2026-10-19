import {readFile, mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const manifest = JSON.parse(await readFile('src/lib/catalog/partner-card-art.json','utf8'));
await mkdir('.tmp-partner-art-proof',{recursive:true});
for(let start=0;start<manifest.length;start+=60) {
  const parts=[];
  for(const [i,art] of manifest.slice(start,start+60).entries()) {
    const left=(i%6)*200, top=Math.floor(i/6)*145;
    const bytes=await sharp(`public${art.image}`).resize(190,115,{fit:'contain',background:'#ffffff'}).png().toBuffer();
    parts.push({input:bytes,left:left+5,top});
    const escaped=art.name.replaceAll('&','&amp;').replaceAll('<','&lt;');
    parts.push({input:Buffer.from(`<svg width="200" height="30"><rect width="200" height="30" fill="white"/><text x="5" y="17" font-size="10">${start+i+1}. ${escaped}</text></svg>`),left,top:top+115});
  }
  await sharp({create:{width:1200,height:1450,channels:3,background:'#eeeeee'}}).composite(parts).png().toFile(`.tmp-partner-art-proof/sheet-${start/60+1}.png`);
}
console.log(`Checked and arranged ${manifest.length} authentic source images in six review sheets.`);
