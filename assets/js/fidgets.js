(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const rand = (min, max) => min + Math.random() * (max - min);

    const fidgets = $$('[data-fidget]');
    if (!fidgets.length) return;

    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const soundToggles = $$('[data-sound-toggle]');
    let soundOn = soundToggles.some((t) => t.getAttribute('aria-pressed') === 'true');
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
        const now = performance.now();
        if (now - lastHaptic < gap) return false;
        lastHaptic = now;
        if (navigator.vibrate) navigator.vibrate(ms);
        else if (iosTap) iosTap.click();
        return true;
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

    const noise = ({ dur = 0.06, type = 'bandpass', freq = 1800, q = 0.9, vol = 0.5, decay = 3 } = {}) => {
        if (!soundOn) return;
        const ctx = audio();
        if (!ctx) return;
        const len = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = freq;
        filter.Q.value = q;
        const gain = ctx.createGain();
        gain.gain.value = vol;
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(ctx.currentTime);
    };

    const sounds = {
        bubble: () => noise({ freq: rand(1400, 2200) }),
        popIt: () => {
            noise({ dur: 0.05, type: 'lowpass', freq: rand(700, 950), q: 1.2, vol: 0.7, decay: 4 });
            blip(rand(170, 220), 0.06, 0.18, 'sine');
        },
        click: (on) => {
            noise({ dur: 0.025, type: 'highpass', freq: 2500, q: 0.7, vol: 0.45, decay: 6 });
            blip(on ? 2100 : 1700, 0.018, 0.08, 'square');
        },
        spinTick: () => blip(1500, 0.012, 0.035, 'triangle')
    };

    const renderSound = () => soundToggles.forEach((t) => {
        t.setAttribute('aria-pressed', String(soundOn));
        const label = $('b', t);
        if (label) label.textContent = soundOn ? 'On' : 'Off';
    });

    soundToggles.forEach((t) => t.addEventListener('click', () => {
        soundOn = !soundOn;
        renderSound();
        if (soundOn) blip(880, 0.06, 0.1);
    }));

    const capture = (el, e) => {
        try {
            el.setPointerCapture(e.pointerId);
        } catch (err) {
            // The pointer can already be gone by the time capture is requested.
        }
    };

    const watch = (el, onEnter) => {
        const view = { inView: !('IntersectionObserver' in window) };
        if (!view.inView) {
            new IntersectionObserver(([entry]) => {
                view.inView = entry.isIntersecting;
                if (view.inView) onEnter();
            }, { rootMargin: '120px' }).observe(el);
        }
        return view;
    };

    const storedNumber = (key) => {
        try {
            return Number(localStorage.getItem(key)) || 0;
        } catch (err) {
            return 0;
        }
    };

    const storeNumber = (key, value) => {
        try {
            localStorage.setItem(key, String(value));
        } catch (err) {
            // Storage can be unavailable in private browsing.
        }
    };

    /* Drag across a grid of buttons to press each one the pointer passes over. */
    const dragToPress = (grid, selector, press) => {
        let pressing = false;
        grid.addEventListener('pointerdown', (e) => {
            pressing = true;
            capture(grid, e);
            press(e.target.closest(selector));
        });
        grid.addEventListener('pointermove', (e) => {
            if (!pressing) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            press(el && el.closest(selector));
        });
        const end = () => { pressing = false; };
        grid.addEventListener('pointerup', end);
        grid.addEventListener('pointercancel', end);
        grid.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches(selector)) {
                e.preventDefault();
                press(e.target);
            }
        });
    };

    /* Ball Pit */
    const initBallPit = (card) => {
        const canvas = $('canvas', card);
        const hint = $('.pg-hint', card);
        const countLabel = $('[data-balls]', card);
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
        let running = false;
        let last = 0;
        let pointerDown = false;
        let stillFrames = 0;
        let lastSpawn = { x: 0, y: 0, t: 0 };
        const view = watch(card, () => wake());

        const draw = () => {
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

        const size = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            R = W * 0.049;
            draw();
        };

        const maxBalls = () => Math.max(24, Math.floor((0.6 * W * H) / (Math.PI * R * R)));

        const renderCount = () => {
            if (countLabel) countLabel.textContent = balls.length;
        };

        const step = (dt) => {
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

        const frame = (now) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            step(dt);
            draw();
            const moving = pointerDown || balls.some((b) => Math.abs(b.x - b.px) + Math.abs(b.y - b.py) > 0.05);
            stillFrames = moving ? 0 : stillFrames + 1;
            if (view.inView && stillFrames < 60) {
                requestAnimationFrame(frame);
            } else {
                running = false;
            }
        };

        const wake = () => {
            if (running || !view.inView) return;
            running = true;
            stillFrames = 0;
            last = performance.now();
            requestAnimationFrame(frame);
        };

        const spawn = (x, y, bouncy) => {
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
            hint.classList.add('gone');
            renderCount();
            stillFrames = 0;
            wake();
        };

        const localPoint = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        canvas.addEventListener('pointerdown', (e) => {
            pointerDown = true;
            capture(canvas, e);
            const p = localPoint(e);
            spawn(p.x, p.y, true);
            lastSpawn = { ...p, t: performance.now() };
        });
        canvas.addEventListener('pointermove', (e) => {
            if (!pointerDown) return;
            const p = localPoint(e);
            const now = performance.now();
            if (now - lastSpawn.t > 45 || Math.hypot(p.x - lastSpawn.x, p.y - lastSpawn.y) > R * 1.4) {
                spawn(p.x, p.y, false);
                lastSpawn = { ...p, t: now };
            }
        });
        const release = () => { pointerDown = false; };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);

        $('[data-fidget-reset]', card).addEventListener('click', () => {
            balls = [];
            overMax = false;
            bg = BG_COLORS[0];
            draw();
            renderCount();
            hint.classList.remove('gone');
        });

        window.addEventListener('devicemotion', (e) => {
            const a = e.accelerationIncludingGravity;
            if (!a || a.x == null || a.y == null) return;
            const len = Math.hypot(a.x, a.y) || 1;
            if (len < 2) return;
            gx = (isIOS ? a.x : -a.x) / 9.8;
            gy = (isIOS ? -a.y : a.y) / 9.8;
            if (balls.length) wake();
        });

        // iOS only delivers motion events after the visitor grants access.
        const tilt = $('[data-tilt]', card);
        if (tilt && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            tilt.hidden = false;
            tilt.addEventListener('click', async () => {
                try {
                    if (await DeviceMotionEvent.requestPermission() === 'granted') tilt.hidden = true;
                } catch (err) {
                    tilt.hidden = true;
                }
            });
        }

        size();
        if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
    };

    /* Fidget Spinner */
    const initSpinner = (card) => {
        const stage = $('.pg-spin', card);
        const spinner = $('.spinner-img', card);
        const rpmLabel = $('[data-rpm]', card);
        const bestLabel = $('[data-best-rpm]', card);
        const hint = $('.pg-hint', stage);
        const ARM = (Math.PI * 2) / 3;
        const BEST_KEY = 'tappy-spinner-best-rpm';
        let theta = 0;
        let omega = 0;
        let running = false;
        let last = 0;
        let dragging = false;
        let dragAngle = 0;
        let dragTime = 0;
        let lastArm = 0;
        let best = bestLabel ? storedNumber(BEST_KEY) : 0;
        const view = watch(card, () => wake());

        const angleAt = (e) => {
            const r = stage.getBoundingClientRect();
            return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        };

        const render = () => {
            spinner.style.transform = `rotate(${theta}rad)`;
            const rpm = Math.round((Math.abs(omega) * 60) / (Math.PI * 2));
            rpmLabel.textContent = rpm;
            if (bestLabel && !dragging && rpm > best) {
                best = rpm;
                bestLabel.textContent = best;
                storeNumber(BEST_KEY, best);
            }
        };

        const armTicks = () => {
            const arm = Math.floor(theta / ARM);
            if (arm !== lastArm) {
                lastArm = arm;
                const speed = Math.abs(omega);
                if (haptic(Math.min(6 + speed * 0.4, 18), Math.max(22, 90 - speed * 3))) sounds.spinTick();
            }
        };

        const frame = (now) => {
            const dt = Math.min((now - last) / 1000, 1 / 20);
            last = now;
            if (!dragging) {
                theta += omega * dt;
                omega *= Math.exp(-0.18 * dt);
                const friction = 0.35 * dt;
                omega = Math.abs(omega) <= friction ? 0 : omega - Math.sign(omega) * friction;
            }
            armTicks();
            render();
            if (view.inView && (dragging || omega !== 0)) {
                requestAnimationFrame(frame);
            } else {
                running = false;
            }
        };

        const wake = () => {
            if (running || !view.inView) return;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        };

        stage.addEventListener('pointerdown', (e) => {
            dragging = true;
            capture(stage, e);
            dragAngle = angleAt(e);
            dragTime = performance.now();
            omega = 0;
            haptic(20, 0);
            hint.classList.add('gone');
            wake();
        });
        stage.addEventListener('pointermove', (e) => {
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
        const end = () => {
            if (!dragging) return;
            dragging = false;
            if (performance.now() - dragTime > 90) omega *= 0.2;
            wake();
        };
        stage.addEventListener('pointerup', end);
        stage.addEventListener('pointercancel', end);

        if (bestLabel) bestLabel.textContent = best;
    };

    /* Shared by Bubble Wrap and Pop It: a running total of everything popped. */
    const popCounter = (card) => {
        const label = $('[data-popped]', card);
        let total = 0;
        return () => {
            total += 1;
            if (label) label.textContent = total;
        };
    };

    /* Bubble Wrap */
    const initBubbleWrap = (card) => {
        const grid = $('.bubble-grid', card);
        const count = Number(card.dataset.count) || 30;
        const counted = popCounter(card);
        if (card.dataset.cols) grid.style.setProperty('--cols', card.dataset.cols);
        for (let i = 0; i < count; i += 1) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bubble';
            b.setAttribute('aria-label', 'Bubble');
            grid.appendChild(b);
        }
        const bubbles = $$('.bubble', grid);

        dragToPress(grid, '.bubble', (b) => {
            if (!b || b.classList.contains('popped')) return;
            b.classList.add('popped');
            b.setAttribute('aria-label', 'Popped bubble');
            haptic(16, 25);
            sounds.bubble();
            counted();
        });

        $('[data-fidget-reset]', card).addEventListener('click', () => {
            bubbles.forEach((b) => {
                b.classList.remove('popped');
                b.setAttribute('aria-label', 'Bubble');
            });
            haptic(12, 0);
        });
    };

    /* Pop It */
    const initPopIt = (card) => {
        const board = $('.popit', card);
        const ROW_COLORS = ['#ff5a6e', '#ff9a3c', '#ffd23f', '#3fd47a', '#3aa8ff', '#9b6bff'];
        const FLIP_MS = 560;
        const counted = popCounter(card);
        let popped = 0;
        let flipping = false;

        ROW_COLORS.forEach((color) => {
            const row = document.createElement('div');
            row.className = 'popit-row';
            row.style.setProperty('--c', color);
            for (let i = 0; i < ROW_COLORS.length; i += 1) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'popit-bubble';
                b.setAttribute('aria-label', 'Pop It bubble');
                row.appendChild(b);
            }
            board.appendChild(row);
        });
        const bubbles = $$('.popit-bubble', board);

        const flip = () => {
            if (flipping) return;
            flipping = true;
            board.classList.remove('flip');
            void board.offsetWidth;
            board.classList.add('flip');
            haptic(30, 0);
            setTimeout(() => {
                bubbles.forEach((b) => {
                    b.classList.remove('popped');
                    b.setAttribute('aria-label', 'Pop It bubble');
                });
                popped = 0;
            }, FLIP_MS / 2);
            setTimeout(() => {
                board.classList.remove('flip');
                flipping = false;
            }, FLIP_MS);
        };

        dragToPress(board, '.popit-bubble', (b) => {
            if (!b || flipping || b.classList.contains('popped')) return;
            b.classList.add('popped');
            b.setAttribute('aria-label', 'Popped bubble');
            haptic(18, 25);
            sounds.popIt();
            counted();
            popped += 1;
            if (popped === bubbles.length) setTimeout(flip, 450);
        });

        $('[data-fidget-reset]', card).addEventListener('click', flip);
    };

    /* Light Switch */
    const initLightSwitch = (card) => {
        const room = $('.pg-light', card);
        const toggle = $('.light-switch', card);
        const flipsLabel = $('[data-flips]', card);
        const hint = $('.pg-hint', card);
        let on = toggle.getAttribute('aria-pressed') === 'true';
        let flips = 0;
        let startY = null;
        let swiped = false;

        const set = (next) => {
            if (next === on) return;
            on = next;
            flips += 1;
            toggle.setAttribute('aria-pressed', String(on));
            room.classList.toggle('is-off', !on);
            haptic(24, 0);
            sounds.click(on);
            if (flipsLabel) flipsLabel.textContent = flips;
            hint.classList.add('gone');
        };

        // A tap flips it; a swipe sets it in the direction of the swipe.
        toggle.addEventListener('pointerdown', (e) => {
            startY = e.clientY;
            swiped = false;
            capture(toggle, e);
        });
        toggle.addEventListener('pointermove', (e) => {
            if (startY === null) return;
            const dy = e.clientY - startY;
            if (Math.abs(dy) < 14) return;
            set(dy < 0);
            swiped = true;
            startY = e.clientY;
        });
        const end = () => { startY = null; };
        toggle.addEventListener('pointerup', end);
        toggle.addEventListener('pointercancel', end);
        toggle.addEventListener('click', () => {
            if (swiped) {
                swiped = false;
                return;
            }
            set(!on);
        });
    };

    const init = {
        'ball-pit': initBallPit,
        spinner: initSpinner,
        'bubble-wrap': initBubbleWrap,
        'pop-it': initPopIt,
        'light-switch': initLightSwitch
    };
    fidgets.forEach((card) => init[card.dataset.fidget]?.(card));
})();
