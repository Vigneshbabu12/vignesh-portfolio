/* ═══════════════════════════════════════════════════════════
   Vignesh B — portfolio behaviour
   Lenis for smooth scroll, GSAP + ScrollTrigger for the story.
   Everything degrades: if the CDNs are unreachable the page still
   reads and reveals via IntersectionObserver.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ═══════════ CONTACT SETTINGS — edit these two lines ═══════════
     whatsapp: your number in full international form, digits only.
               India example: '919876543210'  (91 = country code, no +, no
               spaces, no leading zero). Leave it '' and the form quietly
               falls back to email instead.
     email:    the fallback address.                                        */
  const CONTACT = {
    whatsapp: '',                              // ← paste your number here
    email: 'vigneshmech68@gmail.com'
  };

  /* ═══════════ HERO BACKGROUND MEDIA — optional ═══════════
     Leave type:'none' and the hand-built CSS sky stays exactly as it is.
     Point it at a file and that becomes the hero backdrop instead, with a
     readability scrim and a soft blur at the bottom edge laid over it.

       type : 'none' | 'image' | 'video'
       src  : path to the file, e.g. 'assets/hero/valley.mp4'
       poster : still shown while a video loads, and used instead of the video
                on small screens and when the visitor prefers reduced motion.
       tone : 'light' | 'dark' — how the artwork reads, so the scrim and the
              hero type can adapt to it.                                     */
  const HERO_MEDIA = {
    type: 'none',
    src: 'assets/hero/valley.mp4',
    poster: 'assets/hero/valley.jpg',
    tone: 'light'
  };

  /* ═══════════ LIVE PROTOTYPES ═══════════
     Key = the data-proto value on the card. Paste the Figma *share* link
     exactly as Figma gives it; the embed URL is derived from it, so there is
     nothing else to keep in sync. Clear a value and that card falls back to
     its poster screenshot and drops its "View prototype" link — no dead
     iframe, no dead link.                                                   */
  const PROTOTYPE = {
    radius: 'https://www.figma.com/proto/a3YAGRaDyjDni0PSv6rsor/Radius-Agent---Task---Vignesh?node-id=1-381&viewport=1587%2C2596%2C0.42&t=Hg2hWGd69ET731JH-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=1%3A59&page-id=0%3A1',
    subscription: 'https://www.figma.com/proto/IFy5us83P1pfAYBe5hfXN4/Task-Vignesh?node-id=4301-1372&viewport=647%2C1027%2C0.15&t=uDigE66I1mPo0tFi-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=106%3A2273&page-id=106%3A2161'
  };

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
  /* One breakpoint governs every complex layout: the sticky card stack, the
     pinned horizontal process and the branching timeline all unwind below it.
     It MUST match the `max-width:999px` blocks in site.css — when JS and CSS
     disagree about this number you get a section that is pinned by script but
     laid out flat by stylesheet, which looks broken rather than responsive. */
  const MOBILE = () => innerWidth < 1000;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ───────────── 1. ATMOSPHERE: scatter the living details ───────────── */
  function seedAtmosphere() {
    const rand = (a, b) => a + Math.random() * (b - a);

    // stars
    const stars = $('#stars');
    for (let i = 0; i < 70; i++) {
      const s = document.createElement('i');
      s.style.left = rand(0, 100) + '%';
      s.style.top = rand(0, 70) + '%';
      s.style.animationDelay = rand(0, 5) + 's';
      s.style.opacity = rand(.2, .8);
      stars.appendChild(s);
    }

    // clouds — a few big soft shapes drifting at different speeds
    const clouds = $('#clouds');
    for (let i = 0; i < 7; i++) {
      const c = document.createElement('i');
      const w = rand(180, 460);
      c.style.width = w + 'px';
      c.style.height = w * rand(.28, .42) + 'px';
      c.style.top = rand(4, 46) + '%';
      c.style.opacity = rand(.35, .8);
      c.style.animationDuration = rand(90, 200) + 's';
      c.style.animationDelay = -rand(0, 200) + 's';
      clouds.appendChild(c);
    }

    // birds — a loose flock, each on its own clock so they never sync up
    const birds = $('#birds');
    const wing = '<svg viewBox="0 0 24 14" aria-hidden="true">' +
      '<path class="wl" d="M12 7 C9.2 3.4 5.6 2.2 1.4 4.2"/>' +
      '<path class="wr" d="M12 7 C14.8 3.4 18.4 2.2 22.6 4.2"/></svg>';
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('div');
      b.className = 'bird';
      b.innerHTML = wing;
      const scale = rand(.55, 1.25);
      b.style.setProperty('--bs', scale.toFixed(2));
      b.style.width = rand(18, 30) + 'px';
      b.style.top = rand(8, 44) + '%';
      b.style.animationDuration = rand(34, 68) + 's';       // crossing time
      b.style.animationDelay = -rand(0, 60) + 's';          // already in flight
      // wingbeat: smaller birds beat faster, which is what sells the scale
      const beat = (0.9 - scale * 0.35).toFixed(2) + 's';
      [...b.querySelectorAll('path')].forEach((p, k) => {
        p.style.animationDuration = beat;
        p.style.animationDelay = (k * 0.04) + 's';          // wings a hair apart
      });
      birds.appendChild(b);
    }

    // leaves — fewer, slower, and weighted to the outer thirds so they fall
    // past the reading column rather than across it
    const leaves = $('#leaves');
    for (let i = 0; i < 9; i++) {
      const l = document.createElement('i');
      const side = Math.random() < .5 ? rand(0, 26) : rand(74, 100);
      l.style.left = side + '%';
      l.style.animationDuration = rand(18, 32) + 's';
      l.style.animationDelay = -rand(0, 30) + 's';
      l.style.transform = `scale(${rand(.6, 1.15)})`;
      leaves.appendChild(l);
    }

    // fireflies
    const flies = $('#flies');
    for (let i = 0; i < 22; i++) {
      const f = document.createElement('i');
      f.style.left = rand(4, 96) + '%';
      f.style.top = rand(45, 95) + '%';
      f.style.animationDuration = rand(11, 24) + 's';
      f.style.animationDelay = -rand(0, 24) + 's';
      flies.appendChild(f);
    }
  }

  /* ───────────── 1c. LOGO STRIP FALLBACK ─────────────
     If a logo file is missing or fails to decode, swap it for its wordmark
     rather than leaving a broken-image icon in the hero. */
  function initLogoFallback() {
    $$('.prev-logos .logo-img').forEach((img) => {
      const degrade = () => {
        const span = document.createElement('span');
        span.className = 'logo';
        span.textContent = img.dataset.name || img.alt || '';
        img.replaceWith(span);
      };
      img.addEventListener('error', degrade, { once: true });
      // an image that finished loading with no intrinsic size also failed
      if (img.complete && img.naturalWidth === 0) degrade();
    });
  }

  /* ───────────── 1b. HERO BACKGROUND MEDIA ───────────── */
  function mountHeroMedia() {
    if (HERO_MEDIA.type === 'none') return;
    const hero = $('#hero');
    if (!hero) return;

    const layer = document.createElement('div');
    layer.className = 'hero-media';
    layer.setAttribute('aria-hidden', 'true');

    // A still is the right call on phones (data + battery) and whenever the
    // visitor has asked for less motion.
    const wantsStill = HERO_MEDIA.type === 'image' || REDUCED || innerWidth < 760;

    let media;
    if (wantsStill) {
      media = document.createElement('img');
      media.src = HERO_MEDIA.type === 'image' ? HERO_MEDIA.src : HERO_MEDIA.poster;
      media.alt = '';
      media.decoding = 'async';
    } else {
      media = document.createElement('video');
      media.src = HERO_MEDIA.src;
      if (HERO_MEDIA.poster) media.poster = HERO_MEDIA.poster;
      media.autoplay = true; media.muted = true; media.loop = false;
      media.playsInline = true; media.setAttribute('playsinline', '');
      media.preload = 'metadata';
    }

    // If the file is missing or the codec is unsupported, drop the whole layer
    // and let the CSS sky carry the hero — never a black rectangle.
    media.addEventListener('error', () => {
      layer.remove();
      document.body.classList.remove('has-hero-media');
    }, { once: true });

    layer.appendChild(media);
    layer.insertAdjacentHTML('beforeend',
      '<div class="hero-scrim"></div><div class="hero-edge"></div>');
    hero.prepend(layer);
    document.body.classList.add('has-hero-media');
    document.body.dataset.heroTone = HERO_MEDIA.tone || 'light';

    if (media.tagName === 'VIDEO') {
      // A hard cut at the loop point is the tell that it is a short clip, so
      // fade the last moment out and the first moment back in. `loop` is off
      // and the restart is driven manually to keep the two in sync.
      const FADE = 0.6;
      const tick = () => {
        const d = media.duration;
        if (d && isFinite(d)) {
          const t = media.currentTime;
          const inFade = Math.min(1, t / FADE);
          const outFade = Math.min(1, Math.max(0, (d - t) / FADE));
          media.style.opacity = String(Math.min(inFade, outFade));
        }
        requestAnimationFrame(tick);
      };
      media.addEventListener('loadedmetadata', () => requestAnimationFrame(tick), { once: true });
      media.addEventListener('ended', () => { media.currentTime = 0; media.play().catch(() => {}); });
      media.play().catch(() => { /* autoplay refused — the poster still shows */ });
    }
  }

  /* ───────────── 2. SPLIT TEXT (own implementation, no plugin) ───────────── */
  // Wraps each line/char in a mask so it can slide up from behind an edge.
  function splitLines(el) {
    // Tokenise into words, remembering which ones came out of an <em> — that is
    // what keeps the italic accent words intact through the split.
    const tokens = [];
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ w, em: false }));
      } else if (n.nodeType === 1) {
        const em = n.tagName === 'EM';
        n.textContent.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ w, em }));
      }
    });

    // Probe pass: lay every word out inline and read its offsetTop, so the
    // masks follow the real wrap points rather than a guess.
    el.textContent = '';
    const probes = tokens.map((t) => {
      const s = document.createElement('span');
      s.textContent = t.w;
      s.style.display = 'inline-block';
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });
    const lines = [];
    let top = null, cur = null;
    probes.forEach((s, i) => {
      const t = Math.round(s.offsetTop);
      if (top === null || Math.abs(t - top) > 4) { top = t; cur = []; lines.push(cur); }
      cur.push(tokens[i]);
    });

    el.textContent = '';
    const inners = [];
    lines.forEach((lineTokens) => {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      const inner = document.createElement('span');
      inner.className = 'line-inner';
      lineTokens.forEach((t, i) => {
        if (t.em) {
          const e = document.createElement('em');
          e.textContent = t.w;
          inner.appendChild(e);
        } else {
          inner.appendChild(document.createTextNode(t.w));
        }
        if (i < lineTokens.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      mask.appendChild(inner);
      el.appendChild(mask);
      inners.push(inner);
    });
    return inners;
  }

  function splitChars(el) {
    const html = el.innerHTML;
    const blocks = html.split(/<br\s*\/?>/i);
    el.textContent = '';
    const inners = [];
    blocks.forEach((block, bi) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = block;
      const text = tmp.textContent;
      const row = document.createElement('span');
      row.style.display = 'block';
      [...text].forEach((ch) => {
        if (ch === ' ') { row.appendChild(document.createTextNode(' ')); return; }
        const mask = document.createElement('span');
        mask.className = 'char-mask';
        const inner = document.createElement('span');
        inner.className = 'char-inner';
        inner.textContent = ch;
        mask.appendChild(inner);
        row.appendChild(mask);
        inners.push(inner);
      });
      el.appendChild(row);
      if (bi < blocks.length - 1) { /* block already breaks */ }
    });
    return inners;
  }

  /* Words, not lines. Used by the story passage, where the reveal is tied to
     scroll position rather than fired once — so each word needs to be its own
     element that can be dimmed and brought up independently. */
  function splitWords(el) {
    const tokens = [];
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ w, em: false }));
      } else if (n.nodeType === 1) {
        const em = n.tagName === 'EM';
        n.textContent.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ w, em }));
      }
    });

    el.textContent = '';
    const words = [];
    tokens.forEach((t, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      if (t.em) {
        const e = document.createElement('em');
        e.textContent = t.w;
        span.appendChild(e);
      } else {
        span.textContent = t.w;
      }
      el.appendChild(span);
      if (i < tokens.length - 1) el.appendChild(document.createTextNode(' '));
      words.push(span);
    });
    return words;
  }

  function prepareSplits() {
    const map = new Map();
    $$('[data-split]').forEach((el) => {
      const kind = el.dataset.split;
      map.set(el, kind === 'chars' ? splitChars(el)
                : kind === 'words' ? splitWords(el)
                : splitLines(el));
    });
    return map;
  }

  /* ───────────── 3. LOADER ───────────── */
  const words = ['Gathering morning light', 'Waking the forest', 'Drawing the ridgeline',
                 'Letting the river run', 'Setting the sun', 'Lighting the fireflies'];
  function runLoader(done) {
    const bar = $('#bar'), pct = $('#pct'), word = $('#loaderWord'), loader = $('#loader');
    let n = 0, wi = 0;
    const swap = setInterval(() => { wi = (wi + 1) % words.length; word.textContent = words[wi]; }, 620);
    const step = setInterval(() => {
      n = Math.min(100, n + Math.random() * 11 + 4);
      pct.textContent = Math.floor(n);
      bar.style.width = n + '%';
      if (n >= 100) {
        clearInterval(step); clearInterval(swap);
        setTimeout(() => {
          loader.classList.add('done');
          document.body.classList.remove('is-loading');
          done();
        }, 420);
      }
    }, REDUCED ? 40 : 105);
  }

  /* ───────────── 4. CURSOR ───────────── */
  function initCursor() {
    if (!FINE || REDUCED) return;
    const ring = $('#cursor'), dot = $('#cursorDot'), label = $('#cursorLabel');
    let rx = innerWidth / 2, ry = innerHeight / 2, dx = rx, dy = ry, tx = rx, ty = ry, raf = 0;
    document.body.classList.add('cursor-on');

    addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    function loop() {
      raf = 0;
      rx += (tx - rx) * 0.14;  ry += (ty - ry) * 0.14;   // ring trails
      dx += (tx - dx) * 0.55;  dy += (ty - dy) * 0.55;   // dot leads
      ring.style.transform = `translate(${rx - 19}px,${ry - 19}px)`;
      dot.style.transform = `translate(${dx - 2.5}px,${dy - 2.5}px)`;
      if (Math.abs(tx - rx) > .1 || Math.abs(ty - ry) > .1) raf = requestAnimationFrame(loop);
    }

    $$('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('grow');
        label.textContent = el.dataset.cursor || '';
      });
      el.addEventListener('mouseleave', () => {
        ring.classList.remove('grow');
        label.textContent = '';
      });
    });

    addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
    addEventListener('mouseenter', () => document.body.classList.remove('cursor-hidden'));
  }

  /* ───────────── 5. MAGNETIC BUTTONS ───────────── */
  function initMagnetic() {
    if (!FINE || REDUCED) return;
    $$('.magnetic').forEach((el) => {
      let raf = 0, cx = 0, cy = 0, tx = 0, ty = 0;
      const move = (e) => {
        const r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * 16;
        ty = ((e.clientY - r.top) / r.height - .5) * 16;
        if (!raf) raf = requestAnimationFrame(run);
      };
      const run = () => {
        raf = 0;
        cx += (tx - cx) * .18; cy += (ty - cy) * .18;
        el.style.transform = `translate(${cx}px,${cy}px)`;
        if (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05) raf = requestAnimationFrame(run);
      };
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(run); });
    });
  }

  /* ───────────── 6. CARD TILT + SPOTLIGHT ───────────── */
  function initTilt() {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
        if (FINE && !REDUCED) {
          card.style.transform =
            `perspective(700px) rotateY(${(px - .5) * 9}deg) rotateX(${(.5 - py) * 9}deg) translateZ(6px)`;
        }
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ───────────── 7. NAV / MENU / CLOCK ───────────── */
  function initChrome() {
    const nav = $('#nav'), burger = $('#burger');
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.nav-links a').forEach((a) => a.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    }));

    // hide the bar when scrolling down, show on the way back up
    let last = 0;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (!document.body.classList.contains('menu-open')) {
        nav.classList.toggle('up', y > last && y > 260);
      }
      last = y;
    }, { passive: true });

    const clock = $('#clock');
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('en-GB',
        { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    };
    tick(); setInterval(tick, 20000);
  }

  /* ───────────── 8. CONTACT FORM (front-end only) ───────────── */
  function initForm() {
    const form = $('#form'), note = $('#formNote'), thanks = $('#thanks');
    const wa = CONTACT.whatsapp.replace(/\D/g, '');   // tolerate +, spaces, dashes

    // Tell the visitor where the message is actually going, before they type.
    const hint = $('#formHint');
    if (hint) {
      hint.textContent = wa
        ? 'Opens WhatsApp with your message ready to send.'
        : 'Opens your email app with the message ready to send.';
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const msg = (data.get('message') || '').toString().trim();

      if (!name || !email || !msg) {
        note.textContent = 'Please fill in every field.';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = 'That email address looks incomplete.';
        return;
      }

      // There is no server behind this page, so the send hands off to an app
      // the visitor already has. WhatsApp when a number is configured,
      // otherwise their mail client. Either way the message is pre-written.
      let url;
      if (wa) {
        const text = `Hi Vignesh, I saw your portfolio.\n\n${msg}\n\n— ${name}\n${email}`;
        url = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
        note.textContent = 'Opening WhatsApp…';
        window.open(url, '_blank', 'noopener');
      } else {
        const subject = encodeURIComponent(`Portfolio enquiry — ${name}`);
        const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
        url = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
        note.textContent = 'Opening your mail app…';
        window.location.href = url;
      }

      thanks.hidden = false;
      if (window.gsap) gsap.fromTo(thanks, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out' });
      form.reset();
    });

    // the WhatsApp row in the contact list
    const waLink = $('#waLink');
    if (waLink) {
      if (wa) {
        waLink.href = `https://wa.me/${wa}?text=` +
          encodeURIComponent('Hi Vignesh, I saw your portfolio.');
        waLink.target = '_blank';
        waLink.rel = 'noopener noreferrer';
      } else {
        // no number configured — don't show a dead link
        waLink.closest('li').remove();
      }
    }

    // The résumé link used to be a stub that explained the file was missing.
    // The file exists now, so it is a plain download — no handler, and nothing
    // to intercept it.
  }

  /* ───────────── 8b. THE NAME REACTS TO THE CURSOR ─────────────
     The hero name is already split per letter for the intro, so the same spans
     can carry a hover. Letters lift as the pointer passes and settle back
     behind it — proximity-driven rather than a canned sequence, so it responds
     to how you actually move instead of replaying the same clip. */
  function initNameHover() {
    const h1 = $('.hero-name');
    if (!h1 || !FINE || REDUCED || !window.gsap) return;

    const chars = $$('.char-inner', h1);
    if (!chars.length) return;

    // Deliberately NOT releasing the masks' overflow here. The clip box shears
    // the descender of the "g", which is the look we are keeping. Headroom for
    // the lift is opened above the caps in CSS instead (see .hero-name
    // .char-mask), so letters can rise without the bottom edge moving.

    // One interpolator per letter. quickTo reuses a single tween instead of
    // spawning one per frame, which is what keeps this cheap.
    const lift = chars.map((c) => gsap.quickTo(c, 'y', { duration: .55, ease: 'power3' }));
    const tilt = chars.map((c) => gsap.quickTo(c, 'rotate', { duration: .55, ease: 'power3' }));

    // Lift and reach scale with the type, not with pixels. A fixed 16px is
    // barely visible on a 220px hero and violent on a 60px one; as a fraction
    // of the font size the gesture feels identical at every screen width — and
    // it stays inside the 0.3em of headroom the mask allows.
    let MAX_LIFT = 0, REACH = 0;
    let centres = [];
    const measure = () => {
      const fs = parseFloat(getComputedStyle(h1).fontSize) || 100;
      MAX_LIFT = fs * 0.085;   // ~8.5% of the cap height
      REACH = fs * 0.75;       // influence spans roughly one letter either side
      centres = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return r.left + r.width / 2;
      });
    };
    measure();
    addEventListener('resize', measure);

    let raf = 0, px = 0;
    h1.addEventListener('mouseenter', measure);
    h1.addEventListener('mousemove', (e) => {
      px = e.clientX;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    h1.addEventListener('mouseleave', () => {
      lift.forEach((fn) => fn(0));
      tilt.forEach((fn) => fn(0));
    });

    function apply() {
      raf = 0;
      centres.forEach((cx, i) => {
        const d = Math.abs(cx - px);
        const f = Math.max(0, 1 - d / REACH);
        const falloff = f * f;                    // squared reads as a tighter, more physical crest
        lift[i](-MAX_LIFT * falloff);
        tilt[i]((cx < px ? -1 : 1) * 3 * falloff); // letters lean away from the cursor
      });
    }
  }

  /* ───────────── 9. FALLBACK REVEALS (no GSAP) ───────────── */
  function fallbackReveals(splits) {
    // Put the page into its finished state first, so a missing observer can
    // never leave counters on zero or the tree undrawn.
    const settle = () => {
      $$('.count').forEach((el) => { el.textContent = el.dataset.to; });
      $$('.tree path').forEach((p) => { p.style.strokeDashoffset = 0; });
      $$('.tree-leaves circle').forEach((c) => { c.style.opacity = .9; });
      $$('.col-art rect,.col-art circle,.col-art path').forEach((p) => { p.style.strokeDashoffset = 0; });
    };
    settle();

    if (typeof IntersectionObserver === 'undefined') {
      [...$$('.rv'), ...$$('.split-up')].forEach((el) => {
        el.classList.add('in'); el.style.opacity = 1; el.style.transform = 'none';
      });
      splits.forEach((inners) => inners.forEach((i) => { i.style.transform = 'none'; }));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        const inners = splits.get(en.target);
        if (inners) inners.forEach((i) => { i.style.transform = 'none'; i.style.transition = 'transform 1s var(--e)'; });
        if (en.target.classList.contains('split-up')) {
          en.target.style.opacity = 1; en.target.style.transform = 'none';
          en.target.style.transition = 'opacity .9s var(--e),transform .9s var(--e)';
        }
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    [...$$('.rv'), ...$$('.split-up'), ...splits.keys()].forEach((el) => io.observe(el));
  }

  /* ───────────── 10. THE GSAP STORY ───────────── */
  function buildStory(splits) {
    const { gsap } = window;
    gsap.registerPlugin(ScrollTrigger);

    /* Lenis smooth scroll, driven by GSAP's ticker so both agree on time */
    let lenis = null;
    if (window.Lenis && !REDUCED) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6 });
      window.__lenis = lenis;        // the work rail scrolls through it too
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      // anchor links go through Lenis so they inherit the easing
      $$('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const target = document.querySelector(a.getAttribute('href'));
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: 0, duration: 1.4 });
        });
      });
    }

    /* ── hero entrance ── */
    gsap.set('.hero .btn', { opacity: 0, y: 18 });
    const heroTl = gsap.timeline({ delay: .15 });
    const nameChars = splits.get($('.hero-name')) || [];
    heroTl
      .to('.hero-hi', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' })
      .to(nameChars, { y: 0, duration: 1.15, ease: 'expo.out', stagger: .035 }, '-=.55')
      .to('.hero-roles .split-up', { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .09 }, '-=.75')
      .to('.hero-sub', { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, '-=.55')
      .to('.hero .btn', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=.5')
      // the credibility strip arrives last, after the claim has landed
      .to('.prev-label', { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.35')
      .to('.prev-logos li', { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .09 }, '-=.45')
      // hand the letters over to the cursor only once they have finished arriving
      .call(initNameHover);

    /* ── hero camera push: the whole scene eases forward and dims as you leave ── */
    gsap.to('.hero-inner', {
      scale: 1.14, y: -70, opacity: 0, filter: 'blur(7px)', ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('#rays', {
      scale: 1.25, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    // sun drifts across the whole journey — the day passing
    gsap.to('#sun', {
      y: () => innerHeight * .42, x: () => -innerWidth * .22, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 }
    });

    /* ── chapter switching: each section owns a mood ──
       The handover points must not overlap. With start/end both at the
       viewport midpoint, a section is active exactly while it covers the
       middle of the screen, so the next one takes over at the precise frame
       this one lets go. (At 60%/40% two neighbours were briefly active at
       once and the later trigger won — which is how night arrived while the
       pinned process section was still on screen.) */
    $$('[data-ch]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: (self) => { if (self.isActive) document.body.dataset.chapter = sec.dataset.ch; }
      });
    });

    /* ── generic line + char reveals ── */
    splits.forEach((inners, el) => {
      if (el.classList.contains('hero-name')) return;      // handled by the hero timeline
      if (el.dataset.split === 'words') return;            // scrubbed, see below
      gsap.to(inners, {
        y: 0, duration: 1.15, ease: 'expo.out',
        stagger: el.dataset.split === 'chars' ? .022 : .12,
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    /* ── the story reads itself ──
       One timeline for the whole passage, not one per paragraph. Separate
       triggers overlapped — paragraph two started lighting up while one was
       still half dim — so the paragraphs are sequenced on a single scrubbed
       timeline instead: each finishes, holds a beat, then the next begins.
       Word duration and gaps are in timeline units, so a long paragraph
       automatically earns more scroll than a short one. */
    const storyBlock = $('.story');
    const storyLines = $$('.story-line').map((el) => splits.get(el)).filter((w) => w && w.length);
    if (storyBlock && storyLines.length) {
      const story = gsap.timeline({
        scrollTrigger: { trigger: storyBlock, start: 'top 76%', end: 'bottom 38%', scrub: .55 }
      });
      storyLines.forEach((words, i) => {
        story.fromTo(words,
          { opacity: .16 },
          { opacity: 1, ease: 'none', duration: .6, stagger: .5 },
          i === 0 ? 0 : '+=1.4');            // a held beat between paragraphs
      });
    }
    $$('.split-up').forEach((el) => {
      if (el.closest('#hero')) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
    $$('.rv').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    /* ── skill cards: stagger in, then breathe on scroll ── */
    gsap.from('.card', {
      y: 54, opacity: 0, duration: .9, ease: 'power3.out', stagger: { each: .06, from: 'start' },
      scrollTrigger: { trigger: '.cards', start: 'top 82%' }
    });

    /* Project cards are deliberately absent here. The stack is pure CSS
       position:sticky and initWorkStack() handles the reveal and the rail —
       ScrollTrigger mis-measures sticky elements, because their rect moves
       while they're stuck. */

    /* ── the tree draws itself, branch by branch ── */
    gsap.to('#trunk', {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.tree-wrap', start: 'top 78%', end: 'bottom 65%', scrub: .6 }
    });
    $$('.tree .branch').forEach((b, i) => {
      gsap.to(b, {
        strokeDashoffset: 0, duration: .9, ease: 'power2.out',
        scrollTrigger: { trigger: $$('.year')[i] || '.tree-wrap', start: 'top 82%' }
      });
    });
    $$('.tree-leaves circle').forEach((c, i) => {
      gsap.to(c, {
        opacity: .9, scale: 1, duration: .7, ease: 'back.out(2)', transformOrigin: 'center',
        scrollTrigger: { trigger: $$('.year')[i] || '.tree-wrap', start: 'top 78%' }
      });
    });

    /* ── counters ── */
    $$('.count').forEach((el) => {
      const to = parseFloat(el.dataset.to);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: to, duration: 1.9, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(obj.v); },
        scrollTrigger: { trigger: el, start: 'top 92%' }
      });
    });

    /* ── design process: pinned horizontal run ── */
    if (!MOBILE()) {
      const track = $('#processTrack');
      // Measure the overflow straight off the element. Reading `--pad` with
      // getPropertyValue returns the literal `clamp(...)` token, not a resolved
      // pixel value, so parseFloat on it yields NaN and kills the whole tween.
      const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '#process', start: 'top top',
          // Pin length is the horizontal distance itself, so one screen of
          // vertical scroll moves one screen of columns — it tracks the wheel
          // exactly instead of racing or lagging.
          end: () => '+=' + dist(),
          pin: '#processPin', scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => { $('#processFill').style.width = (self.progress * 100) + '%'; }
        }
      });
      // The steps ride a pinned horizontal track, so a per-step ScrollTrigger
      // would fire for all of them at once. Draw the whole set from one trigger
      // on the section instead, staggered so they still arrive in sequence.
      gsap.to('.col-art rect,.col-art circle,.col-art path', {
        strokeDashoffset: 0, duration: 1.2, ease: 'power2.out', stagger: .09,
        scrollTrigger: { trigger: '#process', start: 'top 70%' }
      });
    } else {
      $$('.col-art rect,.col-art circle,.col-art path').forEach((p) => { p.style.strokeDashoffset = 0; });
    }

    /* ── loader mark draws, then the page arrives ── */
    /* ── progress rail ── */
    const railFill = $('#railFill'), railPct = $('#railPct'), railCh = $('#railCh');
    const chapterName = { morning: 'Morning', forest: 'Forest', mountain: 'Mountains', river: 'River', sunset: 'Sunset', night: 'Night' };
    ScrollTrigger.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => {
        railFill.style.height = (self.progress * 100) + '%';
        railPct.textContent = String(Math.round(self.progress * 100)).padStart(2, '0');
        railCh.textContent = chapterName[document.body.dataset.chapter] || '';
      }
    });

    ScrollTrigger.refresh();
    addEventListener('resize', () => ScrollTrigger.refresh());
  }

  /* ───────────── RÉSUMÉ DOWNLOAD ─────────────
     `download` alone is not enough: Safari ignores it for PDFs and hands the
     file to its viewer instead, which is why the résumé opened in a tab. So
     the file is fetched, turned into a blob and saved through a throwaway
     link — that path is a save in every browser.
     If fetch is refused (opening the page straight off disk as file://, or
     no network) the plain link is followed instead, which at worst shows the
     PDF rather than saving it. Never a dead click.                          */
  function initResume() {
    $$('a[download]').forEach((a) => {
      a.addEventListener('click', async (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  // let power users be
        if (typeof fetch === 'undefined' || typeof URL.createObjectURL !== 'function') return;
        e.preventDefault();
        const name = a.getAttribute('download') || 'resume.pdf';
        try {
          const res = await fetch(a.href, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(res.status);
          const url = URL.createObjectURL(await res.blob());
          const tmp = document.createElement('a');
          tmp.href = url; tmp.download = name;
          document.body.appendChild(tmp); tmp.click(); tmp.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);   // let the save start first
        } catch (err) {
          // Hand it back to the browser: a fresh link with the same intent,
          // clicked natively. Better than navigating this page away — the
          // visitor keeps their place either way.
          const tmp = document.createElement('a');
          tmp.href = a.href; tmp.download = name; tmp.rel = 'noopener';
          document.body.appendChild(tmp); tmp.click(); tmp.remove();
        }
      });
    });
  }

  /* ───────────── LIVE PROTOTYPES ─────────────
     Figma's embed is a heavy third-party frame, so it is not loaded with the
     page: the poster screenshot holds the slot and the iframe is only built
     when the card is nearly in view. If there is no link for a card, the
     poster simply stays and the matching link removes itself.               */
  function figmaEmbed(share) {
    try {
      const u = new URL(share);
      if (!/(^|\.)figma\.com$/.test(u.hostname)) return '';
      u.hostname = 'embed.figma.com';          // Figma's current embed host
      u.searchParams.set('embed-host', 'share');
      u.searchParams.set('hide-ui', '1');      // no Figma chrome inside the phone
      // 'contain' scales the frame to fill the viewport it is given and
      // guarantees the whole screen is visible. The share link arrives with
      // 'scale-down', which caps at 100% — that is what left the prototype
      // small in a big black surround with its lower fields cropped.
      u.searchParams.set('scaling', 'contain');
      u.searchParams.set('content-scaling', 'fixed');
      return u.toString();
    } catch (err) { return ''; }
  }

  function mountPrototypes() {
    // the link first — it is cheap and tells the visitor the thing is real
    $$('[data-proto-link]').forEach((a) => {
      const share = PROTOTYPE[a.dataset.protoLink];
      if (share) { a.href = share; } else { a.remove(); }
    });

    const boxes = $$('[data-proto]').filter((b) => figmaEmbed(PROTOTYPE[b.dataset.proto] || ''));
    if (!boxes.length) return;

    const build = (box) => {
      if (box.classList.contains('is-live')) return;
      const frame = document.createElement('iframe');
      frame.src = figmaEmbed(PROTOTYPE[box.dataset.proto]);
      frame.title = box.dataset.protoTitle || 'Interactive prototype';
      frame.setAttribute('loading', 'lazy');   // attribute, not property — reflects everywhere
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('allow', 'fullscreen');
      // if the embed is blocked or slow, the poster stays until it paints
      frame.addEventListener('load', () => box.classList.add('is-ready'), { once: true });

      // The box becomes the device body; the screen is a separate window
      // inside it. Two elements are needed because the oversized iframe has
      // to be clipped, and a clip would otherwise eat the bezel too.
      const screen = document.createElement('div');
      screen.className = 'proto-screen';
      const poster = box.querySelector('img');
      if (poster) screen.appendChild(poster);   // keep it as the loading layer
      screen.appendChild(frame);
      box.classList.add('is-live');
      box.appendChild(screen);
    };

    if (typeof IntersectionObserver === 'undefined') { boxes.forEach(build); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        build(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '400px 0px' });          // start loading just before it arrives
    boxes.forEach((b) => io.observe(b));
  }

  /* ───────────── WORK STACK ─────────────
     The stacking itself is CSS (each card is a sticky sibling parked a little
     lower than the last). This only does the two things CSS can't: reveal each
     card the first time it appears, and keep the step rail in sync with
     whichever card is currently on top. Both degrade to "everything visible".  */
  function initWorkStack() {
    const works = $('#works');
    if (!works) return;
    const panels = $$('.panel', works);
    const dots = $$('#worksRail a');
    if (!panels.length) return;

    /* ── reveal ── */
    if (!REDUCED && typeof IntersectionObserver !== 'undefined') {
      works.classList.add('stack-ready');           // only now is it safe to hide
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      panels.forEach((p) => io.observe(p));
    }

    /* ── rail ── */
    if (!dots.length) return;

    /* Ask the cards where they are, rather than predicting it.
       The first version cached each card's document offset and compared it
       against scrollY. Two things broke that: offsetTop on a sticky element
       is not dependable while it is stuck, and the cached offsets were taken
       before the lazy images below had loaded, so every number drifted as the
       page settled — the rail stuck on 1 while card 2 was on screen.
       A card is stuck exactly when its top has reached its own sticky offset,
       and getBoundingClientRect always tells the truth about that. The last
       card satisfying it is the one on top of the pile. */
    // Resting position = the sticky top plus the transform that steps the card
    // down the pile. rect.top includes that transform, so the lock value must
    // too, or every card after the first registers late.
    const shiftY = (cs) => {
      if (!cs.transform || cs.transform === 'none') return 0;
      try { return new DOMMatrixReadOnly(cs.transform).m42; }
      catch (err) {
        const m = cs.transform.match(/matrix\(([^)]+)\)/);   // older engines
        return m ? parseFloat(m[1].split(',')[5]) || 0 : 0;
      }
    };

    // Two different numbers, easily confused:
    //   stickTop — the CSS `top`. Sticky clamps the *layout* box to this.
    //   lockAt   — stickTop plus the transform. rect.top reports this.
    // Comparisons against rect.top use lockAt; scroll targets, which work in
    // layout space, use stickTop. Mixing them puts every jump one card short.
    let lockAt = [], stickTop = [], pitch = 0;
    const measure = () => {
      stickTop = panels.map((p) => parseFloat(getComputedStyle(p).top) || 0);
      lockAt = panels.map((p) => {
        const cs = getComputedStyle(p);
        return (parseFloat(cs.top) || 0) + shiftY(cs);
      });
      // distance between two cards in normal flow — every card is the same
      // height and carries the same bottom margin, so one reading covers all
      const r = panels[0].getBoundingClientRect();
      pitch = r.height + (parseFloat(getComputedStyle(panels[0]).marginBottom) || 0);
    };

    const rail = $('#worksRail');
    let active = -1, shown = null;
    const paint = () => {
      let next = 0;
      for (let i = 0; i < panels.length; i++) {
        // 1.5px of slack — sub-pixel layout and zoom never land exactly
        if (panels[i].getBoundingClientRect().top <= lockAt[i] + 1.5) next = i;
      }
      if (next !== active) {
        active = next;
        dots.forEach((d, i) => d.classList.toggle('on', i === active));
      }
      // The rail is a zero-height sticky spine, so its absolutely-placed list
      // can hang past the end of the section. Show it only while the section
      // actually owns the middle of the screen.
      if (rail) {
        const w = works.getBoundingClientRect(), mid = innerHeight * .5;
        const on = w.top <= mid && w.bottom >= mid;
        if (on !== shown) { shown = on; rail.classList.toggle('is-on', on); }
      }
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; paint(); });
    };

    /* ── clicking a number ──
       A plain anchor jump does not work here: the target is sticky, so the
       browser (and Lenis) read its *current* position, which is wherever it
       happens to be pinned — usually right under the nav already, so nothing
       moves. The flow position has to be reconstructed instead: the head's
       bottom edge is where card 1 begins, and every card after it sits one
       pitch further down. Subtract the card's own resting offset and that is
       the scroll position where it locks. */
    const head = $('.works-head', works);
    const targetFor = (i) => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const first = head ? head.getBoundingClientRect().bottom + y
                         : panels[0].getBoundingClientRect().top + y;
      return Math.max(0, Math.round(first + i * pitch - stickTop[i] + 1));
    };

    dots.forEach((a, i) => {
      a.addEventListener('click', (e) => {
        if (!pitch) return;                       // not measured yet, let it be
        e.preventDefault();
        // buildStory binds a generic smooth-scroll to every in-page anchor and
        // it would undo this one; stop the rest of the chain on this element
        e.stopImmediatePropagation();
        const to = targetFor(i);
        const lenis = window.__lenis;
        if (lenis) lenis.scrollTo(to, { duration: 1.2 });
        else window.scrollTo({ top: to, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });

    measure(); paint();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { measure(); active = -1; paint(); });
    // This runs after the loader, which is usually after window 'load' has
    // already fired — a listener added now would never be called. Check the
    // state instead of assuming the event is still coming.
    if (document.readyState === 'complete') { measure(); paint(); }
    else addEventListener('load', () => { measure(); active = -1; paint(); }, { once: true });
  }

  /* ───────────── BOOT ───────────── */
  seedAtmosphere();
  initLogoFallback();
  mountHeroMedia();
  const splits = prepareSplits();
  // park the split lines out of sight before anything paints — words are left
  // alone, they fade rather than slide and are dimmed by the scrub instead
  splits.forEach((inners, el) => {
    if (el.dataset.split === 'words') return;
    inners.forEach((i) => { i.style.transform = 'translateY(105%)'; });
  });
  gsapReadyThen();

  function gsapReadyThen() {
    initCursor(); initMagnetic(); initTilt(); initChrome(); initForm();
    initWorkStack(); mountPrototypes(); initResume();

    // draw the loader mark if GSAP made it in
    if (window.gsap) {
      gsap.to('.mark-leaf,.mark-leaf2,.mark-stem', {
        strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: .16
      });
    }

    runLoader(() => {
      if (window.gsap && window.ScrollTrigger) {
        try { buildStory(splits); }
        catch (err) { console.warn('story failed, falling back', err); fallbackReveals(splits); }
      } else {
        fallbackReveals(splits);
      }
    });
  }
})();
