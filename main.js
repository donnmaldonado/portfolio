(() => {
    'use strict';

    /* ---------- Topographic contour field ----------
       A value-noise height map traced with marching squares. Deterministic seed,
       so the lines are the same on every load; drawn once and left alone. */

    const drawTopo = () => {
        const host = document.getElementById('topo');
        if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const GRID = 26;          // height-field resolution
        const LEVELS = 15;        // number of contour lines
        const SEED = 20260916;

        // Deterministic PRNG so the terrain never changes between loads.
        let s = SEED;
        const rand = () => {
            s = (s * 1664525 + 1013904223) % 4294967296;
            return s / 4294967296;
        };

        const smooth = t => t * t * (3 - 2 * t);

        // Layered value noise sampled on a coarse lattice.
        const octave = (size) => {
            const g = [];
            for (let y = 0; y <= size; y++) {
                g[y] = [];
                for (let x = 0; x <= size; x++) g[y][x] = rand();
            }
            return (u, v) => {
                const fx = u * size, fy = v * size;
                const x0 = Math.floor(fx), y0 = Math.floor(fy);
                const tx = smooth(fx - x0), ty = smooth(fy - y0);
                const x1 = Math.min(x0 + 1, size), y1 = Math.min(y0 + 1, size);
                const a = g[y0][x0] + (g[y0][x1] - g[y0][x0]) * tx;
                const b = g[y1][x0] + (g[y1][x1] - g[y1][x0]) * tx;
                return a + (b - a) * ty;
            };
        };

        const o1 = octave(3), o2 = octave(6), o3 = octave(12);
        const height = (u, v) => o1(u, v) * 0.6 + o2(u, v) * 0.3 + o3(u, v) * 0.1;

        // Sample the field onto a regular grid.
        const field = [];
        let lo = Infinity, hi = -Infinity;
        for (let y = 0; y <= GRID; y++) {
            field[y] = [];
            for (let x = 0; x <= GRID; x++) {
                const h = height(x / GRID, y / GRID);
                field[y][x] = h;
                if (h < lo) lo = h;
                if (h > hi) hi = h;
            }
        }

        const cell = 100 / GRID;
        const at = (x, y) => (field[y][x] - lo) / (hi - lo);
        const lerp = (a, b, t) => a + (b - a) * t;

        // Marching squares: collect the segments crossing each threshold, then
        // stitch them into polylines so the strokes read as continuous contours.
        const contourSegments = (level) => {
            const segs = [];
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    const tl = at(x, y), tr = at(x + 1, y);
                    const br = at(x + 1, y + 1), bl = at(x, y + 1);
                    const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) |
                                (br > level ? 2 : 0) | (bl > level ? 1 : 0);
                    if (idx === 0 || idx === 15) continue;

                    const px = x * cell, py = y * cell;
                    const top    = [px + cell * (level - tl) / (tr - tl), py];
                    const right  = [px + cell, py + cell * (level - tr) / (br - tr)];
                    const bottom = [px + cell * (level - bl) / (br - bl), py + cell];
                    const left   = [px, py + cell * (level - tl) / (bl - tl)];

                    const push = (a, b) => segs.push([a, b]);
                    switch (idx) {
                        case 1: case 14: push(left, bottom); break;
                        case 2: case 13: push(bottom, right); break;
                        case 3: case 12: push(left, right); break;
                        case 4: case 11: push(top, right); break;
                        case 6: case  9: push(top, bottom); break;
                        case 7: case  8: push(left, top); break;
                        case 5:  push(left, top); push(bottom, right); break;
                        case 10: push(left, bottom); push(top, right); break;
                    }
                }
            }
            return segs;
        };

        const key = p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

        const stitch = (segs) => {
            const ends = new Map();
            segs.forEach((seg, i) => {
                [key(seg[0]), key(seg[1])].forEach(k => {
                    if (!ends.has(k)) ends.set(k, []);
                    ends.get(k).push(i);
                });
            });

            const used = new Array(segs.length).fill(false);
            const paths = [];

            for (let i = 0; i < segs.length; i++) {
                if (used[i]) continue;
                used[i] = true;
                const line = [segs[i][0], segs[i][1]];

                // Extend from both ends until no unused neighbour shares a vertex.
                for (const forward of [true, false]) {
                    for (;;) {
                        const tip = forward ? line[line.length - 1] : line[0];
                        const next = (ends.get(key(tip)) || []).find(j => !used[j]);
                        if (next === undefined) break;
                        used[next] = true;
                        const [a, b] = segs[next];
                        const other = key(a) === key(tip) ? b : a;
                        forward ? line.push(other) : line.unshift(other);
                    }
                }

                if (line.length > 2) paths.push(line);
            }
            return paths;
        };

        const d = line => line
            .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
            .join(' ');

        const parts = [];
        for (let i = 1; i < LEVELS; i++) {
            const level = i / LEVELS;
            stitch(contourSegments(level)).forEach(line => {
                parts.push(`<path d="${d(line)}" fill="none" stroke="#1a1a1a" ` +
                           `stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round"/>`);
            });
        }

        host.innerHTML =
            `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
            parts.join('') + `</svg>`;
    };

    drawTopo();

    /* ---------- Mobile nav ---------- */
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    const closeMenu = () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    };

    hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('active');
        hamburger.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', String(open));
    });

    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    /* ---------- Header rule on scroll ---------- */
    const header = document.getElementById('site-header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- Active nav link ---------- */
    const sections = [...document.querySelectorAll('main section[id]')];
    const linkFor = id => navLinks.querySelector(`a[href="#${id}"]`);

    if ('IntersectionObserver' in window) {
        const navObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                navLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                linkFor(entry.target.id)?.classList.add('active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        sections.forEach(s => navObserver.observe(s));

        /* ---------- Reveal on scroll ---------- */
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -80px 0px' });

        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    } else {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }

    /* ---------- Copy email ---------- */
    const copyBtn = document.getElementById('email-copy');
    const copyIcon = document.getElementById('copy-icon');
    const copyStatus = document.getElementById('copy-status');
    let resetTimer;

    copyBtn.addEventListener('click', async () => {
        const email = copyBtn.dataset.email;
        let copied = false;

        try {
            await navigator.clipboard.writeText(email);
            copied = true;
        } catch {
            // Fallback for non-secure contexts and older browsers.
            const field = document.createElement('textarea');
            field.value = email;
            field.setAttribute('readonly', '');
            field.style.cssText = 'position:absolute;left:-9999px';
            document.body.appendChild(field);
            field.select();
            try { copied = document.execCommand('copy'); } catch { copied = false; }
            document.body.removeChild(field);
        }

        /* The address itself stays put; the icon carries the feedback. */
        copyIcon.className = copied ? 'fas fa-check' : 'fas fa-copy';
        copyBtn.classList.toggle('copied', copied);
        copyStatus.textContent = copied ? `${email} copied to clipboard` : `Press ⌘C to copy ${email}`;

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            copyIcon.className = 'fas fa-copy';
            copyBtn.classList.remove('copied');
            copyStatus.textContent = '';
        }, 2500);
    });

    /* ---------- Footer year ---------- */
    document.getElementById('year').textContent = new Date().getFullYear();
})();
