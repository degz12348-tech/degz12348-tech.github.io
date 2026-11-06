/* ============================================================
   degz@arbiz — 3D desk front door
   1. Wide side view of a desk setup in a dark room ("click anywhere").
   2. Click: the camera zooms in to the monitor and it boots a terminal.
   3. Click START: the camera flies into the screen and the portfolio opens.
   Models: Kenney Furniture Kit (CC0), see LICENSE-kenney.txt.
   ============================================================ */

const D = document.documentElement;
/* phones/tablets: lighter render, portrait framing, bigger screen text, taps */
const TOUCH = matchMedia('(pointer:coarse)').matches;
const MOBILE = TOUCH || innerWidth < 900;
const ROOT_URL = new URL('./', import.meta.url).href;

/* ---------------- overlay (built first so Escape / Skip always work) ---------------- */
const root = document.createElement('div');
root.id = 'desk';
root.setAttribute('role', 'dialog');
root.setAttribute('aria-label', 'Interactive 3D desk intro. Press Enter to continue, or Escape to go straight to the portfolio.');
root.innerHTML = `
  <canvas class="desk-gl" tabindex="0" aria-label="Desk. Press Enter to continue."></canvas>
  <button type="button" class="desk-skip">Skip to portfolio</button>
  <div class="desk-load" aria-live="polite">booting desk <b>0%</b></div>
  <div class="desk-cta" aria-hidden="true">${TOUCH ? 'tap anywhere' : 'click anywhere'}<span>_</span></div>`;
document.body.appendChild(root);
const canvas = root.querySelector('.desk-gl');
const loadEl = root.querySelector('.desk-load');
const loadPct = loadEl.querySelector('b');

/* loading | room | zooming | monitor | flying | gone | returning */
let state = 'loading';
let running = false, raf = 0, last = 0;
let advance = () => {};

function markSeen(){ try { sessionStorage.setItem('desk-seen', '1'); } catch (e) {} }
function stop(){ running = false; cancelAnimationFrame(raf); }
function start(){ if (!running){ running = true; last = performance.now(); raf = requestAnimationFrame(t => loop(t)); } }
let loop = () => {};

/* Leave the desk: fade the overlay, hand the page back. */
function leave(fast){
  if (state === 'gone') return;
  state = 'gone';
  markSeen();
  root.classList.add('out');
  if (fast) root.classList.add('fast');
  root.classList.remove('stage-room', 'stage-monitor');
  D.classList.remove('desk-on');
  dispatchEvent(new Event('desk:exit'));
  setTimeout(() => { root.classList.add('hidden'); stop(); }, fast ? 320 : 760);
}
root.querySelector('.desk-skip').addEventListener('click', e => { e.stopPropagation(); leave(true); });
addEventListener('keydown', e => {
  if (state === 'gone') return;
  if (e.key === 'Escape') leave(true);
  else if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)){ e.preventDefault(); advance(); }
});
window.__deskReady = true;

/* ---------------- the terminal on the monitor ---------------- */
const SCR = {w: 1024, h: 626};
const scr = document.createElement('canvas'); scr.width = SCR.w; scr.height = SCR.h;
const sx = scr.getContext('2d');
const LINES = MOBILE ? [
  ['dim', 'booting...'],
  ['kv', 'name', 'Degz Arbiz'],
  ['kv', 'role', 'AI Systems Developer'],
  ['kv', 'builds', 'LLM · evals · automation'],
  ['kv', 'years', '8+ SaaS & automation'],
  ['kv', 'status', 'open to AI roles'],
  ['cmd', '$ ', 'open portfolio']
] : [
  ['dim', 'booting portfolio...'],
  ['', ''],
  ['kv', 'profile', 'Degz Arbiz'],
  ['kv', 'role', 'AI Systems Developer'],
  ['kv', 'builds', 'LLM apps · evals · automation'],
  ['kv', 'experience', '8+ years · SaaS & automation'],
  ['kv', 'status', 'open to AI engineering roles'],
  ['kv', 'region', 'remote · APAC · EU · US overlap'],
  ['', ''],
  ['cmd', 'degz@arbiz:~$ ', 'open portfolio']
];
/* text sizes on the 1024px screen texture; phones get much larger type */
const TL = MOBILE ? {font:42, lh:55, y0:88, pad:9, head:26, headY:30, rule:62, caretW:22, caretH:42, btnFont:46, btn:{w:440, h:94}}
                  : {font:24, lh:38, y0:92, pad:16, head:18, headY:34, rule:66, caretW:13, caretH:25, btnFont:28, btn:{w:300, h:66}};
const KEYLEN = 2 + TL.pad;
function lineText(l){
  if (l[0] === 'kv') return '› ' + (l[1] + ' ').padEnd(TL.pad, '.') + ' ' + l[2];
  if (l[0] === 'cmd') return l[1] + l[2];
  return l[1];
}
const FULL = LINES.map(lineText);
const TOTAL = FULL.reduce((a, s) => a + s.length + 1, 0);
/* screen modes: standby (room view) | boot (typing, then START) | open (flying in) */
let screenMode = 'standby', typed = 0, typeAcc = 0, hover = false, blink = true, dirty = true;
const BTN = {w: TL.btn.w, h: TL.btn.h, y: SCR.h - TL.btn.h - (MOBILE ? 34 : 50)};   // START button, in screen pixels

function drawScreen(){
  const g = sx, W = SCR.w, H = SCR.h, mono = '"JetBrains Mono", Consolas, monospace';
  g.fillStyle = '#010503'; g.fillRect(0, 0, W, H);
  const grd = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * .7);
  grd.addColorStop(0, 'rgba(0,255,65,.07)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.textBaseline = 'top';

  if (screenMode === 'standby' || screenMode === 'open'){
    g.textAlign = 'center';
    g.font = '700 58px ' + mono; g.fillStyle = '#00ff41'; g.shadowColor = 'rgba(0,255,65,.8)'; g.shadowBlur = 18;
    g.fillText('degz@arbiz', W / 2, H / 2 - 46);
    g.font = '22px ' + mono; g.shadowBlur = 6; g.fillStyle = '#5fdc85';
    const sub = screenMode === 'open' ? 'opening portfolio' : 'standby';
    g.fillText(sub + (blink ? ' ▌' : '  '), W / 2, H / 2 + 32);
    g.textAlign = 'left'; g.shadowBlur = 0;
  } else {
    g.font = TL.head + 'px ' + mono; g.fillStyle = '#1f9a45';
    g.fillText(MOBILE ? 'DEGZ-OS v1.0' : 'DEGZ-OS v1.0  ·  portfolio.sys', 56, TL.headY);
    g.fillStyle = '#00ff41'; g.textAlign = 'right'; g.fillText('● online', W - 56, TL.headY); g.textAlign = 'left';
    g.fillStyle = 'rgba(0,255,65,.25)'; g.fillRect(56, TL.rule, W - 112, 1);

    g.font = TL.font + 'px ' + mono; g.shadowColor = 'rgba(0,255,65,.55)'; g.shadowBlur = 8;
    let left = typed, y = TL.y0, lastX = 56, lastY = y;
    for (let i = 0; i < LINES.length && left >= 0; i++){
      const full = FULL[i], part = full.slice(0, Math.min(full.length, left)), kind = LINES[i][0];
      if (kind === 'kv'){
        const k = KEYLEN;
        g.fillStyle = '#1fbf50'; g.fillText(part.slice(0, k), 56, y);
        g.fillStyle = '#d9ffe3'; g.fillText(part.slice(k), 56 + g.measureText(full.slice(0, k)).width, y);
      } else if (kind === 'cmd'){
        const p = LINES[i][1];
        g.fillStyle = '#00ff41'; g.fillText(part.slice(0, p.length), 56, y);
        g.fillStyle = '#ffffff'; g.fillText(part.slice(p.length), 56 + g.measureText(p).width, y);
      } else { g.fillStyle = kind === 'dim' ? '#1f9a45' : '#00ff41'; g.fillText(part, 56, y); }
      lastX = 56 + g.measureText(part).width; lastY = y;
      left -= full.length + 1; y += TL.lh;
    }
    const done = typed >= TOTAL;
    if (blink || !done){ g.fillStyle = '#00ff41'; g.fillRect(lastX + 4, lastY + 3, TL.caretW, TL.caretH); }
    if (done){
      const bx = (W - BTN.w) / 2, by = BTN.y;
      g.shadowBlur = hover ? 26 : 14; g.shadowColor = 'rgba(0,255,65,.85)';
      g.fillStyle = hover ? '#00ff41' : 'rgba(0,255,65,.08)'; g.fillRect(bx, by, BTN.w, BTN.h);
      g.strokeStyle = '#00ff41'; g.lineWidth = 2; g.strokeRect(bx, by, BTN.w, BTN.h);
      g.font = '700 ' + TL.btnFont + 'px ' + mono; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = hover ? '#001a08' : '#00ff41';
      g.fillText('[ START ]', W / 2, by + BTN.h / 2 + 2); g.textBaseline = 'top';
      g.textAlign = 'left';
    }
    g.shadowBlur = 0;
  }
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let yy = 0; yy < H; yy += 3) g.fillRect(0, yy, W, 1);
  const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

/* ---------------- 3D ---------------- */
async function main(){
  let THREE, GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, RoomEnvironment, RectAreaLightUniformsLib, GTAOPass = null;
  try {
    THREE = await import('three');
    ({GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'));
    ({EffectComposer} = await import('three/addons/postprocessing/EffectComposer.js'));
    ({RenderPass} = await import('three/addons/postprocessing/RenderPass.js'));
    ({UnrealBloomPass} = await import('three/addons/postprocessing/UnrealBloomPass.js'));
    ({OutputPass} = await import('three/addons/postprocessing/OutputPass.js'));
    ({RoomEnvironment} = await import('three/addons/environments/RoomEnvironment.js'));
    ({RectAreaLightUniformsLib} = await import('three/addons/lights/RectAreaLightUniformsLib.js'));
    if (!MOBILE) try { ({GTAOPass} = await import('three/addons/postprocessing/GTAOPass.js')); } catch (e) { GTAOPass = null; }
  } catch (e) { leave(true); return; }

  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
  catch (e) { leave(true); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !MOBILE;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3.4, 7.5);
  const camera = new THREE.PerspectiveCamera(38, 1, .01, 20);

  /* materials: everything recoloured into a dark, terminal-room palette */
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({color:c, roughness:.78, metalness:.05}, o));
  const PALETTE = {
    wood: M(0x14171a), woodDark: M(0x0e1012), metal: M(0x2a3034, {metalness:.55, roughness:.38}),
    metalDark: M(0x0c0e10, {metalness:.45, roughness:.45}), metalMedium: M(0x1a1f22, {metalness:.4, roughness:.5}),
    carpet: M(0x0b1a10), carpetDarker: M(0x07110a), carpetWhite: M(0x2b302d), plant: M(0x0f5a2a, {roughness:.6}),
    lamp: new THREE.MeshBasicMaterial({color:0x4a3214}),
    glass: M(0x0a1630, {transparent:true, opacity:.22, roughness:.05, metalness:.5, depthWrite:false}),
    _defaultMat: M(0x101315)
  };
  function restyle(obj){
    obj.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const next = mats.map(m => { const r = PALETTE[m.name] || M(0x15181b); return r; });
      o.userData.srcNames = mats.map(m => m.name);
      o.material = Array.isArray(o.material) ? next : next[0];
    });
    return obj;
  }
  /* restyle shares palette materials, so tag a per-mesh copy key for texturize */
  function srcOf(o, i){ return (o.userData.srcNames || [])[i || 0]; }

  /* procedural surface textures (no downloads): wood, planks, plaster, fabric */
  function canvasTex(size, draw, rep){
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = MOBILE ? 4 : 8; if (rep) t.repeat.set(rep, rep);
    return t;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function grain(g, n, x0, w, base, dark){
    for (let i = 0; i < n; i++){
      const x = x0 + Math.random() * w, a = rnd(.04, .16), amp = rnd(2, 9), f = rnd(.004, .02), ph = rnd(0, 6);
      g.strokeStyle = `rgba(${dark},${a})`; g.lineWidth = rnd(.6, 2.2); g.beginPath();
      for (let y = 0; y <= 512; y += 8) g.lineTo(x + Math.sin(y * f + ph) * amp, y);
      g.stroke();
    }
  }
  const floorTex = canvasTex(512, (g, S) => {
    const W = 64;
    for (let x = 0; x < S; x += W){
      const l = rnd(-7, 7); g.fillStyle = `rgb(${34 + l},${26 + l},${20 + l})`; g.fillRect(x, 0, W, S);
      grain(g, 26, x, W, 0, '10,6,3');
      const cut = rnd(80, 430); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, cut, W, 2);   // board ends
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, 0, 2, S);                                 // seams
    }
  }, 1);
  const deskTex = canvasTex(512, (g, S) => {
    g.fillStyle = 'rgb(38,29,22)'; g.fillRect(0, 0, S, S);
    grain(g, 140, 0, S, 0, '14,8,4');
    for (let i = 0; i < 3; i++){ const x = rnd(40, 470), y = rnd(40, 470);       // knots
      const rg = g.createRadialGradient(x, y, 1, x, y, rnd(8, 16)); rg.addColorStop(0, 'rgba(8,4,2,.55)'); rg.addColorStop(1, 'rgba(8,4,2,0)');
      g.fillStyle = rg; g.fillRect(x - 20, y - 20, 40, 40); }
  }, 1);
  const plasterTex = canvasTex(512, (g, S) => {
    g.fillStyle = 'rgb(46,52,50)'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++){ const x = rnd(0, S), y = rnd(0, S), r = rnd(30, 120);
      const rg = g.createRadialGradient(x, y, 0, x, y, r); const l = Math.random() < .5 ? '0,0,0' : '255,255,255';
      rg.addColorStop(0, `rgba(${l},${rnd(.02, .05)})`); rg.addColorStop(1, `rgba(${l},0)`); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const d = g.getImageData(0, 0, S, S), a = d.data;
    for (let i = 0; i < a.length; i += 4){ const n = (Math.random() - .5) * 10; a[i] += n; a[i + 1] += n; a[i + 2] += n; }
    g.putImageData(d, 0, 0);
  }, 1);
  const fabricTex = canvasTex(256, (g, S) => {
    g.fillStyle = 'rgb(20,30,25)'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 4){ g.fillStyle = `rgba(0,0,0,${rnd(.15, .3)})`; g.fillRect(0, y, S, 1); }
    for (let x = 0; x < S; x += 4){ g.fillStyle = `rgba(255,255,255,${rnd(.02, .05)})`; g.fillRect(x, 0, 1, S); }
  }, 1);
  const S = (map, o = {}) => new THREE.MeshStandardMaterial(Object.assign({map, roughness:.8, metalness:0}, o));
  const MAT = {
    floor: S(floorTex, {roughness:.62, bumpMap:floorTex, bumpScale:.002}),
    desk: S(deskTex, {roughness:.5, bumpMap:deskTex, bumpScale:.0015}),
    wall: S(plasterTex, {roughness:.96, bumpMap:plasterTex, bumpScale:.003}),
    rug: S(fabricTex, {roughness:1, bumpMap:fabricTex, bumpScale:.002, color:0x9fb3a8}),
    seat: S(fabricTex, {roughness:.95, color:0x7f8f88}),
  };
  /* world-space box projection so textures tile seamlessly across tiles/walls */
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
  function texturize(obj, map, scale){
    obj.updateMatrixWorld(true);
    obj.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const want = mats.map((m, i) => map[srcOf(o, i)] || null);
      if (!want.some(Boolean)) return;
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
      _nm.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < pos.count; i++){
        _v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        _n.fromBufferAttribute(nor, i).applyMatrix3(_nm);
        const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
        let u, v;
        if (ay >= ax && ay >= az){ u = _v.x; v = _v.z; } else if (ax >= az){ u = _v.z; v = _v.y; } else { u = _v.x; v = _v.y; }
        uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      o.geometry = geo;
      o.material = Array.isArray(o.material) ? mats.map((m, i) => want[i] || m) : (want[0] || o.material);
    });
    return obj;
  }

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, done, total) => { loadPct.textContent = Math.round(done / total * 100) + '%'; };
  const loader = new GLTFLoader(manager);
  const NAMES = ['desk','computerScreen','computerKeyboard','computerMouse','chairDesk','lampRoundTable','plantSmall1',
                 'pottedPlant','books','bookcaseOpenLow','rugRectangle','floorFull','wall','wallWindow'];
  const models = {};
  try {
    const got = await Promise.all(NAMES.map(n => loader.loadAsync(ROOT_URL + n + '.glb')));
    NAMES.forEach((n, i) => models[n] = got[i].scene);
  } catch (e) { leave(true); return; }
  const put = (name, x, y, z, ry = 0) => {
    const o = restyle(models[name].clone(true));
    o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o;
  };

  /* room */
  const WALL = {wood:MAT.wall, _defaultMat:MAT.wall};
  for (let ix = -2; ix <= 1; ix++) for (let iz = 0; iz <= 3; iz++) texturize(put('floorFull', ix, -.05, iz - .44 + 1), {wood:MAT.floor}, 1.6);
  texturize(put('wall', -1.5, 0, -.39), WALL, 1.2); texturize(put('wall', -.5, 0, -.39), WALL, 1.2); texturize(put('wallWindow', .5, 0, -.39), WALL, 1.2);
  for (let iz = 0; iz < 3; iz++) texturize(put('wall', -1.5, 0, iz + .56, Math.PI / 2), WALL, 1.2);
  texturize(put('rugRectangle', -.785, 0, .98), {carpet:MAT.rug, carpetDarker:MAT.rug}, 5);

  /* desk setup; desk top is y = .384 */
  const TOP = .384;
  texturize(put('desk', -.357, 0, 0), {wood:MAT.desk}, 2.2);
  put('computerScreen', -.197, TOP, -.21);
  put('computerKeyboard', -.141, TOP, -.035);
  put('computerMouse', .205, TOP, -.045);
  put('lampRoundTable', -.372, TOP, -.235);
  put('books', .205, TOP, -.215);
  const plantS = put('plantSmall1', .312, TOP, -.11);
  /* chair pivots around its own centre so it can swivel */
  const chairPivot = new THREE.Group(); chairPivot.position.set(.0005, 0, .677); scene.add(chairPivot);
  const chair = restyle(models.chairDesk.clone(true)); chair.position.set(.1675, 0, -.157); chair.rotation.y = Math.PI; chairPivot.add(chair);
  texturize(chair, {carpet:MAT.seat}, 9);
  const plantL = put('pottedPlant', -1.18, 0, -.2);
  texturize(put('bookcaseOpenLow', -1.19, 0, .35, Math.PI / 2), {wood:MAT.desk}, 2.2);

  /* the live screen */
  const SCREEN = {cx:-.197 + .196, cy:TOP + .172, z:-.21 + .0025, w:.3795, h:.232};
  const tex = new THREE.CanvasTexture(scr);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({map:tex, toneMapped:false}));
  screenMesh.position.set(SCREEN.cx, SCREEN.cy, SCREEN.z);
  scene.add(screenMesh);
  const screenCenter = new THREE.Vector3(SCREEN.cx, SCREEN.cy, SCREEN.z);

  /* lights */
  scene.add(new THREE.AmbientLight(0xb8d8ff, .07));
  scene.add(new THREE.HemisphereLight(0x2a4a3a, 0x0a0c0b, .42));
  /* the screen lights the room the way a real monitor does: a soft rectangle */
  RectAreaLightUniformsLib.init();
  const screenLight = new THREE.RectAreaLight(0x3dff7a, 9, SCREEN.w, SCREEN.h);
  screenLight.position.set(SCREEN.cx, SCREEN.cy, SCREEN.z + .004); screenLight.lookAt(SCREEN.cx, SCREEN.cy, 2); scene.add(screenLight);
  const glow = new THREE.PointLight(0x2bff66, .22, 2.6, 2);
  glow.position.set(SCREEN.cx, SCREEN.cy, SCREEN.z + .16); scene.add(glow);
  /* warm bulb under the lamp shade */
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.013, 16, 12), new THREE.MeshBasicMaterial({color:0xffd9a0, toneMapped:false}));
  bulb.position.set(-.312, TOP + .205, -.295); scene.add(bulb);
  /* soft night sky behind the window glass */
  const skyC = document.createElement('canvas'); skyC.width = 256; skyC.height = 256;
  { const g = skyC.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#04070f'); gr.addColorStop(.6, '#0b1630'); gr.addColorStop(1, '#16244a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const mg = g.createRadialGradient(190, 60, 2, 190, 60, 90); mg.addColorStop(0, 'rgba(200,215,255,.55)'); mg.addColorStop(.12, 'rgba(160,185,255,.18)'); mg.addColorStop(1, 'rgba(120,150,255,0)');
    g.fillStyle = mg; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 30; i++) g.fillRect((i * 97) % 256, (i * 41) % 150, 1, 1); }
  const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({map:skyTex, fog:false}));
  sky.position.set(1.0, .72, -.7); scene.add(sky);

  const lamp = new THREE.SpotLight(0xffc98a, .75, 2.2, .95, .85, 2);
  lamp.position.set(-.3, TOP + .2, -.28); lamp.target.position.set(-.18, TOP, -.02);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.0006;
  scene.add(lamp, lamp.target);
  const moon = new THREE.DirectionalLight(0x8aa6ff, 1.15);
  moon.position.set(1.4, 1.9, -1.6); moon.target.position.set(-.2, 0, .6);
  moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, {left:-2, right:2, top:2, bottom:-2, near:.1, far:6});
  scene.add(moon, moon.target);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
    if ('envMapIntensity' in m) m.envMapIntensity = m.metalness > .3 ? .28 : .05; }); });

  /* dust floating in the lamp and screen light */
  const DUST = MOBILE ? 90 : 200, dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++){
    dPos[i*3] = -.75 + Math.random() * 1.4; dPos[i*3+1] = .2 + Math.random() * .9; dPos[i*3+2] = -.33 + Math.random() * .95;
    dSeed[i] = Math.random() * 100;
  }
  const dBase = dPos.slice();
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32;
  const dg = dotC.getContext('2d'), rg = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = rg; dg.fillRect(0, 0, 32, 32);
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({size:.011, map:new THREE.CanvasTexture(dotC), color:0x9dffb8,
    transparent:true, opacity:.32, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true}));
  scene.add(dust);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (GTAOPass){
    try {
      gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
      gtao.updateGtaoMaterial({radius:.1, distanceExponent:1.5, thickness:1, scale:1.2, samples:16});
      gtao.updatePdMaterial({lumaPhi:10, depthPhi:2, normalPhi:3, radius:6, rings:2, samples:16});
      gtao.blendIntensity = .85;
      composer.addPass(gtao);
    } catch (e) { gtao = null; }
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .45, .82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---- camera shots ---- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  /* room shots are an orbit around the desk: yaw/pitch/radius */
  const C = V(-.08, .42, -.12);
  const deg = Math.PI / 180;
  const ORB = {yaw:47 * deg, pitch:17 * deg, r:2.35};          // wide side view
  const ORB0 = {yaw:-35 * deg, pitch:42 * deg, r:3.6};         // opening swing starts here
  const orbit = (yaw, pitch, r) => V(C.x + r * Math.cos(pitch) * Math.sin(yaw), C.y + r * Math.sin(pitch), C.z + r * Math.cos(pitch) * Math.cos(yaw));
  const roomShot = () => ({pos:orbit(ORB.yaw, ORB.pitch, ORB.r), look:C.clone()});
  const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  function monitorShot(){   // face the monitor, screen ~75% of the view
    const t = tanHalf();
    const d = Math.max((SCREEN.h / 2) / (t * .74), (SCREEN.w / 2) / (t * camera.aspect * .86));
    return {pos:V(SCREEN.cx, SCREEN.cy + .012, SCREEN.z + d), look:screenCenter.clone()};
  }
  function insideShot(){    // screen fills the whole view
    const t = tanHalf();
    const d = Math.min((SCREEN.h / 2) / t, (SCREEN.w / 2) / (t * camera.aspect)) * .985;
    return {pos:V(SCREEN.cx, SCREEN.cy, SCREEN.z + d), look:screenCenter.clone()};
  }

  function resize(){
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    if (gtao) gtao.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    const tall = camera.aspect < 1;
    camera.fov = tall ? 52 : 38;
    ORB.r = tall ? 2.05 : 2.35; ORB0.r = tall ? 3.4 : 3.6;
    C.y = tall ? .5 : .42;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, {passive:true}); resize();

  /* pointer: parallax + START hover */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let mx = 0, my = 0, smx = 0, smy = 0;
  function onStart(e){
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(screenMesh)[0];
    if (!hit || !hit.uv) return false;
    const px = hit.uv.x * SCR.w, py = (1 - hit.uv.y) * SCR.h, bx = (SCR.w - BTN.w) / 2;
    return px > bx - 20 && px < bx + BTN.w + 20 && py > BTN.y - 20 && py < BTN.y + BTN.h + 20;
  }
  root.addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
    if (state !== 'monitor' || typed < TOTAL) return;
    const h = onStart(e);
    if (h !== hover){ hover = h; dirty = true; root.classList.toggle('on-start', h); }
  });
  root.addEventListener('click', e => {
    if (e.target.closest('.desk-skip')) return;
    if (state === 'room') advance();
    else if (state === 'monitor'){
      if (typed < TOTAL){ typed = TOTAL; dirty = true; return; }   // skip the typing
      if (TOUCH || onStart(e)) advance();
    }
  });
  root.addEventListener('wheel', e => { if (state === 'room' && e.deltaY > 18) advance(); }, {passive:true});
  let ty0 = null;
  root.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, {passive:true});
  root.addEventListener('touchend', e => {
    if (ty0 !== null && state === 'room' && ty0 - e.changedTouches[0].clientY > 40) advance();
    ty0 = null;
  }, {passive:true});

  /* ---- moves ---- */
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let move = null;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function moveTo(shot, dur, done, ctrl){
    move = {t0:performance.now(), dur, fromPos:camPos.clone(), fromLook:camLook.clone(),
            toPos:shot.pos.clone(), toLook:shot.look.clone(), done, ctrl:ctrl || null};
  }
  const bez = (a, c, b, t, out) => out.set(
    (1-t)*(1-t)*a.x + 2*(1-t)*t*c.x + t*t*b.x, (1-t)*(1-t)*a.y + 2*(1-t)*t*c.y + t*t*b.y, (1-t)*(1-t)*a.z + 2*(1-t)*t*c.z + t*t*b.z);
  function setStage(s){
    root.classList.toggle('stage-room', s === 'room');
    root.classList.toggle('stage-monitor', s === 'monitor');
  }

  advance = function(){
    if (state === 'room'){
      state = 'zooming'; setStage('zooming');
      moveTo(monitorShot(), 2400, () => {
        state = 'monitor'; setStage('monitor');
        screenMode = 'boot'; typed = 0; typeAcc = 0; dirty = true;
        canvas.setAttribute('aria-label', 'Monitor. Press Enter to start.');
      }, V(SCREEN.cx + .75, SCREEN.cy + .32, SCREEN.z + 1.05));
    } else if (state === 'monitor'){
      if (typed < TOTAL){ typed = TOTAL; dirty = true; return; }
      state = 'flying'; setStage('flying'); hover = false; root.classList.remove('on-start');
      root.classList.add('flying');
      screenMode = 'open'; dirty = true;
      moveTo(insideShot(), 1300, () => leave(false));
    }
  };

  window.openDesk = function(){
    if (state !== 'gone') return;
    state = 'returning';
    D.classList.add('desk-on'); dispatchEvent(new Event('desk:enter'));
    root.classList.remove('hidden', 'fast', 'flying');
    screenMode = 'open'; dirty = true;
    const inside = insideShot(); camPos.copy(inside.pos); camLook.copy(inside.look);
    start();
    requestAnimationFrame(() => root.classList.remove('out'));
    setTimeout(() => {
      screenMode = 'standby'; dirty = true;
      moveTo(roomShot(), 2600, () => { state = 'room'; setStage('room'); roomT0 = performance.now(); }, V(SCREEN.cx + .7, SCREEN.cy + .35, SCREEN.z + 1.1));
    }, 450);
  };

  /* ---- loop ---- */
  let introT0 = 0, roomT0 = -1e9, lastBlink = 0;
  camPos.copy(orbit(ORB0.yaw, ORB0.pitch, ORB0.r)); camLook.copy(C);
  const tmp = new THREE.Vector3();
  loop = function(now){
    if (!running) return;
    const dt = Math.min(60, now - last); last = now;

    if (screenMode === 'boot' && typed < TOTAL){
      typeAcc += dt * .16;
      while (typeAcc >= 1 && typed < TOTAL){ typeAcc -= 1; typed++; }
      dirty = true;
    }
    if (now - lastBlink > 520){ lastBlink = now; blink = !blink; dirty = true; }
    if (dirty){ drawScreen(); tex.needsUpdate = true; dirty = false; }

    smx += (mx - smx) * .05; smy += (my - smy) * .05;
    if (move){
      const t = Math.min(1, (now - move.t0) / move.dur), e = ease(t), el = easeOut(Math.min(1, t * 1.3));
      if (move.ctrl) bez(move.fromPos, move.ctrl, move.toPos, e, camPos); else camPos.lerpVectors(move.fromPos, move.toPos, e);
      camLook.lerpVectors(move.fromLook, move.toLook, el);
      camera.position.copy(camPos);
      if (t >= 1){ const done = move.done; move = null; done && done(); }
    } else if (state === 'room' || state === 'loading'){
      // opening: a cinematic swing round the desk, then a slow sway + mouse orbit
      const it = Math.min(1, (now - introT0) / 4200), e = ease(it);
      const settle = Math.min(1, (now - Math.max(introT0 + 4200, roomT0)) / 1500);
      const live = easeOut(Math.max(0, settle));
      const yaw = ORB0.yaw + (ORB.yaw - ORB0.yaw) * e + live * (Math.sin(now / 6500) * 7 * deg + smx * 26 * deg);
      const pitch = ORB0.pitch + (ORB.pitch - ORB0.pitch) * e + live * (-smy * 8 * deg + Math.sin(now / 4100) * 1.2 * deg);
      const r = ORB0.r + (ORB.r - ORB0.r) * e;
      camPos.copy(orbit(yaw, pitch, r));
      camLook.copy(C);
      camera.position.copy(camPos);
    } else if (state === 'monitor'){
      const m = monitorShot();
      camPos.set(m.pos.x + smx * .025, m.pos.y - smy * .015, m.pos.z);
      camLook.copy(m.look);
      camera.position.copy(camPos);
    } else camera.position.copy(camPos);
    camera.lookAt(camLook);

    const flick = Math.random() < .03 ? .85 : 1;
    screenLight.intensity = (9 + Math.sin(now / 900) * .5) * flick; glow.intensity = .22 * flick;
    lamp.intensity = .75 + Math.sin(now / 130) * .01 + Math.sin(now / 1700) * .02;
    plantS.rotation.z = Math.sin(now / 1900) * .045; plantS.rotation.x = Math.sin(now / 2300 + 1) * .03;
    plantL.rotation.z = Math.sin(now / 2600 + 2) * .03;
    chairPivot.rotation.y = Math.sin(now / 3200) * .16;
    const ts = now / 1000;
    for (let i = 0; i < DUST; i++){
      const k = dSeed[i], j = i * 3;
      let y = dBase[j+1] + ((ts * (.01 + (k % 1) * .015)) % .9);
      if (y > 1.1) y -= .9;
      dPos[j] = dBase[j] + Math.sin(ts * .3 + k) * .05;
      dPos[j+1] = y;
      dPos[j+2] = dBase[j+2] + Math.cos(ts * .25 + k * 1.3) * .05;
    }
    dGeo.attributes.position.needsUpdate = true;
    composer.render();
    raf = requestAnimationFrame(t => loop(t));
  };

  try { await Promise.race([document.fonts.load('24px "JetBrains Mono"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  drawScreen(); tex.needsUpdate = true;
  loadEl.classList.add('done');
  root.classList.add('ready');
  state = 'room'; setStage('room'); introT0 = performance.now();
  start();
  canvas.focus({preventScroll:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (state !== 'gone') start(); });
}

if (window.__deskMode === 'return'){ D.classList.add('desk-on'); }
/* slow network: don't hold anyone on a loading screen */
setTimeout(() => { if (state === 'loading') leave(true); }, 12000);
main();
