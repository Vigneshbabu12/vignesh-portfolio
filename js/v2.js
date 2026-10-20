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
  // ?cards=solid — local variant of the project cards: white rounded card,
  // solid brand-colour media panel with the shot cropped into it, cursor label.
  if (new URLSearchParams(location.search).get('cards') !== 'aurora') {
    document.body.classList.add('cards-solid');
    document.querySelectorAll('.panel').forEach(p => {
      const m = p.querySelector('.pcard-media'), cs = p.querySelector('.panel-cs');
      if (!m) return;
      m.setAttribute('data-cursor', 'Click to view');
      if (cs) { m.style.cursor = 'pointer'; m.addEventListener('click', () => cs.click()); }
    });
  }
  // ?hero=window — local variant of the top fold: badge pill, two-line claim,
  // product window peeking from the fold (Meetmind-style), same cloud sky.
  if (new URLSearchParams(location.search).get('hero') === 'window') {
    document.body.classList.add('hw-on');
    const inner = document.querySelector('.hero-inner'), name = document.querySelector('.hero-name'), btn = document.querySelector('.hero .btn');
    if (inner && name && btn) {
      const badge = document.createElement('p'); badge.className = 'hero-badge';
      badge.innerHTML = '<b>18K+</b> followers <i>·</i> <span>on LinkedIn</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>';
      name.before(badge);
      const claim = document.createElement('h2'); claim.className = 'hero-claim';
      claim.innerHTML = 'I turn complex problems into<br><span>elegant digital experiences.</span>';
      const roles = document.querySelector('.hero-roles'); (roles || name).after(claim);
      const win = document.createElement('div'); win.className = 'hero-window'; win.setAttribute('aria-hidden', 'true');
      // asset prefix from an image already on the page (root serves assets/, the v2 workbench ../assets/)
      const anyImg = document.querySelector('img[src*="assets/"]'), prefix = anyImg ? anyImg.getAttribute('src').split('assets/')[0] : '';
      win.innerHTML = '<div class="hw-bar"><i></i><i></i><i></i><span></span></div><img src="' + prefix + 'assets/kanakku-dashboard.png?v=2" alt="">';
      btn.after(win);
    }
  }
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
    uniform float uTime, uProg, uDrift, uCloudO, uSunO, uCover, uSoft, uRoomMix, uZoom;
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
      uv = (uv - .5) / uZoom + .5;                   // dive: push the camera into the decks
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
  const U = {}; ['uRes','uTime','uProg','uDrift','uCloudO','uSunO','uCover','uSoft','uRoomMix','uZoom','uSky1','uSky2','uSky3','uLit','uMid','uShade','uSunC']
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
    gl.uniform1f(U.uZoom, window.__skyZoom || 1);
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
  // ?t=paper  — the card arrives like a sheet of paper on the wind
  // ?t=dive   — pmkrishna-style: the hero pins, the camera dives through the
  //             clouds, the copy flies past, then the card rises over the sky
  // (default) — the carriage slide
  const T = (location.search.match(/[?&]t=(paper|dive)/) || [])[1] || 'slide';
  if (T === 'dive' && !PHONE) {
    const hero = document.getElementById('hero'), inner = hero.querySelector('.hero-inner'), foot = hero.querySelector('.hero-foot');
    const zoom = { v: 1 };
    const dive = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=110%', pin: true, pinSpacing: true, scrub: .8, invalidateOnRefresh: true } })
      .to(inner, { scale: 1.9, y: -60, opacity: 0, filter: 'blur(6px)', ease: 'power2.in', duration: .55 }, 0)
      .to(foot,  { opacity: 0, duration: .25 }, 0)
      .to(zoom,  { v: 2.6, ease: 'power1.in', duration: 1, onUpdate: () => { window.__skyZoom = zoom.v; } }, 0);
    const mine = new Set(dive.getChildren());
    // site.js adds its own hero "camera push" on .hero-inner once the loader
    // finishes; two scrubs on the same props fight and the hero looks stuck
    // mid-pin. Retire the other one as soon as it appears.
    const killOthers = () => gsap.getTweensOf(inner).forEach(t => { if (!mine.has(t)) { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); } });
    const poll = setInterval(killOthers, 250); setTimeout(() => clearInterval(poll), 12000);
    ScrollTrigger.addEventListener('refresh', killOthers);
    document.body.classList.add('t-dive');
  }
  // ARRIVAL — scrubbed to the card's own entry: from the moment it appears at
  // the bottom until it reaches its resting spot. Desktop: the carriage pulls
  // in from the right with a tilt and levels off; phones: it rises.
  const tl = gsap.timeline({
    scrollTrigger: { trigger: card, start: 'top 100%', end: PHONE ? 'top 55%' : 'top 14%', scrub: .9, invalidateOnRefresh: true }
  });
  if (PHONE) {
    tl.fromTo(card, { y: 90, opacity: .2 }, { y: 0, opacity: 1, ease: 'power2.out' }, 0);
  } else if (T === 'dive') {
    tl.fromTo(card, { y: '45vh', opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, ease: 'power2.out' }, 0);
  } else if (T !== 'paper') {
    gsap.set(card, { transformOrigin: '50% 50%' });
    // no `y` on the card itself: the DWELL pin below also writes the card's y,
    // and two writers left a 70px residue that pushed the card into the stats
    tl.fromTo(card, { x: () => Math.min(innerWidth * .55, 680), rotate: 3.2, opacity: .15 },
                    { x: 0, rotate: 0, opacity: 1, ease: 'power2.out' }, 0);
  }
  if (T !== 'paper') tl.fromTo(img, { y: 40, scale: .9, transformOrigin: '50% 100%' }, { y: 0, scale: 1, ease: 'power2.out' }, .1)
    .fromTo(streaks, { opacity: 0 }, { opacity: 1, ease: 'power1.out', duration: .35 }, 0)
    .to(streaks, { opacity: 0, ease: 'power1.in', duration: .45 }, .55);

  if (!PHONE && T === 'paper' && document.getElementById('aboutPaper')) {
    document.body.classList.add('t-paper');
    const words = [].concat(...[...card.querySelectorAll('.story-line')].map(l => [...l.querySelectorAll('.w')]));
    const content = [...card.children].filter(el => !el.classList.contains('about-paper'));
    const cv = document.getElementById('aboutPaper'), ctx = cv.getContext('2d'), disp = document.getElementById('paperDisp');
    // the keyed stop-motion sheet: 48 frames, 0 = tight ball, 47 = flat
    const N = 48, frames = [], seq = { i: 0 };
    for (let i = 0; i < N; i++) { const im = new Image(); im.decoding = 'async'; im.src = `assets/paper/f${String(i).padStart(2, '0')}.webp`; im.onload = () => { if (i === 0) draw(); }; frames.push(im); }
    let box = { w: 0, h: 0 };
    function fit() {
      const r = card.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      box = { w: r.width, h: r.height };
      cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
      // content scales from the sheet's centre, so the portrait and copy grow with the paper
      content.forEach(el => { const e = el.getBoundingClientRect(); el.style.transformOrigin = `${r.left + r.width / 2 - e.left}px ${r.top + r.height / 2 - e.top}px`; });
    }
    function draw() {
      const k = Math.min(N - 1, Math.max(0, Math.round(seq.i))), im = frames[k]; if (!im || !im.complete || !im.naturalWidth) return;
      if (!cv.width) fit();
      ctx.clearRect(0, 0, cv.width, cv.height);
      const s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      // mask strip: frame height follows the card width (16:9), centred vertically like the canvas
      const fh = box.w * 270 / 480, y = (box.h - fh) / 2 - k * fh;
      card.style.webkitMaskPosition = card.style.maskPosition = `0 ${y.toFixed(1)}px`;
      card.classList.toggle('flat', k >= N - 1);
      // the content un-crumples with the sheet
      const p = k / (N - 1); if (disp) disp.setAttribute('scale', (52 * (1 - p) * (1 - p)).toFixed(1));
      card.classList.toggle('unopened', k < N - 1);
    }
    addEventListener('resize', () => { fit(); draw(); }, { passive: true });
    requestAnimationFrame(() => { fit(); draw(); });
    card.classList.add('unopened');
    gsap.set(content, { scale: .3 });
    gsap.set(words, { opacity: .16 });
    // 1) the sheet unfolds WHILE it scrolls up into place — from the moment it
    //    enters at the bottom until it reaches its resting spot
    gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 96%', end: 'top 14%', scrub: .45, invalidateOnRefresh: true } })
      .to(seq, { i: N - 1, ease: 'none', onUpdate: draw }, 0)
      .to(content, { scale: 1, ease: 'power1.inOut' }, 0)
      .to(cv, { opacity: .62, ease: 'none' }, 0);
    // 2) then it pins: streaks, the word-by-word story, a held beat, release
    const paper = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 14%', end: '+=150%', pin: true, pinSpacing: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true } });
    paper.fromTo(streaks, { opacity: 0 }, { opacity: 1, duration: .06 }, 0).to(streaks, { opacity: 0, duration: .14 }, .08)
         .to(words, { opacity: 1, ease: 'none', duration: .016, stagger: .014 }, .06)
         .to({}, { duration: .14 });                                  // hold before release
    // site.js scrubs the same words against the (now pinned) story block — retire it
    const storyBlock = card.querySelector('.story');
    const killStory = () => ScrollTrigger.getAll().forEach(st => { if (st.trigger === storyBlock) st.kill(); });
    const poll2 = setInterval(killStory, 250); setTimeout(() => clearInterval(poll2), 12000); ScrollTrigger.addEventListener('refresh', killStory);
    tl.kill();                                                      // no second arrival tween on the card
  }

  // DWELL — desktop only: once home, the card pins and the story reveals word
  // by word as you scroll; a held beat after the last word, then it releases.
  if (!PHONE && T !== 'paper') {
    const words = [].concat(...[...card.querySelectorAll('.story-line')].map(l => [...l.querySelectorAll('.w')]));
    if (words.length) {
      gsap.set(words, { opacity: .16 });
      gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 14%', end: '+=130%', pin: true, pinSpacing: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true } })
        .to(words, { opacity: 1, ease: 'none', duration: .016, stagger: .016 }, .04)
        .to({}, { duration: .16 });
      // site.js scrubs the same words against the (now pinned) story block — retire it
      const storyBlock = card.querySelector('.story');
      const killStory = () => ScrollTrigger.getAll().forEach(st => { if (st.trigger === storyBlock) st.kill(); });
      const pollS = setInterval(killStory, 250); setTimeout(() => clearInterval(pollS), 12000); ScrollTrigger.addEventListener('refresh', killStory);
    }
  }

  // landed on a refresh with the card already in view? play the arrival once
  // anyway so the streaks are seen, then hand control back to the scrub
  requestAnimationFrame(() => {
    const r = card.getBoundingClientRect();
    if (r.top < innerHeight * .9 && r.bottom > 0 && tl.scrollTrigger && tl.scrollTrigger.progress > .6) {
      gsap.fromTo(streaks, { opacity: 1 }, { opacity: 0, duration: 1.8, ease: 'power2.in', delay: .3, overwrite: 'auto' });
    }
  });
})();

/* ═══════════ CASE STUDY — reader chrome, routing, next-up ═══════════
   Layers on the existing modal (site.js owns open/close): adds a back control,
   a reading-progress bar, a "next case study" list, #case/<key> deep links,
   and browser-back support. */
(() => {
  'use strict';
  const modal = document.getElementById('csModal'), scroll = document.getElementById('csScroll');
  if (!modal || !scroll) return;
  const card = modal.querySelector('.cs-card');
  const tpls = {}; document.querySelectorAll('.cs-tpl').forEach(t => { tpls[t.dataset.case] = t; });
  const keys = Object.keys(tpls);
  const triggerFor = key => document.querySelector(`.panel-cs[data-case="${key}"], [data-case="${key}"]:not(template)`);
  let current = null, closingFromHash = false;

  // ── chrome: back button + progress bar (once)
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'cs-back'; back.setAttribute('data-cs-close', '');
  back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>All work</span>';
  const bar = document.createElement('div'); bar.className = 'cs-progress';
  card.prepend(back); card.prepend(bar);
  scroll.addEventListener('scroll', () => {
    const max = scroll.scrollHeight - scroll.clientHeight;
    bar.style.width = max > 0 ? (scroll.scrollTop / max * 100).toFixed(1) + '%' : '0%';
  }, { passive: true });

  // ── metadata for the next-up cards, read from the templates
  const meta = key => {
    const c = tpls[key].content;
    const title = c.querySelector('.cs-title')?.textContent.trim() || key;
    const eyebrow = (c.querySelector('.cs-eyebrow')?.textContent || '').replace(/·\s*\d+ min read/, '').replace(/Case study\s*·\s*/i, '').trim();
    const img = tpls[key].dataset.thumb || c.querySelector('.cs-shot img, .cs-phone img, img')?.getAttribute('src') || '';
    return { title, eyebrow, img };
  };

  function decorate(key) {
    current = key;
    const art = scroll.querySelector('article.cs'); if (!art) return;
    if (art.querySelector('.cs-next')) return;
    // hero: copy on the left, cover frame on the right; the meta strip below both
    const hero = art.querySelector('.cs-hero');
    if (hero && !hero.querySelector('.cs-hero-in')) {
      const chips = hero.querySelector('.cs-chips');
      const inner = document.createElement('div'); inner.className = 'cs-hero-in';
      const copy = document.createElement('div'); copy.className = 'cs-hero-copy';
      [...hero.children].forEach(el => { if (el !== chips) copy.appendChild(el); });
      const cover = document.createElement('div'); cover.className = 'cs-cover';
      const m = meta(key); if (m.img) cover.innerHTML = `<img src="${m.img}" alt="">`;
      inner.appendChild(copy); inner.appendChild(cover);
      hero.prepend(inner); if (chips) hero.appendChild(chips);
    }
    const others = keys.filter(k => k !== key);
    const nav = document.createElement('nav'); nav.className = 'cs-next'; nav.setAttribute('aria-label', 'More case studies');
    nav.innerHTML = '<div class="cs-label">Next case study</div><div class="cs-next-grid">' +
      others.map(k => { const m = meta(k); return `<a href="#works" data-next="${k}"><div class="thumb" style="background-image:url('${m.img}')"></div><div class="meta"><span class="k">${m.eyebrow}</span><span class="t">${m.title}</span></div></a>`; }).join('') +
      '</div><a class="all" href="#works" data-cs-close>← Back to all work</a>';
    art.appendChild(nav);
    nav.addEventListener('click', e => {
      const a = e.target.closest('[data-next]'); if (!a) return;
      e.preventDefault(); e.stopPropagation();
      const t = triggerFor(a.dataset.next); if (t) { t.click(); scroll.scrollTop = 0; }
    });
    // keep the custom accent on the back control
    back.style.setProperty('--cs-accent', card.style.getPropertyValue('--cs-accent'));
    buildToc(art);
  }

  // ── left-side section navigation with scroll-spy
  let toc = null, spy = null;
  function buildToc(art) {
    if (toc) toc.remove(); if (spy) spy.disconnect();
    const secs = [...art.querySelectorAll('.cs-sec')].filter(s => s.querySelector(':scope > .cs-label'));
    if (!secs.length) return;
    toc = document.createElement('nav'); toc.className = 'cs-toc'; toc.setAttribute('aria-label', 'On this page');
    toc.innerHTML = '<div class="cs-label">Contents</div>';
    secs.forEach((s, i) => {
      s.id = s.id || 'cs-s' + i;
      const a = document.createElement('a'); a.href = '#' + s.id; a.textContent = s.querySelector(':scope > .cs-label').textContent.trim();
      a.addEventListener('click', e => { e.preventDefault(); scroll.scrollTo({ top: s.offsetTop - 72, behavior: 'smooth' }); });
      toc.appendChild(a);
    });
    card.appendChild(toc);
    const links = [...toc.querySelectorAll('a')];
    spy = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { links.forEach(l => l.classList.remove('on')); const l = links[secs.indexOf(en.target)]; if (l) { l.classList.add('on'); l.scrollIntoView({ block: 'nearest' }); } } });
    }, { root: scroll, rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    secs.forEach(s => spy.observe(s));
  }

  // ── react to site.js opening/closing the shell
  new MutationObserver(() => {
    const open = modal.classList.contains('is-open');
    if (open) {
      const t = scroll.querySelector('.cs-title')?.textContent.trim();
      const key = keys.find(k => tpls[k].content.querySelector('.cs-title')?.textContent.trim() === t) || keys[0];
      decorate(key);
      if (location.hash !== '#case/' + key) history.pushState({ cs: key }, '', '#case/' + key);
    } else if (current) {
      current = null;
      if (!closingFromHash && /^#case\//.test(location.hash)) history.pushState({}, '', '#works');
      closingFromHash = false;
    }
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });

  // ── deep link + browser back
  const openFromHash = () => {
    const m = location.hash.match(/^#case\/([a-z]+)/);
    if (m && tpls[m[1]]) { if (current !== m[1]) { const t = triggerFor(m[1]); if (t) t.click(); } }
    else if (current) { closingFromHash = true; (modal.querySelector('.cs-close') || back).click(); }
  };
  addEventListener('popstate', openFromHash);
  addEventListener('hashchange', openFromHash);
  // after boot, honour a shared #case/… link
  const boot = () => { if (/^#case\//.test(location.hash)) setTimeout(openFromHash, 900); };
  if (document.readyState === 'complete') boot(); else addEventListener('load', boot);
})();

/* ═══════════ CASE STUDY — screenshot lightbox ═══════════
   Click any product screen inside a case study to see it full size, with
   caption, ←/→ between the screens of that study, Esc / × / backdrop to close. */
(() => {
  'use strict';
  const scroll = document.getElementById('csScroll');
  if (!scroll) return;
  const lb = document.createElement('div');
  lb.className = 'cs-lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Screenshot');
  lb.innerHTML = '<div class="lb-backdrop" data-lb-close></div>' +
    '<button type="button" class="lb-close" data-lb-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<button type="button" class="lb-nav lb-prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>' +
    '<button type="button" class="lb-nav lb-next" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button>' +
    '<figure class="lb-fig"><img alt=""><figcaption></figcaption><div class="lb-count"></div></figure>';
  document.body.appendChild(lb);
  const img = lb.querySelector('img'), cap = lb.querySelector('figcaption'), count = lb.querySelector('.lb-count');
  let list = [], i = 0, lastFocus = null;

  const shots = () => [...scroll.querySelectorAll('.cs-shot img, .cs-phone img, .cs-gallery img, .cs-webgrid img, .cs-browser img, .cs-how img')]
    .filter((el, idx, arr) => arr.indexOf(el) === idx);
  const captionFor = el => {
    const fig = el.closest('figure'); const fc = fig && fig.querySelector('figcaption');
    return (fc && fc.textContent.trim()) || el.getAttribute('alt') || '';
  };
  function show(n) {
    i = (n + list.length) % list.length;
    const el = list[i];
    img.src = el.currentSrc || el.src; img.alt = el.alt || '';
    cap.textContent = captionFor(el);
    count.textContent = list.length > 1 ? `${i + 1} / ${list.length}` : '';
    lb.classList.toggle('single', list.length < 2);
  }
  function open(el) {
    list = shots(); if (!list.length) return;
    lastFocus = document.activeElement;
    show(Math.max(0, list.indexOf(el)));
    lb.classList.add('is-open'); document.body.classList.add('lb-open');
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.classList.remove('is-open'); document.body.classList.remove('lb-open');
    setTimeout(() => { if (!lb.classList.contains('is-open')) img.removeAttribute('src'); }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  scroll.addEventListener('click', e => {
    const el = e.target.closest('.cs-shot img, .cs-phone img, .cs-gallery img, .cs-webgrid img, .cs-browser img, .cs-how img');
    if (!el || e.target.closest('a')) return;
    e.preventDefault(); open(el);
  });
  lb.addEventListener('click', e => {
    if (e.target.closest('[data-lb-close]')) return close();
    if (e.target.closest('.lb-prev')) return show(i - 1);
    if (e.target.closest('.lb-next')) return show(i + 1);
  });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'ArrowRight') show(i + 1);
  }, true);
})();
