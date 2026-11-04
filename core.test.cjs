const assert = require('node:assert/strict');
const c = require('./core.js');
// Optical forward/inverse round trips, including signed principal-plane separation.
for(const basis of ['film','principal']) for(const f of [65,90,150,300]) for(const plane of [-20,0,20]) for(const e of [.1,1,5,14]) {
  const d=c.distanceForExtension(f,e,basis,plane);
  assert.ok(Math.abs(c.extension(f,d,basis,plane)-e)<1e-8);
}
assert.equal(c.extension(100,1,'principal'),10000/900);
assert.equal(c.extension(90,Infinity,'film'),0);
assert.ok(Number.isNaN(c.extension(150,.5,'film')));
assert.deepEqual(c.parseDistances('1，2 3 inf 无穷远'),[Infinity,3,2,1]);
for(const input of ['1 foo','0','-2','']) assert.throws(()=>c.parseDistances(input));
const pts=c.parseCalibration('∞,0\n10,10\n2,50',180);
assert.equal(c.interpolate(pts,5),20);
assert.ok(Number.isNaN(c.interpolate(pts,1)));
for(const input of ['∞,0\n10,20\n2,10','∞,0\n2,181','10,0\n2,40','∞,0\n2,30\n2,40']) assert.throws(()=>c.parseCalibration(input,180));
const p={focal:90,min:17,max:31,rotation:180,infinity:17,circumference:220,height:12,overlap:5,ruler:100,plane:0,mode:'theory',basis:'film',distances:'1,2,3,4,5,10,∞'};
const r=c.calculate(p),one=r.rows.find(x=>x.d===1);
assert.equal(r.valid.length,7);
assert.ok(Math.abs(one.e-10)<1e-8); // 1 m film distance, 90 mm thin lens => v=100 mm
assert.ok(Math.abs(one.angle-128.5714285714)<1e-8);
assert.ok(Math.abs(one.arc-78.5714285714)<1e-8);
assert.equal(c.calculate({...p,focal:300}).rows.find(x=>x.d===1).status,'光学模型无解');
assert.equal(c.calculate({...p,max:18}).rows.find(x=>x.d===1).status,'超出桶行程');
assert.equal(c.calculate({...p,rotation:720}).turns,2);
assert.equal(c.calculate({...p,circumference:30,overlap:0}).printWidth,106);
assert.ok(Math.abs(c.calculate({...p,ruler:98}).compensation-100/98)<1e-10);
assert.throws(()=>c.calculate({...p,infinity:31}));
assert.throws(()=>c.calculate({...p,max:17}));
console.log('All optical, calibration, mechanical range, multi-turn and print dimension tests passed.');
