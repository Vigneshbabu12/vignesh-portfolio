/* ═══════════════════════════════════════════════════════════
   v2 sky — a living cloudscape drawn on the GPU.

   One full-screen WebGL quad. The fragment shader builds three cloud layers
   from layered value noise (fBm), lights them from the sun by comparing the
   density toward the light, and composes them over the chapter's sky
   gradient. Everything is uniforms, so:
     · time      → the clouds drift and slowly change shape on their own
     · progress  → scrolling the hero pushes the decks up AND warps the noise
                   domain, so they visibly evolve as they part (not a slide)
     · colours   → read from the CSS custom properties on <body>, so each
                   chapter re-lights the same sky; eased in JS.
   Runs after site.js. Layout and existing behaviour are untouched.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const scene = document.getElementById('scene');
  const canvas = document.getElementById('skyGL');
  if (!scene || !canvas) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = location.search;
  if (/[?&]raw=1/.test(qs)) document.body.classList.add('sc-raw');
  if (/[?&]nl=1/.test(qs))  document.body.classList.add('sc-nl');    // hide the loader for renders
  const FORCE_LANDED = /[?&]land=1/.test(qs);
  // sky presets: default = "soft" — paler, fluffier, clouds across the whole
  // fold (the approved look); ?sky=corner = clouds in the corners, clear centre
  const SOFT = !/[?&]sky=corner/.test(qs);
  document.body.classList.toggle('sky-soft', SOFT);
  const PRESET = SOFT ? { cover: -.045, soft: 1.9, room: .45 } : { cover: 0, soft: 1, room: 1 };

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' })
          || canvas.getContext('experimental-webgl');
  if (!gl) { document.body.classList.add('sc-static'); return; }

  /* ── shaders ── */
  const VERT = `
    attribute vec2 a; varying vec2 v;
    void main(){ v = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }`;

  const FRAG = `
    precision highp float;
    varying vec2 v;
    uniform vec2  uRes;
    uniform float uTime, uProg, uDrift, uCloudO, uSunO, uCover, uSoft, uRoomMix;
    uniform vec3  uSky1, uSky2, uSky3, uLit, uMid, uShade, uSunC;

    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      float a = hash(i), b = hash(i + vec2(1., 0.)), c = hash(i + vec2(0., 1.)), d = hash(i + vec2(1., 1.));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p){
      float s = 0., a = .55; mat2 m = mat2(1.62, 1.18, -1.18, 1.62);
      for (int i = 0; i < 6; i++) { s += a * noise(p); p = m * p + 3.1; a *= .5; }
      return s;
    }
    // where the clouds are allowed to live: the upper corners, thinning toward
    // the centre and gone at the bottom, so the name always sits in clear air
    float room(vec2 uv, float open){
      float vert = 1. - smoothstep(.30, .70 + open * .1, uv.y);
      float hole = smoothstep(.10, .48 + open * .1, distance(uv * vec2(1., 1.35), vec2(.5, .40 * 1.35)));
      return mix(1., vert * max(hole, .06), uRoomMix);
    }
    // cloud field: broad fBm for the masses, a finer fBm riding on top for the
    // billows, squashed horizontally the way cumulus really sit
    float cloud(vec2 p){
      p.y *= 1.25;
      float base = fbm(p);
      float det  = fbm(p * 3.3 + 17.1);
      return base + (det - .5) * .30;
    }
    // one deck: density, then shading by the density gradient toward the sun
    vec4 deck(vec2 uv, float scale, vec2 wind, vec2 warp, float cover, float soft, float seed, vec2 toSun){
      vec2 p = uv * scale + wind * uTime + warp * uProg + seed;
      float n  = cloud(p);
      float n2 = cloud(p + toSun * .06);
      cover += uCover; soft *= uSoft;
      float body = smoothstep(cover, cover + soft, n);            // crisp billow edge
      float haze = smoothstep(cover - .10, cover + soft, n) * .30; // thin veil around it
      float d = max(body, haze);
      // lit where the cloud thins toward the light, shaded where it thickens
      float lit  = clamp((n - n2) * 16. + .5, 0., 1.);
      float core = smoothstep(cover + soft, cover + soft + .14, n);
      vec3 col = mix(uShade, uMid, lit);
      col = mix(col, uLit, lit * (.35 + core * .65));
      return vec4(col, d);
    }
    void main(){
      vec2 uv = vec2(v.x, 1. - v.y);                 // y down, like the page
      float ar = uRes.x / uRes.y;
      // sky
      float g = uv.y;
      vec3 sky = mix(uSky1, uSky2, smoothstep(0., .55, g));
      sky = mix(sky, uSky3, smoothstep(.45, 1., g));
      // sun bloom high on the left
      vec2 sunP = vec2(.24, .10);
      float sd = distance(vec2(uv.x * ar, uv.y), vec2(sunP.x * ar, sunP.y));
      sky += uSunC * (exp(-sd * 3.2) * .55 + exp(-sd * 9.) * .25) * uSunO;

      vec2 toSun = normalize(sunP - vec2(.5, .5));
      vec2 q = vec2(uv.x * ar, uv.y);
      float open = smoothstep(0., 1., uProg);
      vec3 col = sky;
      // far: small, slow, stays as high cirrus
      { vec2 s = q + vec2(0., open * .38 + uDrift * .06);
        vec4 c = deck(s, 2.6, vec2(.010, .002), vec2(.10, .35), .60 + open * .06, .09, 11.3, toSun);
        float a = c.a * room(uv + vec2(0., open * .38), open) * .78 * uCloudO;
        col = mix(col, c.rgb, a); }
      // mid
      { vec2 s = q + vec2(0., open * .70 + uDrift * .03);
        vec4 c = deck(s, 1.55, vec2(.016, .004), vec2(.28, .55), .60 + open * .12, .08, 4.7, toSun);
        float a = c.a * room(uv + vec2(0., open * .70), open) * .9 * uCloudO * (1. - open * .5);
        col = mix(col, c.rgb, a); }
      // near: the big soft ones we fly through
      { vec2 s = q + vec2(0., open * 1.05);
        vec4 c = deck(s, .95, vec2(.024, .006), vec2(.45, .85), .61 + open * .22, .08, 27.9, toSun);
        float a = c.a * room(uv + vec2(0., open * 1.05), open) * uCloudO * (1. - open);
        col = mix(col, c.rgb, a); }
      gl_FragColor = vec4(col, 1.);
    }`;

  function compile(type, src) {
    const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn('v2 sky shader:', gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { document.body.classList.add('sc-static'); return; }
  const pgm = gl.createProgram(); gl.attachShader(pgm, vs); gl.attachShader(pgm, fs); gl.linkProgram(pgm);
  if (!gl.getProgramParameter(pgm, gl.LINK_STATUS)) { document.body.classList.add('sc-static'); return; }
  gl.useProgram(pgm);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(pgm, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes','uTime','uProg','uDrift','uCloudO','uSunO','uCover','uSoft','uRoomMix','uSky1','uSky2','uSky3','uLit','uMid','uShade','uSunC']
    .forEach(n => U[n] = gl.getUniformLocation(pgm, n));

  /* ── size: render a little under native resolution — the clouds are soft, the
     saving is real (mobile GPUs especially) ── */
  const MOBILE = () => innerWidth < 760;
  function resize() {
    const scale = MOBILE() ? .55 : Math.min(devicePixelRatio || 1, 1.25) * .8;
    const w = Math.round(innerWidth * scale), h = Math.round(innerHeight * scale);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  addEventListener('resize', resize, { passive: true }); resize();

  /* ── colours from the chapter's CSS variables, eased ── */
  const body = document.body;
  // registered @property colours come back from getComputedStyle as rgb(); plain ones as hex
  const col = str => {
    str = (str || '').trim();
    let m = str.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255];
    if (str[0] === '#') {
      if (str.length === 4) str = '#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
      return [parseInt(str.slice(1, 3), 16) / 255, parseInt(str.slice(3, 5), 16) / 255, parseInt(str.slice(5, 7), 16) / 255];
    }
    return null;
  };
  const VARS = { uSky1: '--sk1', uSky2: '--sk2', uSky3: '--sk3', uLit: '--cl', uMid: '--clmid', uShade: '--clsh', uSunC: '--sunc' };
  const NUMS = { uCloudO: ['--cl-o', 1], uSunO: ['--sun-o', .75] };
  const cur = {}, tgt = {};
  function readTargets() {
    const cs = getComputedStyle(body);
    for (const k in VARS) { const c = col(cs.getPropertyValue(VARS[k])); if (c) { tgt[k] = c; if (!cur[k]) cur[k] = c.slice(); } }
    for (const k in NUMS) { const n = parseFloat(cs.getPropertyValue(NUMS[k][0])); tgt[k] = isNaN(n) ? NUMS[k][1] : n; if (cur[k] == null) cur[k] = tgt[k]; }
  }
  readTargets();
  new MutationObserver(readTargets).observe(body, { attributes: true, attributeFilter: ['data-chapter'] });

  /* ── scroll → descent progress (0 = in the clouds, 1 = clear air) ── */
  const hero = document.getElementById('hero'), about = document.getElementById('about');
  const veil = scene.querySelector('.sc-veil');
  let progTarget = FORCE_LANDED ? 1 : 0, prog = progTarget, drift = 0;
  function measure() {
    const y = window.pageYOffset || 0;
    if (!hero || !about) return;
    // finish when About's top reaches 30% down the viewport
    const end = about.offsetTop - innerHeight * .30;
    progTarget = FORCE_LANDED ? 1 : Math.max(0, Math.min(1, y / Math.max(1, end)));
    // slow parallax for the rest of the page
    drift = Math.max(0, y - end) / Math.max(1, document.documentElement.scrollHeight - innerHeight);
  }
  addEventListener('scroll', measure, { passive: true }); measure();
  const veilMax = () => parseFloat(getComputedStyle(body).getPropertyValue('--veil-max')) || .5;
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ── frame loop ── */
  let t0 = performance.now(), last = t0, running = true, shown = false;
  const lerp = (a, b, k) => a + (b - a) * k;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const time = REDUCED ? 0 : (now - t0) / 1000;
    prog = lerp(prog, progTarget, 1 - Math.exp(-dt * 6));           // scrub smoothing
    const k = 1 - Math.exp(-dt * 3.2);                                // ~1s colour ease, close to the text swap
    for (const n in VARS) if (tgt[n]) for (let i = 0; i < 3; i++) cur[n][i] = lerp(cur[n][i], tgt[n][i], k);
    for (const n in NUMS) cur[n] = lerp(cur[n], tgt[n], k);

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uProg, prog);
    gl.uniform1f(U.uDrift, drift);
    gl.uniform1f(U.uCloudO, cur.uCloudO);
    gl.uniform1f(U.uSunO, cur.uSunO);
    gl.uniform1f(U.uCover, PRESET.cover); gl.uniform1f(U.uSoft, PRESET.soft); gl.uniform1f(U.uRoomMix, PRESET.room);
    for (const n in VARS) if (cur[n]) gl.uniform3fv(U[n], cur[n]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (veil) veil.style.opacity = (veilMax() * smooth(.42, .95, prog)).toFixed(3);
    if (!shown) { shown = true; canvas.classList.add('on'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  });
})();

/* ═══════════ ABOUT carriage — scroll-scrubbed arrival ═══════════ */
(() => {
  'use strict';
  const card = document.getElementById('aboutCard');
  if (!card || !window.gsap || !window.ScrollTrigger) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  const img = card.querySelector('.about-portrait img'), streaks = card.querySelector('.streaks');
  // phones: the card is tall and the column narrow, so a sideways slide would
  // hang half off-screen while the copy is already being read — rise instead,
  // and finish early
  const PHONE = innerWidth < 820;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '#about', start: 'top 100%', end: PHONE ? 'top 55%' : 'top 22%', scrub: .9, invalidateOnRefresh: true }
  });
  // the carriage pulls in from the right and levels off; the portrait settles
  // a beat later; the window streaks are brightest mid-arrival, gone at rest
  if (PHONE) {
    tl.fromTo(card, { y: 90, opacity: .2 }, { y: 0, opacity: 1, ease: 'power2.out' }, 0);
  } else {
    tl.fromTo(card, { x: () => Math.min(innerWidth * .6, 720), rotate: 1.4, opacity: .15 },
                    { x: 0, rotate: 0, opacity: 1, ease: 'power2.out' }, 0);
  }
  tl.fromTo(img, { y: 40, scale: .9, transformOrigin: '50% 100%' }, { y: 0, scale: 1, ease: 'power2.out' }, .1)
    .fromTo(streaks, { opacity: 0 }, { opacity: 1, ease: 'power1.out', duration: .35 }, 0)
    .to(streaks, { opacity: 0, ease: 'power1.in', duration: .45 }, .55);
  // landed on a refresh with the card already in view? play the arrival once
  // anyway so the streaks are seen, then hand control back to the scrub
  requestAnimationFrame(() => {
    const r = card.getBoundingClientRect();
    if (r.top < innerHeight * .9 && r.bottom > 0 && tl.scrollTrigger.progress > .6) {
      gsap.fromTo(streaks, { opacity: 1 }, { opacity: 0, duration: 1.8, ease: 'power2.in', delay: .3, overwrite: 'auto' });
    }
  });
})();
