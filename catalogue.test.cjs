const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={window:null};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'lenses.js'),'utf8'),ctx);
const L=ctx.LENSES,C=ctx.LensCatalog;
assert.equal(new Set(L.map(l=>l.id)).size,L.length,'Lens identities must be unique');
for(const l of L){assert.ok(ctx.LENS_SOURCES[l.source]);assert.ok(l.f>0&&l.f<=2000&&l.aperture>0);}
const matches=q=>L.filter(l=>C.matches(l,q));
assert.equal(matches('施耐德47').length,3);
assert.equal(matches('施耐德47 XL').length,1);
assert.equal(matches('schneider47').length,3);
assert.equal(matches('施耐德47 f/8').length,1);
assert.ok(matches('富士65').length>0);
assert.ok(matches('罗敦司得35').length>0);
assert.ok(matches('尼康150').length>0);
assert.ok(matches('玛米亚127').length>0);
assert.ok(matches('Nikkor 150').length>0);
assert.equal(matches('不存在的镜头').length,0);
// Previous profiles must continue to resolve the same stable catalogue IDs.
assert.ok(L.some(l=>l.id==='Schneider Super-Angulon 90mm f/5.6'));
assert.ok(L.some(l=>l.id==='Nikon Nikkor-W 150mm f/5.6'));
console.log(`Catalogue checks passed: ${L.length} unique lenses, Chinese search, 47mm variants, sources and saved-profile compatibility.`);
