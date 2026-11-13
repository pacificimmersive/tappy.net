(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPARK_SRC = '/assets/v6/stickers/spark.webp';
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const rand = (min, max) => min + Math.random() * (max - min);

    /* Reveal on scroll */
    const revealEls = $$('[data-reveal]');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach((el) => io.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    /* Seamless marquees */
    $$('.ticker-track, #galleryTrack').forEach((track) => {
        if (reduceMotion && track.id === 'galleryTrack') return;
        [...track.children].forEach((child) => {
            const clone = child.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
            track.appendChild(clone);
        });
    });

    /* Hero parallax */
    const hero = $('.hero');
    if (hero && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
        let frame = 0;
        hero.addEventListener('pointermove', (e) => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const r = hero.getBoundingClientRect();
                hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
                hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
            });
        });
        hero.addEventListener('pointerleave', () => {
            hero.style.setProperty('--mx', 0);
            hero.style.setProperty('--my', 0);
        });
    }

    /* Shared Sparks counter */
    let sparks = 124;
    const sparkCounts = $$('[data-spark-count]');
    const sparkPills = $$('[data-spark-display]');

    const renderSparks = () => {
        sparkCounts.forEach((el) => { el.textContent = sparks; });
    };

    const addSparks = (amount, pill) => {
        sparks = Math.max(0, sparks + amount);
        renderSparks();
        (pill ? [pill] : sparkPills).forEach((p) => {
            p.classList.remove('bump');
            void p.offsetWidth;
            p.classList.add('bump');
        });
    };

    const center = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const flySpark = (fromEl, toEl, done) => {
        if (reduceMotion || !fromEl || !toEl || !document.body.animate) {
            done();
            return;
        }
        const a = center(fromEl);
        const b = center(toEl);
        const img = document.createElement('img');
        img.src = SPARK_SRC;
        img.alt = '';
        img.className = 'spark-fly';
        img.style.left = `${a.x - 13}px`;
        img.style.top = `${a.y - 13}px`;
        document.body.appendChild(img);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const anim = img.animate([
            { transform: 'translate(0, 0) scale(.6) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(1.25) rotate(120deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${dx}px, ${dy}px) scale(.7) rotate(240deg)`, opacity: 0.9 }
        ], { duration: 720, easing: 'cubic-bezier(.4,0,.2,1)' });
        anim.onfinish = () => {
            img.remove();
            done();
        };
    };

    const burstSparks = (host, count = 10, radius = 90, origin = null) => {
        if (reduceMotion) return;
        let left = '50%';
        let top = '50%';
        if (origin) {
            const h = host.getBoundingClientRect();
            const o = origin.getBoundingClientRect();
            left = `${o.left + o.width / 2 - h.left}px`;
            top = `${o.top + o.height / 2 - h.top}px`;
        }
        for (let i = 0; i < count; i += 1) {
            const s = document.createElement('img');
            s.src = SPARK_SRC;
            s.alt = '';
            s.className = 'burst-spark';
            s.style.left = left;
            s.style.top = top;
            const angle = (Math.PI * 2 * i) / count + rand(-0.2, 0.2);
            const dist = radius * rand(0.7, 1.15);
            s.style.setProperty('--x', `${Math.cos(angle) * dist}px`);
            s.style.setProperty('--y', `${Math.sin(angle) * dist - 20}px`);
            s.addEventListener('animationend', () => s.remove());
            host.appendChild(s);
        }
    };

    /* Torn parchment edge, ported from TatteredPaperShape in the app */
    const tornPath = (w, h, seed = 23, depth = 8, step = 13) => {
        const inset = depth + 1;
        const ix = inset;
        const iy = inset;
        const iw = w - inset * 2;
        const ih = h - inset * 2;
        let state = seed >>> 0 || 0x9e3779b9;
        const next = () => {
            state ^= state << 13; state >>>= 0;
            state ^= state >>> 17;
            state ^= state << 5; state >>>= 0;
            return state / 4294967296;
        };
        const between = (a, b) => a + next() * (b - a);
        const clampDepth = (v) => Math.min(Math.max(v, -depth), depth);
        let drift = 0;
        const jig = () => {
            drift = clampDepth(drift + between(-depth * 0.7, depth * 0.7));
            return clampDepth(drift * 0.65 + between(-depth * 0.5, depth * 0.5));
        };
        const cols = Math.max(Math.round(iw / step), 2);
        const rows = Math.max(Math.round(ih / step), 2);
        const pts = [];
        for (let i = 0; i < cols; i += 1) pts.push([ix + (iw * i) / cols, iy + jig()]);
        for (let i = 0; i < rows; i += 1) pts.push([ix + iw + jig(), iy + (ih * i) / rows]);
        for (let i = 0; i < cols; i += 1) pts.push([ix + iw - (iw * i) / cols, iy + ih + jig()]);
        for (let i = 0; i < rows; i += 1) pts.push([ix + jig(), iy + ih - (ih * i) / rows]);
        const n = pts.length;
        const pt = (i) => pts[((i % n) + n) % n];
        const f = (v) => v.toFixed(1);
        let d = `M${f(pt(0)[0])} ${f(pt(0)[1])}`;
        for (let i = 0; i < n; i += 1) {
            const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
            d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
        }
        return `${d}Z`;
    };

    const drawPaper = (card) => {
        const svg = $('.adv-paper', card);
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        if (!svg || !w || !h) return;
        const d = tornPath(w, h);
        const burnt = '#754a24';
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.innerHTML = `
            <defs>
                <linearGradient id="paperFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#f2e3ba"/><stop offset=".5" stop-color="#dec48f"/><stop offset="1" stop-color="#c7a36e"/>
                </linearGradient>
                <radialGradient id="paperVignette" gradientUnits="userSpaceOnUse" cx="${w / 2}" cy="${h / 2}" r="${w * 0.72}">
                    <stop offset=".305" stop-color="${burnt}" stop-opacity="0"/><stop offset="1" stop-color="${burnt}" stop-opacity=".26"/>
                </radialGradient>
                <clipPath id="paperClip"><path d="${d}"/></clipPath>
                <filter id="paperStain" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
            </defs>
            <path d="${d}" fill="url(#paperFill)"/>
            <path d="${d}" fill="url(#paperVignette)"/>
            <g clip-path="url(#paperClip)"><g filter="url(#paperStain)" fill="${burnt}">
                <ellipse cx="${w / 2 - w * 0.28}" cy="${h / 2 + 34}" rx="45" ry="30" opacity=".12"/>
                <ellipse cx="${w / 2 + w * 0.3}" cy="${h / 2 - 46}" rx="31" ry="39" opacity=".14"/>
                <ellipse cx="${w / 2 + w * 0.14}" cy="${h / 2 + 92}" rx="27" ry="21" opacity=".09"/>
                <circle cx="${w / 2 - w * 0.12}" cy="${h / 2 - 78}" r="14" opacity=".11"/>
            </g></g>
            <path d="${d}" fill="none" stroke="${burnt}" stroke-opacity=".6" stroke-width="1.75"/>`;
        card.classList.add('has-paper');
    };

    /* Daily Adventure card */
    const board = $('#questBoard');
    if (board) {
        const quests = $$('.quest', board);
        const status = $('#questStatus');
        const reward = $('#rewardBar');
        const rewardFill = $('#rewardFill');
        const rewardCount = $('#rewardCount');
        const resetBtn = $('#questReset');
        const inner = $('.adv-inner', board);
        const CHEST_SPARKS = 108;
        let lockedTapped = false;

        const steps = quests.map((el) => ({
            el,
            target: Number(el.dataset.target) || 1,
            done: 0,
            title: $('.q-title', el).textContent
        }));

        const completedCount = () => steps.filter((s) => s.done >= s.target).length;

        const paintStep = (s) => {
            const p = Math.min(s.done / s.target, 1);
            s.el.style.setProperty('--p', p);
            $('.q-pill', s.el).textContent = `${s.done}/${s.target}`;
            s.el.classList.toggle('complete', p >= 1);
            s.el.setAttribute('aria-label', p >= 1 ? `${s.title}, complete` : `${s.title}, ${s.done} of ${s.target}`);
        };

        const subtitle = () => {
            if (reward.dataset.state === 'claimed') return 'All done — see you tomorrow!';
            const done = completedCount();
            if (done === steps.length) return 'Your chest is ready!';
            if (done === 0) return 'Pick any quest to begin your self-care journey!';
            const left = steps.length - done;
            return left === 1 ? 'Just 1 quest to go!' : `${left} quests remaining`;
        };

        const update = () => {
            const done = completedCount();
            rewardFill.style.setProperty('--p', done / steps.length);
            rewardCount.textContent = `${done}/${steps.length}`;
            if (reward.dataset.state !== 'claimed') {
                reward.dataset.state = done === steps.length ? 'ready' : 'locked';
            }
            const labels = {
                locked: "Collect today's Sparks. Complete all quests to open the chest.",
                ready: `Open the chest for ${CHEST_SPARKS} Sparks`,
                claimed: 'Sparks collected'
            };
            reward.setAttribute('aria-label', labels[reward.dataset.state]);
            status.textContent = subtitle();
            document.dispatchEvent(new CustomEvent('tappy:quests', { detail: { done } }));
        };

        quests.forEach((quest, i) => {
            quest.addEventListener('click', () => {
                const s = steps[i];
                const node = $('.node', quest);
                if (s.done >= s.target) {
                    burstSparks(node, 7, 40);
                    return;
                }
                s.done += 1;
                paintStep(s);
                if (s.done >= s.target) {
                    quest.classList.remove('pop');
                    void quest.offsetWidth;
                    quest.classList.add('pop');
                    burstSparks(node, 8, 46);
                }
                update();
            });
        });

        reward.addEventListener('click', () => {
            const state = reward.dataset.state;
            if (state === 'locked') {
                reward.classList.remove('shake');
                void reward.offsetWidth;
                reward.classList.add('shake');
                if (lockedTapped) status.textContent = 'Complete all quests to open the chest!';
                lockedTapped = true;
                return;
            }
            if (state === 'ready') {
                reward.dataset.state = 'claimed';
                burstSparks(inner, 14, 110, reward);
                addSparks(CHEST_SPARKS);
                resetBtn.hidden = false;
                update();
            }
        });

        resetBtn.addEventListener('click', () => {
            steps.forEach((s) => { s.done = 0; paintStep(s); });
            reward.dataset.state = 'locked';
            lockedTapped = false;
            resetBtn.hidden = true;
            update();
            quests[0].focus();
        });

        steps.forEach(paintStep);
        update();
        drawPaper(board);
        if ('ResizeObserver' in window) {
            let lastSize = '';
            new ResizeObserver(() => {
                const size = `${board.offsetWidth}x${board.offsetHeight}`;
                if (size === lastSize) return;
                lastSize = size;
                drawPaper(board);
            }).observe(board);
        }
    }

    /* Tappy companion stage */
    const petCard = $('#petCard');
    if (petCard) {
        const scene = $('#petScene');
        const petBtn = $('#pet');
        const tappy = $('#tappy');
        const fx = $('#fxLayer');
        const toast = $('#petToast');
        const careBar = $('#careBar');
        const gift = $('#gift');
        const visitor = $('#visitor');
        const levelArc = $('#levelArc');
        const levelNum = $('#levelNum');
        const hudPill = $('.hud-chip[data-spark-display]', petCard);
        const dockBtns = $$('.dock-btn', petCard);
        const sceneBtns = $$('.scene-btn');
        const segs = Object.fromEntries($$('.seg', careBar).map((s) => [s.dataset.act, s]));
        const ACTS = Object.keys(segs);
        const PET_TAPS = 5;
        const SPARKS_PER_SEGMENT = 10;
        const HATS = [
            { id: 'beanie', name: 'a Propeller Beanie' },
            { id: 'party', name: 'a Party Hat' }
        ];
        const VISITORS = { beach: 'a crab', farm: 'a chicken', castle: 'a dragon', space: 'a UFO' };
        const PLACES = { beach: 'the beach', farm: 'the farm', castle: 'the castle', space: 'outer space' };
        const CONFETTI = ['#ffd84d', '#ff6b7a', '#3dd5ff', '#2fe08a', '#b48cff', '#ff9a5c'];
        const HEART = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';

        const done = new Set();
        let petTaps = 0;
        let questsDone = 0;
        let hatIndex = 0;
        let level = 4;
        let levelProgress = 0.6;
        let busy = false;
        let toastTimer = 0;
        let faceTimer = 0;

        const showToast = (text, ms = 2400) => {
            toast.textContent = text;
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
        };

        const setFace = (face, ms) => {
            tappy.dataset.face = face;
            clearTimeout(faceTimer);
            if (ms) faceTimer = setTimeout(() => { tappy.dataset.face = 'idle'; }, ms);
        };

        const spawn = (className, opts = {}) => {
            if (reduceMotion) return;
            const el = document.createElement(opts.tag || 'span');
            el.className = `fx ${className}`;
            if (opts.html) el.innerHTML = opts.html;
            if (opts.text) el.textContent = opts.text;
            if (opts.src) { el.src = opts.src; el.alt = ''; }
            Object.entries(opts.vars || {}).forEach(([k, v]) => el.style.setProperty(k, v));
            el.addEventListener('animationend', () => el.remove());
            fx.appendChild(el);
        };

        const react = (cls, ms) => {
            petBtn.classList.remove('react-squish', 'react-chomp', 'react-hug', 'react-jump', 'react-sleep');
            void petBtn.offsetWidth;
            petBtn.classList.add(cls);
            setTimeout(() => petBtn.classList.remove(cls), ms);
        };

        const renderLevel = () => {
            levelArc.style.setProperty('--lv', Math.max(levelProgress, 0.02));
            levelNum.textContent = level;
        };

        const gainLevelProgress = (amount) => {
            levelProgress += amount;
            if (levelProgress >= 1) {
                levelProgress -= 1;
                level += 1;
                setTimeout(() => showToast(`Level up! Tappy is now Level ${level}.`, 2600), 600);
            }
            renderLevel();
        };

        const fill = (act) => {
            if (done.has(act)) return;
            done.add(act);
            const seg = segs[act];
            seg.style.removeProperty('--p');
            seg.classList.add('done');
            seg.classList.remove('pop');
            void seg.offsetWidth;
            seg.classList.add('pop');
            flySpark(seg, hudPill, () => addSparks(SPARKS_PER_SEGMENT, hudPill));
            gainLevelProgress(0.06);
            careBar.setAttribute('aria-valuenow', String(done.size));
            if (done.size === ACTS.length) {
                careBar.classList.add('full');
                for (let i = 0; i < 6; i += 1) {
                    setTimeout(() => flySpark(careBar, hudPill, () => {}), i * 80);
                }
                burstSparks(fx, 12, 90, careBar);
                setTimeout(() => {
                    gift.classList.add('show');
                    gift.tabIndex = 0;
                    gift.removeAttribute('aria-hidden');
                    showToast('Care Bar full! A surprise gift appeared.', 3200);
                }, 900);
            }
        };

        /* Play and Daily Adventure fill from fidgets/games and a quest in the
           app. This demo can't open those, so they start filled. */
        const prefillDemoActs = () => {
            ['play', 'selfCare'].forEach((act) => {
                done.add(act);
                segs[act].classList.add('done');
            });
            careBar.setAttribute('aria-valuenow', String(done.size));
        };
        prefillDemoActs();

        const actions = {
            feed() {
                react('react-chomp', 750);
                setFace('eat', 900);
                for (let i = 0; i < 7; i += 1) {
                    spawn('fx-crumb', { vars: { '--left': `${rand(44, 54)}%`, '--top': '62%', '--x': `${rand(-60, 60)}px`, '--y': `${rand(-30, -70)}px`, '--delay': `${i * 0.05}s` } });
                }
                showToast('Snack time! Yum.');
                fill('feed');
            },
            love() {
                react('react-hug', 850);
                setFace('love', 1300);
                for (let i = 0; i < 6; i += 1) {
                    spawn('fx-heart', { html: HEART, vars: { '--left': `${rand(36, 64)}%`, '--top': `${rand(44, 58)}%`, '--x': `${rand(-40, 40)}px`, '--y': `${rand(-90, -150)}px`, '--rot': `${rand(-30, 30)}deg`, '--delay': `${i * 0.1}s` } });
                }
                showToast('Hug time!');
                fill('love');
            },
            play() {
                react('react-jump', 850);
                setFace('party', 1000);
                for (let i = 0; i < 18; i += 1) {
                    spawn('fx-confetti', { vars: { '--left': '50%', '--top': '48%', '--c': CONFETTI[i % CONFETTI.length], '--x': `${rand(-160, 160)}px`, '--y': `${rand(-150, 70)}px`, '--rot': `${rand(-540, 540)}deg`, '--delay': `${rand(0, 0.12)}s` } });
                }
                showToast('Woohoo! Party time!');
            },
            sleep() {
                busy = true;
                scene.classList.add('sleeping');
                setFace('sleep');
                react('react-sleep', 2700);
                ['Z', 'z', 'Z'].forEach((z, i) => {
                    spawn('fx-z', { text: z, vars: { '--left': `${60 + i * 4}%`, '--top': '44%', '--x': `${20 + i * 14}px`, '--y': '-110px', '--delay': `${i * 0.45}s` } });
                });
                showToast('Nap time! Zzz', 2600);
                setTimeout(() => {
                    scene.classList.remove('sleeping');
                    setFace('idle');
                    busy = false;
                }, reduceMotion ? 1200 : 2800);
                fill('sleep');
            },
            shop() {
                showToast('The Shop has hats, outfits, toys, and colors to spend Sparks on.', 3000);
            },
            more() {
                showToast('More has level progress, bedtime settings, and scene sounds.', 2800);
            }
        };

        petBtn.addEventListener('click', () => {
            if (busy) return;
            react('react-squish', 650);
            setFace('happy', 520);
            spawn('fx-spark', { tag: 'img', src: SPARK_SRC, vars: { '--left': `${rand(36, 64)}%`, '--top': `${rand(40, 52)}%`, '--x': `${rand(-50, 50)}px`, '--y': `${rand(-70, -120)}px` } });
            if (done.has('pet')) return;
            petTaps += 1;
            segs.pet.style.setProperty('--p', petTaps / PET_TAPS);
            if (petTaps >= PET_TAPS) {
                showToast('Pet complete! +10 Sparks');
                fill('pet');
            } else if (petTaps === 1) {
                showToast('Tap a few more times to pet Tappy.');
            }
        });

        dockBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (busy) return;
                const key = btn.dataset.care || btn.dataset.dock;
                actions[key]?.();
            });
        });

        const resetCare = () => {
            done.clear();
            petTaps = 0;
            ACTS.forEach((act) => {
                segs[act].classList.remove('done');
                segs[act].style.removeProperty('--p');
            });
            careBar.classList.remove('full');
            prefillDemoActs();
        };

        gift.addEventListener('click', () => {
            if (gift.classList.contains('opened')) return;
            gift.classList.add('opened');
            const hat = HATS[hatIndex % HATS.length];
            hatIndex += 1;
            burstSparks(fx, 10, 70, gift);
            setTimeout(() => {
                tappy.dataset.hat = hat.id;
                setFace('happy', 1200);
                react('react-jump', 850);
                showToast(`Surprise! Tappy got ${hat.name}.`, 3400);
            }, 350);
            setTimeout(() => {
                gift.classList.remove('show', 'opened');
                gift.tabIndex = -1;
                gift.setAttribute('aria-hidden', 'true');
                resetCare();
            }, 4200);
        });

        let visitorCooldown = false;
        visitor.addEventListener('click', () => {
            if (visitorCooldown) return;
            visitorCooldown = true;
            setTimeout(() => { visitorCooldown = false; }, 1200);
            const name = VISITORS[scene.dataset.scene] || 'a visitor';
            const r = visitor.getBoundingClientRect();
            const s = scene.getBoundingClientRect();
            spawn('fx-text', { text: '+5', vars: { '--left': `${((r.left + r.width / 2 - s.left) / s.width) * 100}%`, '--top': `${((r.top - s.top) / s.height) * 100}%`, '--y': '-60px' } });
            flySpark(visitor, hudPill, () => addSparks(5, hudPill));
            showToast(`You spotted ${name}! +5 Sparks`);
            visitor.classList.remove('hop');
            void visitor.offsetWidth;
            visitor.classList.add('hop');
        });

        sceneBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                scene.dataset.scene = btn.dataset.scene;
                sceneBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
                showToast(`Off to ${PLACES[btn.dataset.scene]}!`, 1800);
            });
        });

        document.addEventListener('tappy:quests', (e) => {
            questsDone = e.detail.done;
            if (questsDone > 0) fill('selfCare');
        });

        /* Blinks: the eye's outline squashes to a line around a round pupil,
           crossfading into the closed crescent for the last stretch. */
        const lids = $$('.t-lid', tappy);
        const eyes = $$('.t-eye', tappy);
        const blinkLids = $('.t-blink-lids', tappy);
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const easeIn = (t) => t * t;
        const easeOut = (t) => 1 - (1 - t) * (1 - t);

        const setOpenness = (o) => {
            lids.forEach((lid) => lid.setAttribute('ry', (14 * Math.max(o, 0.001)).toFixed(2)));
            const crescent = Math.max(0, 1 - o / 0.18);
            blinkLids.setAttribute('opacity', crescent.toFixed(2));
            eyes.forEach((eye) => eye.setAttribute('opacity', (1 - crescent).toFixed(2)));
        };

        const tween = (from, to, ms, ease) => new Promise((resolve) => {
            const start = performance.now();
            const step = (now) => {
                const t = Math.min((now - start) / ms, 1);
                setOpenness(from + (to - from) * ease(t));
                if (t < 1) requestAnimationFrame(step);
                else resolve();
            };
            requestAnimationFrame(step);
        });

        const canBlink = () => tappy.dataset.face === 'idle' && !busy && !document.hidden;

        const performBlink = async (quicker) => {
            await tween(1, 0, quicker ? rand(45, 65) : rand(55, 90), easeIn);
            await wait(quicker ? rand(20, 45) : rand(30, 120));
            await tween(0, 1, quicker ? rand(65, 100) : rand(80, 160), easeOut);
        };

        const nextBlinkDelay = () => {
            const roll = Math.random();
            if (roll < 0.2) return rand(1600, 2600);
            if (roll < 0.8) return rand(2800, 5400);
            return rand(6200, 10500);
        };

        const blinkLoop = async () => {
            if (canBlink()) {
                await performBlink(false);
                if (Math.random() < 0.2) {
                    await wait(rand(80, 220));
                    if (canBlink()) await performBlink(true);
                }
            }
            setTimeout(blinkLoop, nextBlinkDelay());
        };

        if (!reduceMotion) setTimeout(blinkLoop, nextBlinkDelay());

        renderLevel();
    }

    const tick = (ms = 10) => {
        if (navigator.vibrate) navigator.vibrate(ms);
    };

    /* Mood journal demo */
    const moodDemo = $('#moodDemo');
    if (moodDemo) {
        const MOODS = {
            awful: { h: 0.2, q: "That sounds hard. Tappy's here for you." },
            bad: { h: 0.35, q: 'Thanks for checking in. Tomorrow is a new day.' },
            okay: { h: 0.55, q: 'Okay is okay. Want to add a note?' },
            good: { h: 0.8, q: "Nice! What's behind the good mood?" },
            great: { h: 1, q: 'Love that! Tag what made today great.' }
        };
        const q = $('#moodQ');
        const today = $('#moodToday');
        const buttons = $$('.mood-btn', moodDemo);
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const m = btn.dataset.mood;
                buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
                today.style.setProperty('--h', MOODS[m].h);
                today.dataset.m = m;
                q.textContent = MOODS[m].q;
                tick(10);
            });
        });
    }

    /* Habit tracker demo */
    $$('#habitList .habit').forEach((btn) => {
        const count = $('small b', btn);
        const base = Number(btn.dataset.streak);
        btn.addEventListener('click', () => {
            const done = btn.getAttribute('aria-pressed') !== 'true';
            btn.setAttribute('aria-pressed', String(done));
            count.textContent = String(base + (done ? 1 : 0));
            if (done) {
                tick(14);
                burstSparks(btn, 6, 46, $('.habit-check', btn));
            }
        });
    });

    /* Live Activity countdown: a 25 minute Focus timer. */
    const laTime = $('#laTime');
    const laBar = $('#laBar');
    if (laTime && laBar && !reduceMotion) {
        let left = 18 * 60 + 24;
        const total = 25 * 60;
        setInterval(() => {
            left = left <= 0 ? total : left - 1;
            const minutes = Math.floor(left / 60);
            laTime.textContent = `${minutes}:${String(left % 60).padStart(2, '0')}`;
            laBar.style.width = `${((total - left) / total) * 100}%`;
        }, 1000);
    }

    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
})();
