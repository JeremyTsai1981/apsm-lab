/* APSM 首頁：頭部爆震波互動示意（three.js 即時算圖，仿有限元素／CFD 後處理畫面）
   程序化示意模型：分層（頭皮、顱骨、腦脊髓液、腦）與網格皆為程式產生，非 GHBMC 網格；
   色階為示意用的相對值，不是分析結果。 */
import * as THREE from 'three';

const box = document.getElementById('head3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 700;
const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(small ? 1.5 : 2, devicePixelRatio || 1));
renderer.localClippingEnabled = true;
box.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05080f);
const cam = new THREE.PerspectiveCamera(30, 16 / 10, 0.1, 100); cam.position.set(0, 0.9, 10.8); cam.lookAt(0, -0.3, 0);
const root = new THREE.Group(); scene.add(root);
scene.add(new THREE.HemisphereLight(0xdfeeff, 0x1a2230, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(3, 5, 6); scene.add(sun);

const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const h3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y, z) { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = x - X, v = y - Y, w = z - Z, f = t => t * t * (3 - 2 * t), a = f(u), b = f(v), c = f(w), L = (p, q, t) => p + (q - p) * t;
  return L(L(L(h3(X, Y, Z), h3(X + 1, Y, Z), a), L(h3(X, Y + 1, Z), h3(X + 1, Y + 1, Z), a), b), L(L(h3(X, Y, Z + 1), h3(X + 1, Y, Z + 1), a), L(h3(X, Y + 1, Z + 1), h3(X + 1, Y + 1, Z + 1), a), b), c); }
function gyri(x, y, z) { const wx = x + 0.35 * (vn(x * 2.1, y * 2.1, z * 2.1) - 0.5), wy = y + 0.35 * (vn(x * 2.1 + 9, y * 2.1, z * 2.1) - 0.5), wz = z + 0.35 * (vn(x * 2.1, y * 2.1 + 5, z * 2.1) - 0.5);
  return ss(0.02, 0.34, Math.abs(vn(wx * 5.2, wy * 5.2, wz * 5.2) - 0.5) * 1.44 + Math.abs(vn(wx * 9.5 + 3, wy * 9.5, wz * 9.5) - 0.5) * 0.56); }
function headShape(v, sc) {
  const x = v.x, y = v.y, z = v.z, o = new THREE.Vector3(x * 0.79, y, z * 0.97);
  if (y < 0.12) { const k = ss(0.12, -1, y); o.x *= 1 - 0.30 * k; o.z = o.z * (1 - 0.20 * k) + 0.17 * k; o.y *= 1 + 0.24 * k; }
  if (z > 0) {
    o.z += 0.20 * Math.exp(-(x * x) / 0.011 - (y + 0.20) ** 2 / 0.028) * z;
    o.z += 0.035 * Math.exp(-((y - 0.13) ** 2) / 0.006 - (x * x) / 0.25);
    o.z -= 0.055 * Math.exp(-((Math.abs(x) - 0.30) ** 2) / 0.011 - (y - 0.02) ** 2 / 0.005) * z;
    o.z += 0.035 * Math.exp(-(x * x) / 0.03 - (y + 0.50) ** 2 / 0.004);
    o.z += 0.075 * Math.exp(-(x * x) / 0.05 - (y + 0.80) ** 2 / 0.02);
  }
  o.x += Math.sign(x) * 0.10 * Math.exp(-((Math.abs(x) - 0.95) ** 2) / 0.02 - (y + 0.08) ** 2 / 0.03 - (z + 0.05) ** 2 / 0.02);
  if (z < 0 && y < -0.25) o.z *= 1 - 0.28 * ss(-0.25, -1, y);
  return o.multiplyScalar(1.55 * sc);
}
// 經緯網格 → 四邊形元素邊線（每 k 條取一條）
function quadEdges(geo, sw, shh, k) { const p = geo.attributes.position, a = [], id = (ix, iy) => iy * (sw + 1) + ix, push = (i, j) => { a.push(p.getX(i), p.getY(i), p.getZ(i), p.getX(j), p.getY(j), p.getZ(j)); };
  for (let iy = k; iy < shh; iy += k) for (let ix = 0; ix < sw; ix++) push(id(ix, iy), id(ix + 1, iy));
  for (let ix = 0; ix < sw; ix += k) for (let iy = 0; iy < shh; iy++) push(id(ix, iy), id(ix, iy + 1));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g; }

const CUT = 0.0, clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), CUT), clipOn = [clip];
const edgeMat = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, clippingPlanes: clipOn });
const capGeo = new THREE.PlaneGeometry(6, 6);
const clipped = [], caps = [], stencils = [], shellGroup = new THREE.Group(); root.add(shellGroup);
// 可剖切的封閉殼層：頭皮、顱骨、顱腔（腦脊髓液）
function layer(geo, color, order, sw, shh, k, edgeCol) {
  const mat = new THREE.MeshLambertMaterial({ color, clippingPlanes: clipOn, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); shellGroup.add(mesh); clipped.push(mat);
  if (sw) { const e = new THREE.LineSegments(quadEdges(geo, sw, shh, k), edgeMat(edgeCol, 0.5)); shellGroup.add(e); clipped.push(e.material); }
  const sm = (side, op) => { const m = new THREE.MeshBasicMaterial({ side, clippingPlanes: clipOn, depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op });
    const s = new THREE.Mesh(geo, m); s.renderOrder = order; shellGroup.add(s); stencils.push(s); };
  sm(THREE.BackSide, THREE.IncrementWrapStencilOp); sm(THREE.FrontSide, THREE.DecrementWrapStencilOp);
  const cm = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(color) } }, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp,
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vP; uniform vec3 uC; void main(){ vec2 g=abs(fract(vP*9.)-.5); float l=smoothstep(.44,.5,max(g.x,g.y)); gl_FragColor=vec4(mix(uC*.92,uC*.42,l),1.); }' });
  const cap = new THREE.Mesh(capGeo, cm); cap.rotation.y = Math.PI / 2; cap.position.x = CUT; cap.renderOrder = order + 0.1; shellGroup.add(cap); caps.push(cap);
  return mesh;
}
const SW = small ? 96 : 144, SH = small ? 72 : 108;
const shaped = sc => { const g = new THREE.SphereGeometry(1, SW, SH), p = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const o = headShape(v, sc); p.setXYZ(i, o.x, o.y, o.z); } g.computeVertexNormals(); return g; };
layer(shaped(1), 0xd9a98a, 1, SW, SH, 3, 0x3a2418);                                  // 頭皮
layer(shaped(0.94), 0xe9e4d2, 2, 0, 0, 0, 0);                                         // 顱骨
layer(new THREE.SphereGeometry(1, 64, 48).scale(1.07, 1.05, 1.25).translate(0, 0.34, -0.12), 0x4f8fb8, 3, 0, 0, 0, 0); // 顱腔（腦脊髓液）

// 腦：帶狀色階（仿 FE 後處理）
const U = { uDir: { value: new THREE.Vector3(1, 0, 0) }, uT: { value: 0 }, uEnv: { value: 0 }, uX: { value: -9 }, uA: { value: 0 } };
const JET = 'vec3 jet(float v){ v=clamp(v,0.,1.); vec3 a=vec3(.05,.15,.85),b=vec3(0.,.70,1.),c=vec3(.10,.82,.25),d=vec3(1.,.92,.05),e=vec3(.95,.10,.05); float x=v*4.; return x<1.?mix(a,b,x):x<2.?mix(b,c,x-1.):x<3.?mix(c,d,x-2.):mix(d,e,x-3.); } float band(float v){ return (floor(clamp(v,0.,.999)*10.)+.5)/10.; }';
const brainMat = new THREE.ShaderMaterial({ uniforms: U, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  vertexShader: 'varying vec3 vN,vV,vP; attribute float aAO; varying float vAO; void main(){ vAO=aAO; vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: `varying vec3 vN,vV,vP; varying float vAO; uniform vec3 uDir; uniform float uT,uEnv; ${JET}
    void main(){ vec3 n=normalize(vN); vec3 q=vP-vec3(0.,.42,-.10); float s=dot(q,uDir)/1.05; float t=uT;
      float coup=exp(-pow((s+.9)/.62,2.))*(1.-smoothstep(.25,.7,t));
      float contre=exp(-pow((s-.9)/.6,2.))*smoothstep(.12,.45,t)*(1.-smoothstep(.72,1.,t));
      float deep=exp(-dot(q,q)/.55)*smoothstep(.3,.6,t)*.55;
      float st=clamp((max(coup,contre*.85)+deep*.6+.10*sin(s*7.-t*22.)*(1.-t))*uEnv,0.,1.);
      vec3 L=normalize(vec3(.4,.75,.65)); float d=dot(n,L)*.5+.5;
      vec3 c=jet(band(st))*(d*.75+.3)*mix(.45,1.,vAO);
      gl_FragColor=vec4(c,1.); }` });
const brain = new THREE.Group(); root.add(brain);
function organ(geo, fn, sw, shh, k) { const p = geo.attributes.position, ao = new Float32Array(p.count), v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); ao[i] = fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  geo.setAttribute('aAO', new THREE.BufferAttribute(ao, 1)); geo.computeVertexNormals(); brain.add(new THREE.Mesh(geo, brainMat));
  if (sw) brain.add(new THREE.LineSegments(quadEdges(geo, sw, shh, k), new THREE.LineBasicMaterial({ color: 0x06121e, transparent: true, opacity: 0.55 }))); }
const BW = small ? 144 : 216, BH = small ? 108 : 156;
organ(new THREE.SphereGeometry(1, BW, BH), v => { const g = gyri(v.x, v.y, v.z), fis = Math.exp(-(v.x * v.x) / 0.0035) * ss(-0.35, 0.1, v.y), r = 1 + 0.050 * (g - 0.6) - 0.10 * fis, flat = v.y < -0.3 ? 1 - 0.55 * ss(-0.3, -1, v.y) : 1;
  v.set(v.x * 0.99 * r, v.y * 0.86 * r * flat + 0.42, v.z * 1.24 * r - 0.10); return Math.min(g, 1 - fis); }, BW, BH, 4);
organ(new THREE.SphereGeometry(1, 72, 48), v => { const g = 0.5 + 0.5 * Math.sin(v.y * 46 + 3 * Math.sin(v.x * 4)), r = 1 + 0.025 * (g - 0.5); v.set(v.x * 0.58 * r, v.y * 0.30 * r - 0.40, v.z * 0.42 * r - 0.80); return 0.4 + 0.6 * g; }, 72, 48, 3);
organ(new THREE.CylinderGeometry(0.15, 0.10, 0.75, 24, 8), v => { v.set(v.x, v.y - 0.62, v.z - 0.40 + (v.y + 0.4) * 0.2); return 0.7; }, 0, 0, 0);

// CFD 流場切面：水平面上的空氣超壓（帶狀色階＋歐拉網格線）
const SLICE_Y = -1.0;
const slice = new THREE.Mesh(new THREE.PlaneGeometry(13, 9), new THREE.ShaderMaterial({ uniforms: U, transparent: true, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vP; uniform vec3 uDir; uniform float uX,uA; ${JET}
    void main(){ vec3 P=vec3(vP.x,0.,-vP.y); vec2 q=vec2(P.x/.99,(P.z-.12)/1.24); if(dot(q,q)<1.) discard;
      vec3 dir=normalize(vec3(uDir.x,0.,uDir.z)); float s=dot(P,dir); float nn=length(P-s*dir); float r=length(P.xz);
      float d=uX-s; float inc=d>0.?exp(-d/1.7)*(1.-d/5.):0.;
      float sh=smoothstep(0.,1.2,s)*smoothstep(1.5,.5,nn)*exp(-max(s,0.)/5.); inc*=mix(1.,.42,sh);
      float k=uX+1.35; float refl=k>0.?.75*exp(-pow((r-1.35-k*.55)/.42,2.))*smoothstep(.6,-.4,s)*exp(-k/3.2):0.;
      float p=clamp(inc*.9+refl,0.,1.);
      vec2 g=abs(fract(P.xz*4.)-.5); float l=smoothstep(.45,.5,max(g.x,g.y));
      float edge=smoothstep(1.,.75,max(abs(vP.x)/6.5,abs(vP.y)/4.5));
      vec3 c=mix(jet(band(p)),vec3(.02,.05,.10),l*.55);
      gl_FragColor=vec4(c,edge*.96); }` }));
slice.rotation.x = -Math.PI / 2; slice.position.y = SLICE_Y; slice.renderOrder = 20; root.add(slice);
const grid = new THREE.GridHelper(40, 40, 0x1d6f86, 0x0e2c3d); grid.position.y = -3.2; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);

// --- 狀態與控制 ---
const DIRS = { side: new THREE.Vector3(1, 0, 0), front: new THREE.Vector3(0, 0, -1), back: new THREE.Vector3(0, 0, 1) };
let phase = 0.42, playing = !reduce, yaw = -0.95, pitch = 0.22, tyaw = yaw, tpitch = pitch, auto = !reduce, visible = true, last = 0; const DUR = 8;
const $ = id => document.getElementById(id), slider = $('h3-t'), playBtn = $('h3-play');
function setDir(k) { U.uDir.value.copy(DIRS[k]); document.querySelectorAll('[data-h3dir]').forEach(b => b.setAttribute('aria-pressed', b.dataset.h3dir === k ? 'true' : 'false')); }
document.querySelectorAll('[data-h3dir]').forEach(b => b.addEventListener('click', () => { setDir(b.dataset.h3dir); phase = 0.02; draw(); }));
function syncPlay() { playBtn.setAttribute('aria-pressed', playing ? 'false' : 'true'); playBtn.textContent = playing ? playBtn.dataset.pause : playBtn.dataset.play; }
playBtn.addEventListener('click', () => { playing = !playing; syncPlay(); });
slider.addEventListener('input', () => { playing = false; syncPlay(); phase = slider.value / 1000; draw(); });
function applyCut() { const on = $('h3-cut').checked; clipped.forEach(m => { m.clippingPlanes = on ? clipOn : []; m.needsUpdate = true; }); stencils.forEach(s => { s.visible = on; }); caps.forEach(c => { c.visible = on; }); }
$('h3-cut').addEventListener('change', () => { applyCut(); draw(); });
$('h3-shell').addEventListener('change', e => { shellGroup.visible = e.target.checked; draw(); });
$('h3-cfd').addEventListener('change', e => { slice.visible = e.target.checked; draw(); });
let drag = null; const cv = renderer.domElement; cv.style.touchAction = 'pan-y'; cv.style.cursor = 'grab';
cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: tyaw, pitch: tpitch }; auto = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
cv.addEventListener('pointermove', e => { if (!drag) return; tyaw = drag.yaw + (e.clientX - drag.x) * 0.008; tpitch = Math.max(-0.5, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.006)); if (reduce) { yaw = tyaw; pitch = tpitch; draw(); } });
const end = () => { drag = null; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
cv.addEventListener('keydown', e => { const d = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key]; if (!d) return; e.preventDefault(); auto = false; tyaw += d[0]; tpitch = Math.max(-0.5, Math.min(1.2, tpitch + d[1])); if (reduce) { yaw = tyaw; pitch = tpitch; draw(); } });
cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', box.dataset.aria || '');

function resize() { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.position.z = w / h < 1.2 ? 15 : 10.8; cam.updateProjectionMatrix(); }
const nrm = new THREE.Vector3();
function draw() {
  const tw = (phase - 0.03) / 0.5, X = -6.2 + 12.4 * tw; U.uX.value = X; U.uA.value = 1;
  const tr = (phase - 0.2) / 0.72; U.uT.value = Math.min(1, Math.max(0, tr)); U.uEnv.value = tr > 0 && tr < 1 ? Math.pow(Math.sin(Math.PI * tr), 0.7) : 0;
  root.rotation.set(pitch, yaw, 0); root.updateMatrixWorld();
  nrm.set(-1, 0, 0).applyQuaternion(root.quaternion); clip.normal.copy(nrm); clip.constant = CUT;
  const t = U.uT.value, env = U.uEnv.value;
  $('h3-ms').textContent = (phase * 8).toFixed(1);
  $('h3-coup').textContent = Math.round(100 * (1 - ss(0.25, 0.7, t)) * env);
  $('h3-contre').textContent = Math.round(85 * ss(0.12, 0.45, t) * (1 - ss(0.72, 1, t)) * env);
  if (document.activeElement !== slider) slider.value = Math.round(phase * 1000);
  renderer.render(scene, cam);
}
function loop(now) {
  requestAnimationFrame(loop); if (!visible) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  if (playing) phase = (phase + dt / DUR) % 1;
  if (auto) tyaw = -0.95 + 0.3 * Math.sin(now / 4500);
  yaw += (tyaw - yaw) * 0.12; pitch += (tpitch - pitch) * 0.12;
  draw();
}
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(box);
new ResizeObserver(() => { resize(); draw(); }).observe(box);
setDir('side'); syncPlay(); applyCut(); resize(); box.classList.add('is-live'); draw();
if (!reduce) requestAnimationFrame(loop);
