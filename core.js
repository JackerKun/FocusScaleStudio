/* Independent optical/mechanical model. All internal lengths in mm; distances input in m. */
(function(root){
'use strict';
function extension(f,d,basis,plane=0){
 if(d===Infinity)return 0;
 const D=d*1000;
 if(!(f>0&&D>0))return NaN;
 if(basis==='principal')return D>f?f*f/(D-f):NaN;
 const s=D-plane;
 if(s<4*f)return NaN;
 return 2*s*f/(s+Math.sqrt(s*(s-4*f)))-f;
}
function distanceForExtension(f,e,basis,plane=0){if(e<=0)return Infinity;const v=f+e,u=f*v/e;return (basis==='principal'?u:u+v+plane)/1000;}
function parseDistance(s){if(/^(∞|inf(?:inity)?|无穷远|无穷)$/i.test(s.trim()))return Infinity;const n=Number(s);return s.trim()&&Number.isFinite(n)&&n>0?n:NaN;}
function parseDistances(s){const a=s.trim().split(/[,，;；\s]+/).filter(Boolean).map(parseDistance);if(!a.length||a.some(Number.isNaN))throw Error('距离请输入大于 0 的米数，或 ∞ / inf / 无穷远。');if(a.length>80)throw Error('一次最多输入 80 个距离。');return [...new Set([Infinity,...a])].sort((a,b)=>b-a);}
function parseCalibration(s,maxAngle){const pts=s.trim().split(/\n/).filter(x=>x.trim()).map((line,i)=>{const parts=line.trim().split(/[,，;；\s]+/);const d=parseDistance(parts[0]||'');const angle=Number(parts[1]);if(parts.length!==2||Number.isNaN(d)||!Number.isFinite(angle)||angle<0||angle>maxAngle+1e-7)throw Error('实测第 '+(i+1)+' 行格式或角度无效；请填「距离, 累计角度」。');return{d,q:d===Infinity?0:1/d,angle};}).sort((a,b)=>a.q-b.q);
 if(pts.length<2||pts[0].d!==Infinity||pts[0].angle!==0)throw Error('实测至少需要 ∞, 0 和一个有限距离校准点。');
 for(let i=1;i<pts.length;i++)if(pts[i].q<=pts[i-1].q||pts[i].angle<=pts[i-1].angle)throw Error('实测距离不能重复；距离越近，正累计角度必须越大。');return pts;}
function interpolate(pts,d){const q=d===Infinity?0:1/d;if(q>pts[pts.length-1].q+1e-10)return NaN;for(let i=1;i<pts.length;i++)if(q<=pts[i].q+1e-10){const a=pts[i-1],b=pts[i];return a.angle+(b.angle-a.angle)*(q-a.q)/(b.q-a.q);}return NaN;}
function calculate(p){
 for(const k of ['focal','min','max','rotation','infinity','circumference','height','overlap','ruler','plane'])if(!Number.isFinite(p[k]))throw Error('请完整填写所有数值参数。');
 if(p.focal<1||p.focal>2000)throw Error('有效焦距须在 1–2000 mm 之间。');
 if(p.min<0||p.max<=p.min||p.infinity<p.min||p.infinity>=p.max)throw Error('桶长度须满足：0 ≤ 最短长度 ≤ 无穷远长度 < 最长长度。');
 if(p.rotation<=0||p.rotation>3600)throw Error('全行程角度须大于 0 且不超过 3600°。');
 if(p.circumference<30||p.circumference>1000||p.height<8||p.height>24||p.overlap<0||p.overlap>15||p.ruler<80||p.ruler>120)throw Error('请检查周长（30–1000）、高度（8–24）、余量（0–15）和校验尺（80–120 mm）。');
 const slope=(p.max-p.min)/p.rotation,available=p.max-p.infinity,maxAngle=available/slope;
 const pts=p.mode==='measured'?parseCalibration(p.calibration,maxAngle):null;
 const rows=parseDistances(p.distances).map(d=>{let e,angle,status='可用';if(pts){angle=interpolate(pts,d);e=angle*slope;if(!Number.isFinite(angle))status='超出实测范围';}else{e=extension(p.focal,d,p.basis,p.plane);angle=e/slope;if(!Number.isFinite(e))status='光学模型无解';else if(e>available+1e-7)status='超出桶行程';}return{d,e,angle,arc:angle*p.circumference/360,valid:status==='可用',status};});
 const valid=rows.filter(x=>x.valid);const maxValidAngle=Math.max(0,...valid.map(x=>x.angle));const turns=Math.max(1,Math.floor((maxValidAngle+1e-8)/360)+1);
 const compensation=100/p.ruler;const printWidth=Math.max(p.circumference+p.overlap+6,106)*compensation;
 return{rows,valid,slope,available,maxAngle,turns,compensation,printWidth,near:pts?pts[pts.length-1].d:distanceForExtension(p.focal,Math.min(available,p.basis==='film'?p.focal:Infinity),p.basis,p.plane)};
}
const api={extension,distanceForExtension,parseDistances,parseCalibration,interpolate,calculate};root.FocusCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
