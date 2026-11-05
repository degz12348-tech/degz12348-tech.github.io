/* ============================================================
   degz@arbiz — 3D desk front door
   A dark room, a desk, a monitor that boots a green terminal.
   Click the screen (or scroll / press Enter) and the camera flies
   into the monitor; the screen dissolves into the portfolio.
   Models: Kenney Furniture Kit (CC0), see LICENSE-kenney.txt.
   ============================================================ */

const D = document.documentElement;
const ROOT_URL = new URL('./', import.meta.url).href;

/* ---------------- overlay UI (built first so Skip always works) ---------------- */
const root = document.createElement('div');
root.id = 'desk';
root.setAttribute('role', 'dialog');
root.setAttribute('aria-label', 'Interactive 3D desk intro. Press Escape or use Skip to go straight to the portfolio.');
root.innerHTML = `
  <canvas class="desk-gl" tabindex="0" aria-label="Monitor. Press Enter to open the portfolio."></canvas>
  <button type="button" class="desk-skip">Skip to portfolio</button>
  <div class="desk-load" aria-live="polite">booting desk <b>0%</b></div>`;
document.body.appendChild(root);
const canvas = root.querySelector('.desk-gl');
const btnSkip = root.querySelector('.desk-skip');
const loadEl = root.querySelector('.desk-load');
const loadPct = loadEl.querySelector('b');

let state = 'loading';         // loading | idle | flying | gone | returning
let running = false, raf = 0;

function markSeen(){ try { sessionStorage.setItem('desk-seen', '1'); } catch (e) {} }

/* Leave the desk: fade the overlay, hand the page back. */
function leave(fast){
  if (state === 'gone') return;
  state = 'gone';
  markSeen();
  root.classList.add('out');
  if (fast) root.classList.add('fast');
  D.classList.remove('desk-on');
  dispatchEvent(new Event('desk:exit'));
  setTimeout(() => { root.classList.add('hidden'); stop(); }, fast ? 320 : 760);
  const main = document.getElementById('main');
  if (main) setTimeout(() => main.focus && main.focus({preventScroll:true}), 50);
}
btnSkip.addEventListener('click', () => leave(true));
addEventListener('keydown', e => {
  if (state === 'gone') return;
  if (e.key === 'Escape') leave(true);
  else if ((e.key === 'Enter' || e.key === ' ') && state === 'idle' && !(e.target instanceof HTMLButtonElement)){ e.preventDefault(); enter(); }
});
window.__deskReady = true;

const Sound = {click(){}, whoosh(){}};

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
let typed = 0, typeAcc = 0, hover = false, blink = true, screenMode = 'boot', dirty = true;

function drawScreen(){
  const g = sx, W = SCR.w, H = SCR.h;
  g.fillStyle = '#010503'; g.fillRect(0, 0, W, H);
  const grd = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * .7);
  grd.addColorStop(0, 'rgba(0,255,65,.07)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  const mono = '"JetBrains Mono", Consolas, monospace';
  g.textBaseline = 'top';
  if (screenMode === 'open'){
    g.font = '700 54px ' + mono; g.fillStyle = '#00ff41'; g.shadowColor = 'rgba(0,255,65,.8)'; g.shadowBlur = 18;
    g.textAlign = 'center'; g.fillText('degz@arbiz', W / 2, H / 2 - 40);
    g.font = '22px ' + mono; g.shadowBlur = 6; g.fillStyle = '#7dffa0';
    g.fillText('opening portfolio' + (blink ? ' ▌' : '  '), W / 2, H / 2 + 34);
    g.textAlign = 'left'; g.shadowBlur = 0;
  } else {
    // header bar
    g.font = '18px ' + mono; g.fillStyle = '#1f9a45'; g.shadowBlur = 0;
    g.fillText('DEGZ-OS v1.0  ·  portfolio.sys', 56, 34);
    g.fillStyle = '#00ff41'; g.textAlign = 'right'; g.fillText('● online', W - 56, 34); g.textAlign = 'left';
    g.fillStyle = 'rgba(0,255,65,.25)'; g.fillRect(56, 66, W - 112, 1);

    // typed lines
    g.font = '24px ' + mono; g.shadowColor = 'rgba(0,255,65,.55)'; g.shadowBlur = 8;
    let left = typed, y = 92, lastX = 56, lastY = y;
    for (let i = 0; i < LINES.length && left >= 0; i++){
      const full = FULL[i], n = Math.min(full.length, left), part = full.slice(0, n);
      const kind = LINES[i][0];
      if (kind === 'kv'){
        const keyLen = 2 + 16;
        g.fillStyle = '#1fbf50'; g.fillText(part.slice(0, keyLen), 56, y);
        g.fillStyle = '#d9ffe3'; g.fillText(part.slice(keyLen), 56 + g.measureText(full.slice(0, keyLen)).width, y);
      } else if (kind === 'cmd'){
        const p = LINES[i][1];
        g.fillStyle = '#00ff41'; g.fillText(part.slice(0, p.length), 56, y);
        g.fillStyle = '#ffffff'; g.fillText(part.slice(p.length), 56 + g.measureText(p).width, y);
      } else {
        g.fillStyle = kind === 'dim' ? '#1f9a45' : '#00ff41'; g.fillText(part, 56, y);
      }
      lastX = 56 + g.measureText(part).width; lastY = y;
      left -= full.length + 1; y += 38;
    }
    const done = typed >= TOTAL;
    if (blink || !done){ g.fillStyle = '#00ff41'; g.fillRect(lastX + 4, lastY + 3, 13, 25); }

    // enter button
    if (done){
      const bw = 360, bh = 62, bx = (W - bw) / 2, by = H - 112;
      g.shadowBlur = hover ? 24 : 12; g.shadowColor = 'rgba(0,255,65,.8)';
      if (hover){ g.fillStyle = '#00ff41'; g.fillRect(bx, by, bw, bh); }
      g.strokeStyle = '#00ff41'; g.lineWidth = 2; g.strokeRect(bx, by, bw, bh);
      g.font = '600 24px ' + mono; g.textAlign = 'center';
      g.fillStyle = hover ? '#001a08' : (blink ? '#00ff41' : '#7dffa0');
      g.fillText('[ CLICK TO ENTER ]', W / 2, by + 18);
      g.textAlign = 'left';
    }
    g.shadowBlur = 0;
  }
  // scanlines + edge vignette
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let yy = 0; yy < H; yy += 3) g.fillRect(0, yy, W, 1);
  const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

/* ---------------- 3D ---------------- */
function stop(){ running = false; cancelAnimationFrame(raf); }
function start(){ if (!running){ running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
let last = 0, loop = () => {};

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
  scene.fog = new THREE.Fog(0x000000, 2.2, 5.2);
  const camera = new THREE.PerspectiveCamera(36, 1, .01, 20);

  /* materials: everything recoloured into a dark, terminal-room palette */
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({color:c, roughness:.78, metalness:.05}, o));
  const PALETTE = {
    wood: M(0x14171a), woodDark: M(0x0e1012), metal: M(0x2a3034, {metalness:.55, roughness:.38}),
    metalDark: M(0x0c0e10, {metalness:.45, roughness:.45}), metalMedium: M(0x1a1f22, {metalness:.4, roughness:.5}),
    carpet: M(0x0b1a10), carpetDarker: M(0x07110a), carpetWhite: M(0x2b302d), plant: M(0x0f5a2a, {roughness:.6}),
    lamp: new THREE.MeshBasicMaterial({color:0x4a3214}),
    glass: M(0x07122a, {emissive:0x0c2250, emissiveIntensity:.45, roughness:.15, metalness:.2}),
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

  /* load models */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, done, total) => { loadPct.textContent = Math.round(done / total * 100) + '%'; };
  const loader = new GLTFLoader(manager);
  const NAMES = ['desk','computerScreen','computerKeyboard','computerMouse','chairDesk','lampRoundTable','plantSmall1',
                 'pottedPlant','books','bookcaseOpenLow','rugRectangle','floorFull','wall','wallWindow'];
  let models = {};
  try {
    const got = await Promise.all(NAMES.map(n => loader.loadAsync(ROOT_URL + n + '.glb')));
    NAMES.forEach((n, i) => models[n] = got[i].scene);
  } catch (e) { leave(true); return; }
  const put = (name, x, y, z, ry = 0) => {
    const o = restyle(models[name].clone(true));
    o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o;
  };

  /* room: floor, back wall with a window, left wall */
  for (let ix = -2; ix <= 1; ix++) for (let iz = 0; iz <= 3; iz++) put('floorFull', ix, -.05, iz - .44 + 1);
  put('wall', -1.5, 0, -.39); put('wall', -.5, 0, -.39); put('wallWindow', .5, 0, -.39);
  for (let iz = 0; iz < 3; iz++) put('wall', -1.5, 0, iz + .56, Math.PI / 2);
  put('rugRectangle', -.785, 0, .98);

  /* desk + setup; desk top is y = .384 */
  const TOP = .384;
  put('desk', -.357, 0, 0);
  put('computerScreen', -.197, TOP, -.21);
  put('computerKeyboard', -.141, TOP, -.035);
  put('computerMouse', .205, TOP, -.045);
  put('lampRoundTable', -.372, TOP, -.235);
  put('books', .205, TOP, -.215);
  put('plantSmall1', .312, TOP, -.11);
  put('chairDesk', .168, 0, .52, Math.PI);
  put('pottedPlant', -1.18, 0, -.2);
  put('bookcaseOpenLow', -1.44, 0, .25, Math.PI / 2);

  /* the live screen: a plane just in front of the monitor panel */
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

  /* post: soft bloom so the screen and lamp actually glow */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .45, .82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* camera rig */
  const HOME = {pos:new THREE.Vector3(.2, .64, .62), look:new THREE.Vector3(0, .53, -.21)};
  const INTRO = {pos:new THREE.Vector3(.55, .86, 1.45)};
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let mx = 0, my = 0, smx = 0, smy = 0;

  function coverDistance(){
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return Math.min((SCREEN.h / 2) / t, (SCREEN.w / 2) / (t * camera.aspect)) * .985;
  }
  function resize(){
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, {passive:true}); resize();

  /* pointer: parallax + hover on the monitor */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  root.addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
    ndc.set(mx * 2, -my * 2);
    if (state !== 'idle'){ return; }
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObject(screenMesh).length > 0;
    if (h !== hover){ hover = h; dirty = true; canvas.style.cursor = h ? 'pointer' : ''; }
  });
  canvas.addEventListener('click', () => { if (state === 'idle') enter(); });
  root.addEventListener('wheel', e => { if (state === 'idle' && e.deltaY > 18) enter(); }, {passive:true});

  /* fly-in / fly-out */
  let fly = null;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function screenEnd(){ return new THREE.Vector3(SCREEN.cx, SCREEN.cy, SCREEN.z + coverDistance()); }

  enter = function(){
    if (state !== 'idle') return;
    state = 'flying'; hover = false; canvas.style.cursor = ''; root.classList.add('flying');
    screenMode = 'open'; dirty = true; Sound.whoosh();
    fly = {t0:performance.now(), dur:1850, fromPos:camPos.clone(), fromLook:camLook.clone(),
           toPos:screenEnd(), toLook:screenCenter.clone(), dir:1};
  };
  window.openDesk = function(){
    if (state !== 'gone') return;
    state = 'returning';
    D.classList.add('desk-on'); dispatchEvent(new Event('desk:enter'));
    root.classList.remove('hidden', 'fast', 'flying');
    screenMode = 'open'; typed = 0; dirty = true;
    camPos.copy(screenEnd()); camLook.copy(screenCenter);
    start();
    requestAnimationFrame(() => root.classList.remove('out'));
    setTimeout(() => {
      screenMode = 'boot'; dirty = true;
      fly = {t0:performance.now(), dur:1700, fromPos:camPos.clone(), fromLook:camLook.clone(),
             toPos:HOME.pos.clone(), toLook:HOME.look.clone(), dir:-1};
    }, 450);
  };

  /* main loop */
  let introT0 = performance.now(), lastBlink = 0, clickN = 0;
  camPos.copy(INTRO.pos); camLook.copy(HOME.look);
  loop = function(now){
    if (!running) return;
    const dt = Math.min(60, now - last); last = now;

    // screen typing + blink
    if (screenMode === 'boot' && typed < TOTAL && (state === 'idle' || state === 'loading')){
      typeAcc += dt * .045;
      while (typeAcc >= 1 && typed < TOTAL){ typeAcc -= 1; typed++; if ((++clickN & 1) === 0) Sound.click(); }
      dirty = true;
    }
    if (now - lastBlink > 520){ lastBlink = now; blink = !blink; dirty = true; }
    if (dirty){ drawScreen(); tex.needsUpdate = true; dirty = false; }

    // camera
    smx += (mx - smx) * .05; smy += (my - smy) * .05;
    if (fly){
      const t = Math.min(1, (now - fly.t0) / fly.dur), e = ease(t), el = easeOut(Math.min(1, t * 1.35));
      camPos.lerpVectors(fly.fromPos, fly.toPos, e);
      camLook.lerpVectors(fly.fromLook, fly.toLook, fly.dir > 0 ? el : e);
      if (t >= 1){
        const dir = fly.dir; fly = null;
        if (dir > 0) leave(false);
        else { state = 'idle'; root.classList.remove('flying'); }
      }
      camera.position.copy(camPos);
    } else if (state === 'idle' || state === 'loading'){
      const it = Math.min(1, (now - introT0) / 2600), e = easeOut(it);
      const base = new THREE.Vector3().lerpVectors(INTRO.pos, HOME.pos, e);
      const breathe = Math.sin(now / 2400) * .006;
      camPos.set(base.x + smx * .07, base.y - smy * .035 + breathe, base.z);
      camera.position.copy(camPos);
    } else camera.position.copy(camPos);
    camera.lookAt(camLook);

    glow.intensity = .62 + Math.sin(now / 900) * .04;
    composer.render();
    raf = requestAnimationFrame(loop);
  };

  /* fonts first so the terminal draws in JetBrains Mono */
  try { await Promise.race([document.fonts.load('24px "JetBrains Mono"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  drawScreen(); tex.needsUpdate = true;
  loadEl.classList.add('done');
  root.classList.add('ready');
  state = 'idle'; introT0 = performance.now();
  start();
  canvas.focus({preventScroll:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (state !== 'gone') start(); });
}
let enter = () => {};
if (window.__deskMode === 'return'){ D.classList.add('desk-on'); }
/* slow network: don't hold anyone on a loading screen */
setTimeout(() => { if (state === 'loading') leave(true); }, 12000);
main();
