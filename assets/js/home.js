(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPARK_SRC = '/assets/v6/stickers/spark.webp';
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const rand = (min, max) => min + Math.random() * (max - min);

    /* Nav shadow */
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Mobile menu */
    const navToggle = $('#navToggle');
    const mobileMenu = $('#mobileMenu');
    const setMenu = (open) => {
        mobileMenu.hidden = !open;
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    navToggle.addEventListener('click', () => setMenu(mobileMenu.hidden));
    mobileMenu.addEventListener('click', (e) => {
        if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileMenu.hidden) {
            setMenu(false);
            navToggle.focus();
        }
    });
    document.addEventListener('click', (e) => {
        if (!mobileMenu.hidden && !nav.contains(e.target)) setMenu(false);
    });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
        if (e.matches) setMenu(false);
    });

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
        let level = 10;
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
            addSparks(SPARKS_PER_SEGMENT, hudPill);
            gainLevelProgress(0.06);
            careBar.setAttribute('aria-valuenow', String(done.size));
            if (done.size === ACTS.length) {
                careBar.classList.add('full');
                setTimeout(() => {
                    gift.classList.add('show');
                    gift.tabIndex = 0;
                    gift.removeAttribute('aria-hidden');
                    showToast('Care Bar full! A surprise gift appeared.', 3200);
                }, 900);
            } else if (done.size === ACTS.length - 1 && !done.has('selfCare')) {
                setTimeout(() => showToast('Finish a quest in your Daily Adventure to fill the last one!', 3400), 1300);
            }
        };

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
                fill('play');
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
            careBar.setAttribute('aria-valuenow', '0');
            if (questsDone > 0) fill('selfCare');
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

    /* Fidget playground */
    const playground = $('#playground');
    if (playground) {
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        let hapticsOn = true;
        let soundOn = false;
        let lastHaptic = 0;
        let audioCtx = null;

        // iOS Safari has no Vibration API, but toggling a native switch
        // control plays the system haptic tick.
        const iosTap = (() => {
            if (!isIOS) return null;
            const label = document.createElement('label');
            label.setAttribute('aria-hidden', 'true');
            label.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.setAttribute('switch', '');
            input.tabIndex = -1;
            label.appendChild(input);
            document.body.appendChild(label);
            return label;
        })();

        const haptic = (ms = 10, gap = 30) => {
            if (!hapticsOn) return;
            const now = performance.now();
            if (now - lastHaptic < gap) return;
            lastHaptic = now;
            if (navigator.vibrate) navigator.vibrate(ms);
            else if (iosTap) iosTap.click();
        };

        const audio = () => {
            if (!audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return null;
                audioCtx = new Ctx();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
        };

        const blip = (freq, dur = 0.035, vol = 0.12, type = 'triangle') => {
            if (!soundOn) return;
            const ctx = audio();
            if (!ctx) return;
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + dur + 0.01);
        };

        const popSound = () => {
            if (!soundOn) return;
            const ctx = audio();
            if (!ctx) return;
            const t = ctx.currentTime;
            const len = Math.floor(ctx.sampleRate * 0.06);
            const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const band = ctx.createBiquadFilter();
            band.type = 'bandpass';
            band.frequency.value = rand(1400, 2200);
            band.Q.value = 0.9;
            const gain = ctx.createGain();
            gain.gain.value = 0.5;
            src.connect(band).connect(gain).connect(ctx.destination);
            src.start(t);
        };

        const hapticToggle = $('#hapticToggle');
        const soundToggle = $('#soundToggle');
        hapticToggle.addEventListener('click', () => {
            hapticsOn = !hapticsOn;
            hapticToggle.setAttribute('aria-pressed', String(hapticsOn));
            $('b', hapticToggle).textContent = hapticsOn ? 'On' : 'Off';
            haptic(15, 0);
        });
        soundToggle.addEventListener('click', () => {
            soundOn = !soundOn;
            soundToggle.setAttribute('aria-pressed', String(soundOn));
            $('b', soundToggle).textContent = soundOn ? 'On' : 'Off';
            if (soundOn) blip(880, 0.06, 0.1);
        });

        const capture = (el, e) => {
            try {
                el.setPointerCapture(e.pointerId);
            } catch (err) {
                // The pointer can already be gone by the time capture is requested.
            }
        };

        let inView = false;
        const loops = [];
        const wake = () => loops.forEach((loop) => loop.wake());
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                inView = entry.isIntersecting;
                if (inView) wake();
            }, { rootMargin: '120px' }).observe(playground);
        } else {
            inView = true;
        }

        /* Ball Pit */
        const canvas = $('#ballCanvas');
        const ballHint = $('#ballHint');
        const ctx2d = canvas.getContext('2d');
        const BALL_COLORS = ['#1c73bd', '#fa667d', '#abe0f0', '#ffd414', '#c4db6b', '#ff9500'];
        const BG_COLORS = ['#f5f7fa', '#fff4c4', '#e2f9ec', '#ffe3ea', '#dff4fc', '#ece6ff'];
        let balls = [];
        let W = 0;
        let H = 0;
        let R = 12;
        let dpr = 1;
        let gx = 0;
        let gy = 1;
        let bg = BG_COLORS[0];
        let overMax = false;
        let ballRunning = false;
        let ballLast = 0;
        let pointerDown = false;
        let stillFrames = 0;
        let lastSpawn = { x: 0, y: 0, t: 0 };

        const sizeCanvas = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            R = W * 0.049;
            drawBalls();
        };

        const drawBalls = () => {
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx2d.fillStyle = bg;
            ctx2d.fillRect(0, 0, W, H);
            balls.forEach((b) => {
                ctx2d.beginPath();
                ctx2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx2d.fillStyle = b.c;
                ctx2d.fill();
            });
        };

        const maxBalls = () => Math.max(24, Math.floor((0.6 * W * H) / (Math.PI * R * R)));

        const stepBalls = (dt) => {
            const g = H * 3;
            const sub = 2;
            const h = dt / sub;
            const iterations = 6;
            const cell = R * 2;
            const cols = Math.max(1, Math.ceil(W / cell));
            const maxStep = R * 0.35;
            for (let s = 0; s < sub; s += 1) {
                balls.forEach((b) => {
                    const damp = b.age < 30 ? 0.8 + b.age * 0.0065 : 0.996;
                    b.age += 1;
                    let vx = (b.x - b.px) * damp;
                    let vy = (b.y - b.py) * damp;
                    const speed = Math.hypot(vx, vy);
                    if (speed > maxStep) {
                        vx *= maxStep / speed;
                        vy *= maxStep / speed;
                    }
                    b.px = b.x;
                    b.py = b.y;
                    b.x += vx + gx * g * h * h;
                    b.y += vy + gy * g * h * h;
                });
                for (let it = 0; it < iterations; it += 1) {
                    const grid = new Map();
                    balls.forEach((b, i) => {
                        const key = Math.floor(b.y / cell) * cols + Math.floor(b.x / cell);
                        const list = grid.get(key);
                        if (list) list.push(i);
                        else grid.set(key, [i]);
                    });
                    balls.forEach((a, i) => {
                        const cx = Math.floor(a.x / cell);
                        const cy = Math.floor(a.y / cell);
                        for (let oy = -1; oy <= 1; oy += 1) {
                            for (let ox = -1; ox <= 1; ox += 1) {
                                const list = grid.get((cy + oy) * cols + cx + ox);
                                if (!list) continue;
                                list.forEach((j) => {
                                    if (j <= i) return;
                                    const b = balls[j];
                                    const dx = b.x - a.x;
                                    const dy = b.y - a.y;
                                    const min = a.r + b.r;
                                    const d2 = dx * dx + dy * dy;
                                    if (d2 >= min * min) return;
                                    if (d2 < 1e-6) {
                                        b.x += rand(-0.5, 0.5);
                                        b.y += rand(-0.5, 0.5);
                                        return;
                                    }
                                    const d = Math.sqrt(d2);
                                    const push = ((min - d) / d) * 0.5;
                                    if (it === 0 && balls.length < 16) {
                                        const rel = ((b.x - b.px) - (a.x - a.px)) * dx / d + ((b.y - b.py) - (a.y - a.py)) * dy / d;
                                        if (-rel / h > 160) haptic(8, 45);
                                    }
                                    a.x -= dx * push;
                                    a.y -= dy * push;
                                    b.x += dx * push;
                                    b.y += dy * push;
                                });
                            }
                        }
                    });
                    balls.forEach((b) => {
                        const bounce = it === 0;
                        if (b.x < b.r) {
                            const v = b.x - b.px;
                            b.x = b.r;
                            if (bounce) b.px = b.x + v * b.e;
                        } else if (b.x > W - b.r) {
                            const v = b.x - b.px;
                            b.x = W - b.r;
                            if (bounce) b.px = b.x + v * b.e;
                        }
                        if (b.y < b.r) {
                            const v = b.y - b.py;
                            b.y = b.r;
                            if (bounce) b.py = b.y + v * b.e;
                        } else if (b.y > H - b.r) {
                            const v = b.y - b.py;
                            b.y = H - b.r;
                            if (bounce) {
                                if (v / h > 140 && balls.length < 16) haptic(8, 45);
                                b.py = b.y + v * b.e;
                                b.px = b.x - (b.x - b.px) * 0.97;
                            }
                        }
                    });
                }
            }
        };

        const ballFrame = (now) => {
            const dt = Math.min((now - ballLast) / 1000, 1 / 30);
            ballLast = now;
            stepBalls(dt);
            drawBalls();
            const moving = pointerDown || balls.some((b) => Math.abs(b.x - b.px) + Math.abs(b.y - b.py) > 0.05);
            stillFrames = moving ? 0 : stillFrames + 1;
            if (inView && stillFrames < 60) {
                requestAnimationFrame(ballFrame);
            } else {
                ballRunning = false;
            }
        };

        const wakeBalls = () => {
            if (ballRunning || !inView) return;
            ballRunning = true;
            stillFrames = 0;
            ballLast = performance.now();
            requestAnimationFrame(ballFrame);
        };
        loops.push({ wake: wakeBalls });

        const spawnBall = (x, y, bouncy) => {
            if (balls.length >= maxBalls()) {
                if (!overMax) {
                    bg = BG_COLORS[1 + Math.floor(Math.random() * (BG_COLORS.length - 1))];
                    overMax = true;
                }
                balls.splice(Math.floor(Math.random() * balls.length), 1);
            }
            const bx = Math.min(Math.max(x + rand(-R, R) * 0.3, R), W - R);
            const by = Math.min(Math.max(y + rand(-R, R) * 0.3, R), H - R);
            balls.push({
                x: bx,
                y: by,
                px: bx - rand(-0.3, 0.3),
                py: by,
                age: 0,
                r: R,
                e: bouncy ? 0.55 : 0.3,
                c: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]
            });
            haptic(10, 35);
            blip(rand(500, 700), 0.03, 0.06, 'sine');
            ballHint.classList.add('gone');
            stillFrames = 0;
            wakeBalls();
        };

        const localPoint = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        canvas.addEventListener('pointerdown', (e) => {
            pointerDown = true;
            capture(canvas, e);
            const p = localPoint(e);
            spawnBall(p.x, p.y, true);
            lastSpawn = { ...p, t: performance.now() };
        });
        canvas.addEventListener('pointermove', (e) => {
            if (!pointerDown) return;
            const p = localPoint(e);
            const now = performance.now();
            if (now - lastSpawn.t > 45 || Math.hypot(p.x - lastSpawn.x, p.y - lastSpawn.y) > R * 1.4) {
                spawnBall(p.x, p.y, false);
                lastSpawn = { ...p, t: now };
            }
        });
        const release = () => { pointerDown = false; };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);

        $('#ballClear').addEventListener('click', () => {
            balls = [];
            overMax = false;
            bg = BG_COLORS[0];
            drawBalls();
            ballHint.classList.remove('gone');
        });

        window.addEventListener('devicemotion', (e) => {
            const a = e.accelerationIncludingGravity;
            if (!a || a.x == null || a.y == null) return;
            const len = Math.hypot(a.x, a.y) || 1;
            if (len < 2) return;
            gx = (isIOS ? a.x : -a.x) / 9.8;
            gy = (isIOS ? -a.y : a.y) / 9.8;
            if (balls.length) wakeBalls();
        });

        sizeCanvas();
        if ('ResizeObserver' in window) new ResizeObserver(sizeCanvas).observe(canvas);

        /* Fidget Spinner */
        const spinStage = $('#spinStage');
        const spinner = $('#spinner');
        const rpmLabel = $('#spinRpm');
        const spinHint = $('.pg-hint', spinStage);
        const ARM = (Math.PI * 2) / 3;
        let theta = 0;
        let omega = 0;
        let spinRunning = false;
        let spinLast = 0;
        let dragging = false;
        let dragAngle = 0;
        let dragTime = 0;
        let lastArm = 0;

        const angleAt = (e) => {
            const r = spinStage.getBoundingClientRect();
            return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        };

        const renderSpinner = () => {
            spinner.style.transform = `rotate(${theta}rad)`;
            rpmLabel.textContent = Math.round((Math.abs(omega) * 60) / (Math.PI * 2));
        };

        const armTicks = () => {
            const arm = Math.floor(theta / ARM);
            if (arm !== lastArm) {
                lastArm = arm;
                const speed = Math.abs(omega);
                haptic(Math.min(6 + speed * 0.4, 18), Math.max(22, 90 - speed * 3));
                if (speed < 40) blip(1600 + speed * 20, 0.02, 0.05, 'square');
            }
        };

        const spinFrame = (now) => {
            const dt = Math.min((now - spinLast) / 1000, 1 / 20);
            spinLast = now;
            if (!dragging) {
                theta += omega * dt;
                omega *= Math.exp(-0.18 * dt);
                const friction = 0.35 * dt;
                omega = Math.abs(omega) <= friction ? 0 : omega - Math.sign(omega) * friction;
            }
            armTicks();
            renderSpinner();
            if (inView && (dragging || omega !== 0)) {
                requestAnimationFrame(spinFrame);
            } else {
                spinRunning = false;
            }
        };

        const wakeSpinner = () => {
            if (spinRunning || !inView) return;
            spinRunning = true;
            spinLast = performance.now();
            requestAnimationFrame(spinFrame);
        };
        loops.push({ wake: wakeSpinner });

        spinStage.addEventListener('pointerdown', (e) => {
            dragging = true;
            capture(spinStage, e);
            dragAngle = angleAt(e);
            dragTime = performance.now();
            omega = 0;
            haptic(20, 0);
            spinHint.classList.add('gone');
            wakeSpinner();
        });
        spinStage.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const a = angleAt(e);
            const now = performance.now();
            let d = a - dragAngle;
            if (d > Math.PI) d -= Math.PI * 2;
            if (d < -Math.PI) d += Math.PI * 2;
            const dt = Math.max((now - dragTime) / 1000, 0.001);
            theta += d;
            omega = Math.max(-60, Math.min(60, (d / dt) * 1.1));
            dragAngle = a;
            dragTime = now;
        });
        const endSpin = () => {
            if (!dragging) return;
            dragging = false;
            if (performance.now() - dragTime > 90) omega *= 0.2;
            wakeSpinner();
        };
        spinStage.addEventListener('pointerup', endSpin);
        spinStage.addEventListener('pointercancel', endSpin);

        /* Bubble Wrap */
        const bubbleGrid = $('#bubbleGrid');
        const BUBBLES = 30;
        for (let i = 0; i < BUBBLES; i += 1) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bubble';
            b.setAttribute('aria-label', 'Bubble');
            bubbleGrid.appendChild(b);
        }
        const bubbles = $$('.bubble', bubbleGrid);
        let wrapping = false;

        const popBubble = (b) => {
            if (!b || b.classList.contains('popped')) return;
            b.classList.add('popped');
            b.setAttribute('aria-label', 'Popped bubble');
            haptic(16, 25);
            popSound();
        };

        bubbleGrid.addEventListener('pointerdown', (e) => {
            wrapping = true;
            capture(bubbleGrid, e);
            popBubble(e.target.closest('.bubble'));
        });
        bubbleGrid.addEventListener('pointermove', (e) => {
            if (!wrapping) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            popBubble(el && el.closest('.bubble'));
        });
        const endWrap = () => { wrapping = false; };
        bubbleGrid.addEventListener('pointerup', endWrap);
        bubbleGrid.addEventListener('pointercancel', endWrap);
        bubbleGrid.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('bubble')) {
                e.preventDefault();
                popBubble(e.target);
            }
        });

        $('#bubbleRefill').addEventListener('click', () => {
            bubbles.forEach((b) => {
                b.classList.remove('popped');
                b.setAttribute('aria-label', 'Bubble');
            });
            haptic(12, 0);
        });
    }

    /* Box breathing orb */
    const breath = $('#breath');
    if (breath) {
        const label = $('#breathLabel');
        const count = $('#breathCount');
        const phases = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];
        let timer = 0;
        let phase = 0;
        let sec = 4;

        const step = () => {
            sec -= 1;
            if (sec === 0) {
                phase = (phase + 1) % phases.length;
                sec = 4;
                label.textContent = phases[phase];
            }
            count.textContent = `${sec}`;
        };

        const start = () => {
            if (timer) return;
            phase = 0;
            sec = 4;
            label.textContent = phases[0];
            count.textContent = '4';
            breath.classList.remove('run');
            void breath.offsetWidth;
            breath.classList.add('run');
            timer = setInterval(step, 1000);
        };

        const stop = () => {
            clearInterval(timer);
            timer = 0;
            breath.classList.remove('run');
        };

        if (reduceMotion) {
            label.textContent = 'In 4 · Hold 4';
            count.textContent = 'Out 4 · Hold 4';
        } else if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) start();
                else stop();
            }, { threshold: 0.4 }).observe(breath);
        }
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

    /* Live Activity countdown */
    const laTime = $('#laTime');
    const laBar = $('#laBar');
    if (laTime && !reduceMotion) {
        let left = 42;
        const total = 60;
        setInterval(() => {
            left = left <= 0 ? total : left - 1;
            laTime.textContent = `0:${String(left).padStart(2, '0')}`;
            laBar.style.width = `${((total - left) / total) * 100}%`;
        }, 1000);
    }

    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
})();
