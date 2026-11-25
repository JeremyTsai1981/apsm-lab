/* APSM 首頁：頭部爆震波互動示意（three.js 即時算圖）
   程序化示意模型，非 GHBMC 網格；色階為示意用的相對應變，不是分析結果。 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const box = document.getElementById('head3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 700;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(small ? 1.5 : 2, devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
box.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x04070e);
const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100); cam.position.set(0, 0.3, 9.6); cam.lookAt(0, -0.25, 0);
const root = new THREE.Group(); scene.add(root);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(640, 360), small ? 0.3 : 0.42, 0.6, 0.86);
composer.addPass(bloom); composer.addPass(new OutputPass());

const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
// --- 雜訊（腦迴用） ---
const h3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y, z) { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = x - X, v = y - Y, w = z - Z, f = t => t * t * (3 - 2 * t), a = f(u), b = f(v), c = f(w);
  const L = (p, q, t) => p + (q - p) * t;
  return L(L(L(h3(X, Y, Z), h3(X + 1, Y, Z), a), L(h3(X, Y + 1, Z), h3(X + 1, Y + 1, Z), a), b), L(L(h3(X, Y, Z + 1), h3(X + 1, Y, Z + 1), a), L(h3(X, Y + 1, Z + 1), h3(X + 1, Y + 1, Z + 1), a), b), c); }
function gyri(x, y, z) { // 0=腦溝 1=腦迴頂
  const wx = x + 0.35 * (vn(x * 2.1, y * 2.1, z * 2.1) - 0.5), wy = y + 0.35 * (vn(x * 2.1 + 9, y * 2.1, z * 2.1) - 0.5), wz = z + 0.35 * (vn(x * 2.1, y * 2.1 + 5, z * 2.1) - 0.5);
  const a = Math.abs(vn(wx * 5.2, wy * 5.2, wz * 5.2) - 0.5) * 2, b = Math.abs(vn(wx * 9.5 + 3, wy * 9.5, wz * 9.5) - 0.5) * 2;
  return ss(0.02, 0.34, a * 0.72 + b * 0.28);
}
// --- 頭型 ---
function headShape(v) {
  const x = v.x, y = v.y, z = v.z, o = new THREE.Vector3(x * 0.79, y, z * 0.97);
  if (y < 0.12) { const k = ss(0.12, -1, y); o.x *= 1 - 0.30 * k; o.z = o.z * (1 - 0.20 * k) + 0.17 * k; o.y *= 1 + 0.24 * k; }
  if (z > 0) {
    o.z += 0.20 * Math.exp(-(x * x) / 0.011 - (y + 0.20) ** 2 / 0.028) * z;             // 鼻
    o.z += 0.035 * Math.exp(-((y - 0.13) ** 2) / 0.006 - (x * x) / 0.25);                // 眉骨
    o.z -= 0.055 * Math.exp(-((Math.abs(x) - 0.30) ** 2) / 0.011 - (y - 0.02) ** 2 / 0.005) * z; // 眼窩
    o.z += 0.035 * Math.exp(-(x * x) / 0.03 - (y + 0.50) ** 2 / 0.004);                  // 唇
    o.z += 0.075 * Math.exp(-(x * x) / 0.05 - (y + 0.80) ** 2 / 0.02);                   // 下巴
  }
  o.x += Math.sign(x) * 0.10 * Math.exp(-((Math.abs(x) - 0.95) ** 2) / 0.02 - (y + 0.08) ** 2 / 0.03 - (z + 0.05) ** 2 / 0.02); // 耳
  if (z < 0 && y < -0.25) o.z *= 1 - 0.28 * ss(-0.25, -1, y);
  return o.multiplyScalar(1.55);
}
function shaped(geo) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const o = headShape(v); p.setXYZ(i, o.x, o.y, o.z); } geo.computeVertexNormals(); return geo; }

const U = { uDir: { value: new THREE.Vector3(1, 0, 0) }, uX: { value: -9 }, uA: { value: 0 }, uT: { value: 0 }, uEnv: { value: 0 } };
const VS = 'varying vec3 vN,vV,vP; attribute float aAO; varying float vAO; void main(){ vAO=aAO; vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
// 頭部外殼：玻璃質感（菲涅耳邊光＋波前掃過的亮帶）
const shellMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U, vertexShader: VS,
  fragmentShader: `varying vec3 vN,vV,vP; uniform vec3 uDir; uniform float uX,uA;
    void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),2.6); float s=dot(vP,uDir);
      float hit=exp(-pow((s-uX)/.20,2.))*uA; float behind=smoothstep(uX,uX-1.6,s)*uA*.25;
      vec3 c=vec3(.28,.78,.9)*(f*.75+.018)+vec3(1.,.72,.38)*hit*.55+vec3(.2,.6,.9)*behind*f;
      gl_FragColor=vec4(c,1.); }` });
const shell = new THREE.Mesh(shaped(new THREE.SphereGeometry(1, small ? 96 : 160, small ? 72 : 120)), shellMat); root.add(shell);
const wire = new THREE.LineSegments(new THREE.WireframeGeometry(shaped(new THREE.SphereGeometry(1, 34, 24))), new THREE.LineBasicMaterial({ color: 0x3fc1d9, transparent: true, opacity: 0.045 })); root.add(wire);
// 頸、肩
const lineMat = new THREE.LineBasicMaterial({ color: 0x3fc1d9, transparent: true, opacity: 0.13 });
const neck = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.66, 0.84, 1.5, 26, 6, true)), lineMat); neck.position.set(0, -2.55, -0.12); root.add(neck);
const sh = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 30, 10, 0, 6.2832, 0, 1.2).scale(3.0, 0.9, 1.3)), lineMat); sh.position.set(0, -3.92, -0.15); root.add(sh);

// 腦：大腦（含縱裂與腦迴）、小腦、腦幹
const brainFS = `varying vec3 vN,vV,vP; varying float vAO; uniform vec3 uDir; uniform float uT,uEnv;
  vec3 jet(float v){ v=clamp(v,0.,1.); vec3 a=vec3(.10,.22,.95),b=vec3(0.,.72,1.),c=vec3(.16,.88,.32),d=vec3(1.,.9,.05),e=vec3(1.,.16,.08);
    float x=v*4.; return x<1.?mix(a,b,x):x<2.?mix(b,c,x-1.):x<3.?mix(c,d,x-2.):mix(d,e,x-3.); }
  void main(){ vec3 n=normalize(vN); vec3 q=vP-vec3(0.,.42,-.10); float s=dot(q,uDir)/1.05; float t=uT;
    float coup=exp(-pow((s+.9)/.62,2.))*(1.-smoothstep(.25,.7,t));
    float contre=exp(-pow((s-.9)/.6,2.))*smoothstep(.12,.45,t)*(1.-smoothstep(.72,1.,t));
    float deep=exp(-dot(q,q)/.55)*smoothstep(.3,.6,t)*.55;
    float rip=.10*sin(s*7.-t*22.)*(1.-t);
    float st=clamp((max(coup,contre*.85)+deep*.6+rip)*uEnv,0.,1.);
    vec3 L=normalize(vec3(.45,.75,.6)); float d=dot(n,L)*.5+.5; float sp=pow(max(dot(reflect(-L,n),vV),0.),28.);
    float rim=pow(1.-max(dot(n,vV),0.),3.);
    vec3 tissue=vec3(.62,.44,.43); vec3 heat=jet(.04+st*.98);
    vec3 base=mix(tissue,heat,clamp(.25+st*2.2,0.,.96));
    float ao=mix(.28,1.,vAO);
    vec3 c=base*(d*d*.85+.12)*ao + vec3(1.)*sp*.14*ao + vec3(.3,.7,.95)*rim*.16 + heat*st*st*.38;
    gl_FragColor=vec4(c,1.); }`;
const brainMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: brainFS });
function organ(geo, fn) { const p = geo.attributes.position, ao = new Float32Array(p.count), v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); ao[i] = fn(v); p.setXYZ(i, v.x, v.y, v.z); } geo.setAttribute('aAO', new THREE.BufferAttribute(ao, 1)); geo.computeVertexNormals(); return new THREE.Mesh(geo, brainMat); }
const N = small ? [150, 110] : [240, 170];
const cerebrum = organ(new THREE.SphereGeometry(1, N[0], N[1]), v => {
  const g = gyri(v.x, v.y, v.z), fis = Math.exp(-(v.x * v.x) / 0.0035) * ss(-0.35, 0.1, v.y);
  const r = 1 + 0.050 * (g - 0.6) - 0.10 * fis, flat = v.y < -0.3 ? 1 - 0.55 * ss(-0.3, -1, v.y) : 1;
  v.set(v.x * 0.99 * r, v.y * 0.86 * r * flat + 0.42, v.z * 1.24 * r - 0.10); return Math.min(g, 1 - fis); });
const cerebellum = organ(new THREE.SphereGeometry(1, 90, 60), v => { const g = 0.5 + 0.5 * Math.sin(v.y * 46 + 3 * Math.sin(v.x * 4)); const r = 1 + 0.025 * (g - 0.5); v.set(v.x * 0.58 * r, v.y * 0.30 * r - 0.40, v.z * 0.42 * r - 0.80); return 0.35 + 0.65 * g; });
const stem = organ(new THREE.CylinderGeometry(0.15, 0.10, 0.75, 24, 8), v => { v.set(v.x, v.y - 0.62, v.z - 0.40 + (v.y + 0.4) * 0.2); return 0.55; });
const brain = new THREE.Group(); brain.add(cerebrum, cerebellum, stem); root.add(brain);

// 爆震波：數層半透明波前
const waveMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uK: { value: 0 } },
  vertexShader: 'varying vec2 vu; void main(){ vu=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec2 vu; uniform float uA,uK; void main(){ float r=distance(vu,vec2(.5)); float e=smoothstep(.5,.12,r); vec2 g=abs(fract(vu*22.)-.5); float l=smoothstep(.46,.5,max(g.x,g.y)); float ring=.5+.5*sin(r*60.-uK*9.); gl_FragColor=vec4(vec3(.5,.86,1.)*(l*.20+.035+ring*.02)*e*uA,1.); }' });
const waves = []; const waveG = new THREE.Group(); root.add(waveG);
for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), waveMat()); m.rotation.y = Math.PI / 2; waveG.add(m); waves.push(m); }
// 地面格線與懸浮粒子
const grid = new THREE.GridHelper(40, 40, 0x1d6f86, 0x0e2c3d); grid.position.y = -4.4; grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);
{ const n = 500, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (h3(i, 1, 2) - 0.5) * 18; a[i * 3 + 1] = (h3(i, 3, 4) - 0.5) * 9; a[i * 3 + 2] = (h3(i, 5, 6) - 0.5) * 10 - 2; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x57d6ee, size: 0.03, transparent: true, opacity: 0.6 }))); }

// --- 狀態與控制 ---
const DIRS = { side: new THREE.Vector3(1, 0, 0), front: new THREE.Vector3(0, 0, -1), back: new THREE.Vector3(0, 0, 1) };
let phase = 0.44, playing = !reduce, yaw = -0.5, pitch = 0.05, tyaw = yaw, tpitch = pitch, auto = !reduce, visible = true, last = 0, DUR = 7;
const $ = id => document.getElementById(id), slider = $('h3-t'), playBtn = $('h3-play');
function setDir(k) { U.uDir.value.copy(DIRS[k]); waveG.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), DIRS[k]); document.querySelectorAll('[data-h3dir]').forEach(b => b.setAttribute('aria-pressed', b.dataset.h3dir === k ? 'true' : 'false')); }
document.querySelectorAll('[data-h3dir]').forEach(b => b.addEventListener('click', () => { setDir(b.dataset.h3dir); phase = 0.02; draw(); }));
function syncPlay() { playBtn.setAttribute('aria-pressed', playing ? 'false' : 'true'); playBtn.textContent = playing ? playBtn.dataset.pause : playBtn.dataset.play; }
playBtn.addEventListener('click', () => { playing = !playing; syncPlay(); });
slider.addEventListener('input', () => { playing = false; syncPlay(); phase = slider.value / 1000; draw(); });
$('h3-shell').addEventListener('change', e => { shell.visible = wire.visible = e.target.checked; draw(); });
let drag = null; const cv = renderer.domElement; cv.style.touchAction = 'pan-y'; cv.style.cursor = 'grab';
cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: tyaw, pitch: tpitch }; auto = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
cv.addEventListener('pointermove', e => { if (!drag) return; tyaw = drag.yaw + (e.clientX - drag.x) * 0.008; tpitch = Math.max(-0.7, Math.min(0.7, drag.pitch + (e.clientY - drag.y) * 0.006)); if (reduce) { yaw = tyaw; pitch = tpitch; draw(); } });
const end = () => { drag = null; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
cv.addEventListener('keydown', e => { const d = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key]; if (!d) return; e.preventDefault(); auto = false; tyaw += d[0]; tpitch = Math.max(-0.7, Math.min(0.7, tpitch + d[1])); if (reduce) { yaw = tyaw; pitch = tpitch; draw(); } });
cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', box.dataset.aria || '');

function resize() { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); cam.aspect = w / h; cam.position.z = w / h < 1.2 ? 13.5 : 9.6; cam.updateProjectionMatrix(); }
function draw() {
  const tw = (phase - 0.04) / 0.36, X = -3.4 + 6.8 * tw, A = tw > 0 && tw < 1 ? Math.sin(Math.PI * tw) : 0;
  U.uX.value = X; U.uA.value = A;
  waves.forEach((m, k) => { m.position.x = X - k * 0.34; m.material.uniforms.uA.value = A * (1 - k * 0.22); m.material.uniforms.uK.value = phase * 6 + k; });
  const tr = (phase - 0.17) / 0.72; U.uT.value = Math.min(1, Math.max(0, tr)); U.uEnv.value = tr > 0 && tr < 1 ? Math.pow(Math.sin(Math.PI * tr), 0.7) : 0;
  root.rotation.set(pitch, yaw, 0);
  const t = U.uT.value, env = U.uEnv.value;
  $('h3-ms').textContent = (phase * 8).toFixed(1);
  $('h3-coup').textContent = Math.round(100 * (1 - ss(0.25, 0.7, t)) * env);
  $('h3-contre').textContent = Math.round(85 * ss(0.12, 0.45, t) * (1 - ss(0.72, 1, t)) * env);
  if (document.activeElement !== slider) slider.value = Math.round(phase * 1000);
  composer.render();
}
function loop(now) {
  requestAnimationFrame(loop); if (!visible) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  if (playing) phase = (phase + dt / DUR) % 1;
  if (auto) tyaw = -0.5 + 0.35 * Math.sin(now / 4200);
  yaw += (tyaw - yaw) * 0.12; pitch += (tpitch - pitch) * 0.12;
  draw();
}
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(box);
new ResizeObserver(() => { resize(); draw(); }).observe(box);
setDir('side'); syncPlay(); resize(); box.classList.add('is-live'); draw();
if (!reduce) requestAnimationFrame(loop);
