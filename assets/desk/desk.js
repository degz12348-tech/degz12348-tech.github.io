/* ============================================================
   degz@arbiz — 3D desk front door
   1. Wide side view of a desk setup in a dark room ("click anywhere").
   2. Click: the camera zooms in to the monitor and it boots a terminal.
   3. Click START: the camera flies into the screen and the portfolio opens.
   Models: Kenney Furniture Kit (CC0), see LICENSE-kenney.txt.
   ============================================================ */

const D = document.documentElement;
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
  <div class="desk-cta" aria-hidden="true">click anywhere<span>_</span></div>`;
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
const LINES = [
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
function lineText(l){
  if (l[0] === 'kv') return '› ' + (l[1] + ' ').padEnd(16, '.') + ' ' + l[2];
  if (l[0] === 'cmd') return l[1] + l[2];
  return l[1];
}
const FULL = LINES.map(lineText);
const TOTAL = FULL.reduce((a, s) => a + s.length + 1, 0);
/* screen modes: standby (room view) | boot (typing, then START) | open (flying in) */
let screenMode = 'standby', typed = 0, typeAcc = 0, hover = false, blink = true, dirty = true;
const BTN = {w: 300, h: 66, y: SCR.h - 116};   // START button, in screen pixels

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
    g.font = '18px ' + mono; g.fillStyle = '#1f9a45';
    g.fillText('DEGZ-OS v1.0  ·  portfolio.sys', 56, 34);
    g.fillStyle = '#00ff41'; g.textAlign = 'right'; g.fillText('● online', W - 56, 34); g.textAlign = 'left';
    g.fillStyle = 'rgba(0,255,65,.25)'; g.fillRect(56, 66, W - 112, 1);

    g.font = '24px ' + mono; g.shadowColor = 'rgba(0,255,65,.55)'; g.shadowBlur = 8;
    let left = typed, y = 92, lastX = 56, lastY = y;
    for (let i = 0; i < LINES.length && left >= 0; i++){
      const full = FULL[i], part = full.slice(0, Math.min(full.length, left)), kind = LINES[i][0];
      if (kind === 'kv'){
        const k = 18;
        g.fillStyle = '#1fbf50'; g.fillText(part.slice(0, k), 56, y);
        g.fillStyle = '#d9ffe3'; g.fillText(part.slice(k), 56 + g.measureText(full.slice(0, k)).width, y);
      } else if (kind === 'cmd'){
        const p = LINES[i][1];
        g.fillStyle = '#00ff41'; g.fillText(part.slice(0, p.length), 56, y);
        g.fillStyle = '#ffffff'; g.fillText(part.slice(p.length), 56 + g.measureText(p).width, y);
      } else { g.fillStyle = kind === 'dim' ? '#1f9a45' : '#00ff41'; g.fillText(part, 56, y); }
      lastX = 56 + g.measureText(part).width; lastY = y;
      left -= full.length + 1; y += 38;
    }
    const done = typed >= TOTAL;
    if (blink || !done){ g.fillStyle = '#00ff41'; g.fillRect(lastX + 4, lastY + 3, 13, 25); }
    if (done){
      const bx = (W - BTN.w) / 2, by = BTN.y;
      g.shadowBlur = hover ? 26 : 14; g.shadowColor = 'rgba(0,255,65,.85)';
      g.fillStyle = hover ? '#00ff41' : 'rgba(0,255,65,.08)'; g.fillRect(bx, by, BTN.w, BTN.h);
      g.strokeStyle = '#00ff41'; g.lineWidth = 2; g.strokeRect(bx, by, BTN.w, BTN.h);
      g.font = '700 28px ' + mono; g.textAlign = 'center';
      g.fillStyle = hover ? '#001a08' : '#00ff41';
      g.fillText('[ START ]', W / 2, by + 18);
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
  let THREE, GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass;
  try {
    THREE = await import('three');
    ({GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'));
    ({EffectComposer} = await import('three/addons/postprocessing/EffectComposer.js'));
    ({RenderPass} = await import('three/addons/postprocessing/RenderPass.js'));
    ({UnrealBloomPass} = await import('three/addons/postprocessing/UnrealBloomPass.js'));
    ({OutputPass} = await import('three/addons/postprocessing/OutputPass.js'));
  } catch (e) { leave(true); return; }

  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
  catch (e) { leave(true); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
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
    glass: M(0x03060d, {emissive:0x0a1a3c, emissiveIntensity:.14, roughness:.1, metalness:.3}),
    _defaultMat: M(0x101315)
  };
  function restyle(obj){
    obj.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const next = mats.map(m => PALETTE[m.name] || M(0x15181b));
      o.material = Array.isArray(o.material) ? next : next[0];
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
  for (let ix = -2; ix <= 1; ix++) for (let iz = 0; iz <= 3; iz++) put('floorFull', ix, -.05, iz - .44 + 1);
  put('wall', -1.5, 0, -.39); put('wall', -.5, 0, -.39); put('wallWindow', .5, 0, -.39);
  for (let iz = 0; iz < 3; iz++) put('wall', -1.5, 0, iz + .56, Math.PI / 2);
  put('rugRectangle', -.785, 0, .98);

  /* desk setup; desk top is y = .384 */
  const TOP = .384;
  put('desk', -.357, 0, 0);
  put('computerScreen', -.197, TOP, -.21);
  put('computerKeyboard', -.141, TOP, -.035);
  put('computerMouse', .205, TOP, -.045);
  put('lampRoundTable', -.372, TOP, -.235);
  put('books', .205, TOP, -.215);
  const plantS = put('plantSmall1', .312, TOP, -.11);
  /* chair pivots around its own centre so it can swivel */
  const chairPivot = new THREE.Group(); chairPivot.position.set(.0005, 0, .677); scene.add(chairPivot);
  const chair = restyle(models.chairDesk.clone(true)); chair.position.set(.1675, 0, -.157); chair.rotation.y = Math.PI; chairPivot.add(chair);
  const plantL = put('pottedPlant', -1.18, 0, -.2);
  put('bookcaseOpenLow', -1.44, 0, .25, Math.PI / 2);

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
  scene.add(new THREE.AmbientLight(0x9fffc0, .05));
  scene.add(new THREE.HemisphereLight(0x1a4a30, 0x050807, .26));
  const glow = new THREE.PointLight(0x2bff66, .65, 2.6, 2);
  glow.position.set(SCREEN.cx, SCREEN.cy, SCREEN.z + .16); scene.add(glow);
  const lamp = new THREE.SpotLight(0xffc98a, 1.1, 2.2, .95, .8, 2);
  lamp.position.set(-.3, TOP + .2, -.28); lamp.target.position.set(-.18, TOP, -.02);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.0006;
  scene.add(lamp, lamp.target);
  const moon = new THREE.DirectionalLight(0x7f9fff, .9);
  moon.position.set(1.4, 1.9, -1.6); moon.target.position.set(-.2, 0, .6);
  moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, {left:-2, right:2, top:2, bottom:-2, near:.1, far:6});
  scene.add(moon, moon.target);

  /* dust floating in the lamp and screen light */
  const DUST = 200, dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
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
  const ROOM = {pos:orbit(ORB.yaw, ORB.pitch, ORB.r), look:C.clone()};
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
    bloom.resolution.set(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
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
      if (onStart(e)) advance();
    }
  });
  root.addEventListener('wheel', e => { if (state === 'room' && e.deltaY > 18) advance(); }, {passive:true});

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
      moveTo(ROOM, 2600, () => { state = 'room'; setStage('room'); roomT0 = performance.now(); }, V(SCREEN.cx + .7, SCREEN.cy + .35, SCREEN.z + 1.1));
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

    glow.intensity = .62 + Math.sin(now / 900) * .04 + (Math.random() < .03 ? -.08 : 0);
    lamp.intensity = 1.1 + Math.sin(now / 130) * .015 + Math.sin(now / 1700) * .03;
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
