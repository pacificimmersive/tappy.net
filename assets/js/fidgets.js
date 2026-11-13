(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const rand = (min, max) => min + Math.random() * (max - min);

    $$('[data-copy]').forEach((button) => {
        const label = button.textContent;
        button.addEventListener('click', async () => {
            const field = $(button.dataset.copy);
            try {
                await navigator.clipboard.writeText(field.value);
            } catch (err) {
                field.select();
                document.execCommand('copy');
            }
            button.textContent = 'Copied!';
            setTimeout(() => { button.textContent = label; }, 1800);
        });
    });

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
        spinTick: () => blip(1500, 0.012, 0.035, 'triangle'),
        clickerDown: () => {
            noise({ dur: 0.02, type: 'highpass', freq: 3200, q: 0.8, vol: 0.5, decay: 7 });
            blip(2600, 0.015, 0.07, 'square');
        },
        clickerUp: () => noise({ dur: 0.015, type: 'highpass', freq: 2400, q: 0.8, vol: 0.25, decay: 7 }),
        keyDown: (clicky, big) => {
            if (clicky) {
                noise({ dur: 0.022, type: 'highpass', freq: big ? 2200 : 3000, q: 0.8, vol: 0.55, decay: 6 });
                blip(big ? 1800 : rand(2900, 3300), 0.012, 0.06, 'square');
                noise({ dur: 0.04, type: 'lowpass', freq: 900, q: 1, vol: 0.25, decay: 5 });
            } else {
                noise({ dur: big ? 0.07 : 0.05, type: 'lowpass', freq: big ? rand(380, 460) : rand(520, 680), q: 1.4, vol: 0.9, decay: 5 });
                blip(big ? 110 : rand(150, 190), 0.05, 0.16, 'sine');
            }
        },
        keyUp: (clicky, big) => {
            if (clicky) noise({ dur: 0.016, type: 'highpass', freq: 2600, q: 0.8, vol: 0.22, decay: 7 });
            else noise({ dur: 0.03, type: 'lowpass', freq: big ? 700 : 950, q: 1.2, vol: 0.35, decay: 6 });
        },
        clack: (strength) => {
            noise({ dur: 0.03, type: 'highpass', freq: 3400, q: 0.7, vol: 0.2 + strength * 0.5, decay: 6 });
            blip(rand(2400, 2700), 0.05, 0.03 + strength * 0.08, 'sine');
        },
        squish: () => noise({ dur: 0.16, type: 'lowpass', freq: rand(420, 560), q: 0.7, vol: 0.55, decay: 2 }),
        unsquish: () => {
            blip(rand(240, 300), 0.09, 0.08, 'sine');
            noise({ dur: 0.08, type: 'lowpass', freq: 700, q: 0.7, vol: 0.25, decay: 3 });
        }
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

    /* Click Counter */
    const initClicker = (card) => {
        const button = $('.clicker', card);
        const countLabel = $('[data-count]', card);
        const cpsLabel = $('[data-cps]', card);
        const hint = $('.pg-hint', card);
        const COUNT_KEY = 'tappy-clicker-count';
        const MAX = 10000;
        let count = storedNumber(COUNT_KEY) % MAX;
        let recent = [];
        let cpsTimer = 0;

        // Each digit is a strip of 0-9 plus a trailing 0, so 9 can roll forward to 0.
        const strips = $$('.clicker-digit', card).map((digit) => {
            const strip = document.createElement('span');
            strip.className = 'clicker-strip';
            for (let n = 0; n <= 10; n += 1) {
                const span = document.createElement('span');
                span.textContent = n % 10;
                strip.appendChild(span);
            }
            strip.dataset.pos = '0';
            digit.appendChild(strip);
            return strip;
        });

        const place = (strip, pos, animate) => {
            strip.classList.toggle('snap', !animate);
            strip.style.setProperty('--n', pos);
            strip.dataset.pos = String(pos);
            if (!animate) void strip.offsetWidth;
        };

        const show = (value, animate) => {
            const text = String(value).padStart(strips.length, '0');
            strips.forEach((strip, i) => {
                const n = Number(text[i]);
                if (Number(strip.dataset.pos) === 10) place(strip, 0, false);
                const pos = Number(strip.dataset.pos);
                if (pos === n) return;
                place(strip, animate && n === 0 && pos === 9 ? 10 : n, animate);
            });
            if (countLabel) countLabel.textContent = value;
        };

        strips.forEach((strip) => strip.addEventListener('transitionend', () => {
            if (strip.dataset.pos === '10') place(strip, 0, false);
        }));

        const tickCps = () => {
            const now = performance.now();
            recent = recent.filter((t) => now - t < 1000);
            if (cpsLabel) cpsLabel.textContent = recent.length;
            clearTimeout(cpsTimer);
            if (recent.length) cpsTimer = setTimeout(tickCps, 1005 - (now - recent[0]));
        };

        const press = () => {
            count = (count + 1) % MAX;
            show(count, true);
            storeNumber(COUNT_KEY, count);
            button.classList.add('down');
            haptic(14, 0);
            sounds.clickerDown();
            hint.classList.add('gone');
            recent.push(performance.now());
            tickCps();
        };

        const release = () => {
            if (!button.classList.contains('down')) return;
            button.classList.remove('down');
            sounds.clickerUp();
        };

        button.addEventListener('pointerdown', (e) => {
            if (e.button > 0) return;
            capture(button, e);
            press();
        });
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('keydown', (e) => {
            if (e.key !== ' ' && e.key !== 'Enter') return;
            e.preventDefault();
            if (!e.repeat) press();
        });
        button.addEventListener('keyup', (e) => {
            if (e.key === ' ' || e.key === 'Enter') release();
        });

        if (card.dataset.typing === 'on') {
            const view = watch(card, () => {});
            document.addEventListener('keydown', (e) => {
                if (e.key !== ' ' || !view.inView) return;
                const target = e.target instanceof Element ? e.target : null;
                if (target && target.closest('a, button, input, textarea, select, summary, [contenteditable]')) return;
                e.preventDefault();
                if (!e.repeat) press();
            });
            document.addEventListener('keyup', (e) => {
                if (e.key === ' ') release();
            });
        }

        $('[data-fidget-reset]', card).addEventListener('click', () => {
            count = 0;
            show(0, true);
            storeNumber(COUNT_KEY, 0);
            haptic(20, 0);
        });

        show(count, false);
    };

    /* Mechanical Keyboard */
    const initKeyboard = (card) => {
        const board = $('.keyboard', card);
        const keysLabel = $('[data-keys]', card);
        const switchButton = $('[data-switch]', card);
        const hint = $('.pg-hint', card);
        const ROWS = [['Q', 'W', 'E', 'R'], ['A', 'S', 'D', 'F'], ['Z', 'X', 'C', 'V']];
        const ROW_COLORS = ['#ffa3b5', '#ffd84d', '#3dd5ff'];
        const keys = new Map();
        const held = new Map();
        let clicky = true;
        let pressed = 0;
        // On pages with several fidgets, typing only plays the keyboard after it has been tapped once.
        let listening = card.dataset.typing === 'on';
        const view = watch(card, () => {});

        const makeKey = (label, color, className = 'keycap') => {
            const key = document.createElement('button');
            key.type = 'button';
            key.className = className;
            key.style.setProperty('--c', color);
            key.textContent = label;
            board.appendChild(key);
            return key;
        };
        ROWS.forEach((row, r) => row.forEach((label) => keys.set(label, makeKey(label, ROW_COLORS[r]))));
        const letters = [...keys.values()];
        const space = makeKey('', '#2fe08a', 'keycap keycap-space');
        space.setAttribute('aria-label', 'Space');

        const down = (key) => {
            if (key.classList.contains('down')) return;
            key.classList.add('down');
            pressed += 1;
            if (keysLabel) keysLabel.textContent = pressed;
            haptic(12, 0);
            sounds.keyDown(clicky, key === space);
            hint.classList.add('gone');
        };

        const up = (key) => {
            if (!key.classList.contains('down')) return;
            key.classList.remove('down');
            sounds.keyUp(clicky, key === space);
        };

        const releaseHeld = (id) => {
            const key = held.get(id);
            if (!key) return;
            held.delete(id);
            if (![...held.values()].includes(key)) up(key);
        };

        board.addEventListener('pointerdown', (e) => {
            const key = e.target.closest('.keycap');
            if (!key || e.button > 0) return;
            capture(board, e);
            listening = true;
            held.set(e.pointerId, key);
            down(key);
        });
        board.addEventListener('pointerup', (e) => releaseHeld(e.pointerId));
        board.addEventListener('pointercancel', (e) => releaseHeld(e.pointerId));

        // Real keys map to the matching keycap; any other key always lands on the same one.
        const keyFor = (e) => {
            if (e.key === ' ') return space;
            const match = keys.get(e.key.toUpperCase());
            if (match) return match;
            let hash = 0;
            for (const ch of e.code || e.key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
            return letters[hash % letters.length];
        };

        document.addEventListener('keydown', (e) => {
            if (!listening || !view.inView || e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target instanceof Element ? e.target : null;
            if (target && target.closest('input, textarea, select, [contenteditable]')) return;
            if (e.key === ' ' && target && target.closest('a, summary, button:not(.keycap)')) return;
            e.preventDefault();
            if (e.repeat) return;
            const id = e.code || e.key;
            if (held.has(id)) return;
            const key = keyFor(e);
            held.set(id, key);
            down(key);
        });
        document.addEventListener('keyup', (e) => releaseHeld(e.code || e.key));
        window.addEventListener('blur', () => [...held.keys()].forEach(releaseHeld));

        switchButton.addEventListener('click', () => {
            clicky = !clicky;
            switchButton.textContent = clicky ? 'Clicky' : 'Thocky';
            switchButton.setAttribute('aria-label', `Switch sound: ${clicky ? 'clicky' : 'thocky'}`);
            board.classList.toggle('thocky', !clicky);
            sounds.keyDown(clicky, false);
            setTimeout(() => sounds.keyUp(clicky, false), 90);
        });
    };

    /* Newton's Cradle */
    const initCradle = (card) => {
        const canvas = $('canvas', card);
        const ctx2d = canvas.getContext('2d');
        const hint = $('.pg-hint', card);
        const clacksLabel = $('[data-clacks]', card);
        const INK = '#15334a';
        const N = 5;
        const GRAVITY = 40;
        const RESTITUTION = 0.99;
        const balls = Array.from({ length: N }, () => ({ a: 0, w: 0, held: false }));
        let W = 0;
        let H = 0;
        let dpr = 1;
        let R = 10;
        let L = 100;
        let cx = 0;
        let barY = 0;
        let baseY = 0;
        let maxAngle = 0.5;
        let grab = null;
        let running = false;
        let last = 0;
        let clacks = 0;
        let lastClack = 0;
        const view = watch(card, () => wake());

        const anchorX = (i) => cx + (i - (N - 1) / 2) * 2 * R;
        const ballAt = (i) => ({
            x: anchorX(i) + L * Math.sin(balls[i].a),
            y: barY + L * Math.cos(balls[i].a)
        });

        const roundRect = (x, y, w, h, r) => {
            ctx2d.beginPath();
            if (ctx2d.roundRect) ctx2d.roundRect(x, y, w, h, r);
            else ctx2d.rect(x, y, w, h);
            ctx2d.fill();
            ctx2d.stroke();
        };

        const draw = () => {
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx2d.clearRect(0, 0, W, H);
            ctx2d.lineCap = 'round';
            ctx2d.lineJoin = 'round';
            ctx2d.strokeStyle = INK;
            const lw = Math.max(2.5, W * 0.008);
            const postW = W * 0.035;
            const left = W * 0.06;
            const right = W * 0.94 - postW;

            ctx2d.fillStyle = '#ffd84d';
            ctx2d.lineWidth = lw;
            roundRect(left, barY, postW, baseY - barY, postW / 2);
            roundRect(right, barY, postW, baseY - barY, postW / 2);

            ctx2d.fillStyle = 'rgba(21, 51, 74, 0.12)';
            for (let i = 0; i < N; i += 1) {
                const p = ballAt(i);
                const lift = Math.min(1, (barY + L - p.y) / (R * 3));
                ctx2d.beginPath();
                ctx2d.ellipse(p.x, baseY - H * 0.012, R * (1 - lift * 0.4), R * 0.22, 0, 0, Math.PI * 2);
                ctx2d.fill();
            }

            ctx2d.fillStyle = '#ffd84d';
            roundRect(W * 0.03, baseY, W * 0.94, H * 0.07, H * 0.025);
            ctx2d.fillStyle = '#ffb400';
            roundRect(left - W * 0.015, barY - H * 0.035, right + postW - left + W * 0.03, H * 0.045, H * 0.02);

            ctx2d.lineWidth = Math.max(1.5, W * 0.005);
            ctx2d.strokeStyle = 'rgba(21, 51, 74, 0.7)';
            for (let i = 0; i < N; i += 1) {
                const p = ballAt(i);
                ctx2d.beginPath();
                ctx2d.moveTo(anchorX(i), barY + H * 0.01);
                ctx2d.lineTo(p.x, p.y);
                ctx2d.stroke();
            }

            ctx2d.strokeStyle = INK;
            ctx2d.lineWidth = lw;
            for (let i = 0; i < N; i += 1) {
                const p = ballAt(i);
                const shine = ctx2d.createRadialGradient(p.x - R * 0.35, p.y - R * 0.4, R * 0.08, p.x, p.y, R);
                shine.addColorStop(0, '#ffffff');
                shine.addColorStop(0.35, '#e2eaf0');
                shine.addColorStop(1, '#8fa3b3');
                ctx2d.fillStyle = shine;
                ctx2d.beginPath();
                ctx2d.arc(p.x, p.y, R, 0, Math.PI * 2);
                ctx2d.fill();
                ctx2d.stroke();
            }
        };

        const size = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            R = W * 0.055;
            cx = W / 2;
            barY = H * 0.13;
            L = H * 0.44;
            baseY = H * 0.73;
            maxAngle = Math.asin(Math.min(0.9, (anchorX(0) - R - W * 0.03) / L));
            draw();
        };

        // Balls touch at rest, so ball i overlaps ball i + 1 whenever its angle is larger.
        const collide = () => {
            let hit = 0;
            for (let pass = 0; pass < N * 2; pass += 1) {
                let any = false;
                for (let i = 0; i < N - 1; i += 1) {
                    const a = balls[i];
                    const b = balls[i + 1];
                    const rel = a.w - b.w;
                    if (a.a < b.a - 1e-4 || rel <= 1e-3 || (a.held && b.held)) continue;
                    if (a.held) {
                        b.w = a.w + RESTITUTION * rel;
                    } else if (b.held) {
                        a.w = b.w - RESTITUTION * rel;
                    } else {
                        const mean = (a.w + b.w) / 2;
                        a.w = mean - (RESTITUTION * rel) / 2;
                        b.w = mean + (RESTITUTION * rel) / 2;
                    }
                    hit = Math.max(hit, rel);
                    any = true;
                }
                if (!any) break;
            }
            for (let i = 0; i < N - 1; i += 1) {
                const a = balls[i];
                const b = balls[i + 1];
                if (a.a <= b.a) continue;
                if (a.held) b.a = a.a;
                else if (b.held) a.a = b.a;
                else a.a = b.a = (a.a + b.a) / 2;
            }
            return hit;
        };

        const clack = (speed) => {
            const now = performance.now();
            if (now - lastClack < 70) return;
            lastClack = now;
            clacks += 1;
            if (clacksLabel) clacksLabel.textContent = clacks;
            haptic(Math.min(8 + speed * 3, 22), 0);
            sounds.clack(Math.min(1, speed / 3.5));
        };

        const step = (dt) => {
            const sub = 8;
            const h = dt / sub;
            let hit = 0;
            for (let s = 0; s < sub; s += 1) {
                balls.forEach((b) => {
                    if (b.held) return;
                    b.w -= GRAVITY * Math.sin(b.a) * h;
                    b.w *= 1 - 0.12 * h;
                    b.a += b.w * h;
                });
                hit = Math.max(hit, collide());
            }
            if (hit > 0.3) clack(hit);
        };

        const frame = (now) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            step(dt);
            const moving = grab || balls.some((b) => Math.abs(b.w) > 0.004 || Math.abs(b.a) > 0.002);
            if (!moving) balls.forEach((b) => { b.a = 0; b.w = 0; });
            draw();
            if (view.inView && moving) {
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

        const localPoint = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        // Pulling one ball sideways drags along every ball beyond it on that side.
        const moveGrab = (p) => {
            const now = performance.now();
            const k = grab.i;
            const target = Math.atan2(p.x - anchorX(k), Math.max(p.y - barY, L * 0.2));
            const angle = Math.max(-maxAngle, Math.min(maxAngle, target));
            const dt = Math.max((now - grab.t) / 1000, 0.001);
            grab.w = grab.w * 0.5 + Math.max(-8, Math.min(8, (angle - grab.a) / dt)) * 0.5;
            grab.a = angle;
            grab.t = now;
            balls.forEach((b, j) => {
                const pushed = j === k
                    || (j < k && angle < 0 && b.a >= angle)
                    || (j > k && angle > 0 && b.a <= angle);
                b.held = pushed;
                if (pushed) {
                    b.a = angle;
                    b.w = grab.w;
                }
            });
        };

        canvas.addEventListener('pointerdown', (e) => {
            const p = localPoint(e);
            let nearest = -1;
            let best = R * 2.2;
            balls.forEach((b, i) => {
                const q = ballAt(i);
                const d = Math.hypot(q.x - p.x, q.y - p.y);
                if (d < best) {
                    best = d;
                    nearest = i;
                }
            });
            if (nearest < 0) return;
            capture(canvas, e);
            grab = { i: nearest, a: balls[nearest].a, w: 0, t: performance.now(), id: e.pointerId };
            hint.classList.add('gone');
            haptic(10, 0);
            moveGrab(p);
            wake();
        });
        canvas.addEventListener('pointermove', (e) => {
            if (grab && e.pointerId === grab.id) moveGrab(localPoint(e));
        });
        const release = (e) => {
            if (!grab || e.pointerId !== grab.id) return;
            if (performance.now() - grab.t > 80) grab.w = 0;
            balls.forEach((b) => {
                if (b.held) b.w = grab.w;
                b.held = false;
            });
            grab = null;
            wake();
        };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);

        $('[data-fidget-reset]', card).addEventListener('click', () => {
            balls.forEach((b) => {
                b.a = 0;
                b.w = 0;
                b.held = false;
            });
            grab = null;
            draw();
        });

        size();
        if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
    };

    /* Stress Ball */
    const initStressBall = (card) => {
        const canvas = $('canvas', card);
        const ctx2d = canvas.getContext('2d');
        const hint = $('.pg-hint', card);
        const squeezesLabel = $('[data-squeezes]', card);
        const colorButton = $('[data-color]', card);
        const INK = '#15334a';
        const COLORS = [
            ['#abe0f0', '#6ccaee', '#23a8e0'],
            ['#ffe789', '#ffd84d', '#f0a800'],
            ['#ffc2ce', '#ff8fa6', '#e8607e'],
            ['#9ff2c4', '#2fe08a', '#17a865'],
            ['#d6ccff', '#b19cff', '#7c5cf0']
        ];
        const N = 72;
        const points = Array.from({ length: N }, (_, i) => ({ t: (i / N) * Math.PI * 2, r: 1, v: 0 }));
        const touches = new Map();
        let color = 0;
        let squeezes = 0;
        let W = 0;
        let H = 0;
        let dpr = 1;
        let R0 = 100;
        let cx = 0;
        let cy = 0;
        let running = false;
        let last = 0;
        const view = watch(card, () => wake());

        // Pressing spreads the ball out, and a finger near the edge also dents it.
        const targetFor = (pt) => {
            let r = 1;
            const bx = Math.cos(pt.t);
            const by = Math.sin(pt.t);
            touches.forEach((p) => {
                const px = (p.x - cx) / R0;
                const py = (p.y - cy) / R0;
                const d = Math.min(1, Math.hypot(px, py));
                const dist = Math.hypot(bx - px, by - py);
                let gap = Math.abs(pt.t - Math.atan2(py, px)) % (Math.PI * 2);
                if (gap > Math.PI) gap = Math.PI * 2 - gap;
                const near = Math.max(0, 1 - gap / 0.8);
                const edge = Math.min(1, Math.max(0, (d - 0.3) / 0.6));
                r += p.depth * (0.08 + 0.07 * dist - 0.36 * edge * near * near);
            });
            return r;
        };

        const step = (dt) => {
            const sub = 3;
            const h = dt / sub;
            touches.forEach((p) => { p.depth = Math.min(1, p.depth + dt * 7); });
            for (let s = 0; s < sub; s += 1) {
                const rs = points.map((p) => p.r);
                points.forEach((p, i) => {
                    const smooth = rs[(i + N - 1) % N] + rs[(i + 1) % N] - 2 * p.r;
                    p.v += (220 * (targetFor(p) - p.r) + 900 * smooth - 7 * p.v) * h;
                });
                points.forEach((p) => { p.r += p.v * h; });
            }
        };

        const outline = () => {
            const xy = points.map((p) => [cx + Math.cos(p.t) * p.r * R0, cy + Math.sin(p.t) * p.r * R0]);
            const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            ctx2d.beginPath();
            const start = mid(xy[N - 1], xy[0]);
            ctx2d.moveTo(start[0], start[1]);
            xy.forEach((p, i) => {
                const m = mid(p, xy[(i + 1) % N]);
                ctx2d.quadraticCurveTo(p[0], p[1], m[0], m[1]);
            });
            ctx2d.closePath();
        };

        const faceImg = new Image();
        faceImg.onload = () => { if (W) draw(); };
        faceImg.src = '/assets/images/tappy-face-mark.png';

        const draw = () => {
            const [light, base, deep] = COLORS[color];
            const spread = points.reduce((sum, p) => sum + p.r, 0) / N;
            const squeeze = Math.min(1, [...touches.values()].reduce((m, p) => Math.max(m, p.depth), 0));
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx2d.clearRect(0, 0, W, H);

            ctx2d.fillStyle = 'rgba(21, 51, 74, 0.12)';
            ctx2d.beginPath();
            ctx2d.ellipse(cx, cy + R0 * 1.12, R0 * 0.8 * spread, R0 * 0.13, 0, 0, Math.PI * 2);
            ctx2d.fill();

            outline();
            const fill = ctx2d.createRadialGradient(cx - R0 * 0.35, cy - R0 * 0.4, R0 * 0.1, cx, cy, R0 * 1.15);
            fill.addColorStop(0, light);
            fill.addColorStop(0.55, base);
            fill.addColorStop(1, deep);
            ctx2d.fillStyle = fill;
            ctx2d.fill();

            ctx2d.save();
            ctx2d.clip();
            touches.forEach((p) => {
                const dent = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, R0 * 0.45);
                dent.addColorStop(0, `rgba(21, 51, 74, ${0.22 * p.depth})`);
                dent.addColorStop(1, 'rgba(21, 51, 74, 0)');
                ctx2d.fillStyle = dent;
                ctx2d.fillRect(0, 0, W, H);
            });
            ctx2d.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx2d.beginPath();
            ctx2d.ellipse(cx - R0 * 0.42, cy - R0 * 0.5, R0 * 0.2, R0 * 0.11, -0.7, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.restore();

            outline();
            ctx2d.strokeStyle = INK;
            ctx2d.lineWidth = Math.max(3, R0 * 0.035);
            ctx2d.lineJoin = 'round';
            ctx2d.lineCap = 'round';
            ctx2d.stroke();

            if (faceImg.complete && faceImg.naturalWidth) {
                // The logo circle spans 325px of the 400px image.
                const fw = R0 * (400 / 162.5) * spread * (1 + squeeze * 0.06);
                const fh = R0 * (400 / 162.5) * spread * (1 - squeeze * 0.08);
                ctx2d.drawImage(faceImg, cx - fw / 2, cy - fh / 2, fw, fh);
            }
        };

        const size = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            R0 = Math.min(W, H) * 0.3;
            cx = W / 2;
            cy = H * 0.46;
            draw();
        };

        const frame = (now) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            step(dt);
            draw();
            const moving = touches.size > 0 || points.some((p) => Math.abs(p.v) > 0.01 || Math.abs(p.r - 1) > 0.002);
            if (view.inView && moving) {
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

        const localPoint = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        const onBall = (p) => Math.hypot(p.x - cx, p.y - cy) <= R0 * 1.1;

        canvas.addEventListener('pointerdown', (e) => {
            const p = localPoint(e);
            if (!onBall(p) || touches.size >= 2) return;
            capture(canvas, e);
            touches.set(e.pointerId, { ...p, depth: 0, moved: 0 });
            squeezes += 1;
            if (squeezesLabel) squeezesLabel.textContent = squeezes;
            haptic(22, 0);
            sounds.squish();
            hint.classList.add('gone');
            wake();
        });
        canvas.addEventListener('pointermove', (e) => {
            const p = localPoint(e);
            const touch = touches.get(e.pointerId);
            if (!touch) {
                canvas.style.cursor = onBall(p) ? 'grab' : '';
                return;
            }
            touch.moved += Math.hypot(p.x - touch.x, p.y - touch.y);
            touch.x = p.x;
            touch.y = p.y;
            if (touch.moved > R0 * 0.2) {
                touch.moved = 0;
                haptic(6, 60);
            }
            wake();
        });
        const release = (e) => {
            if (!touches.delete(e.pointerId)) return;
            sounds.unsquish();
            haptic(10, 0);
            wake();
        };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);

        colorButton.addEventListener('click', () => {
            color = (color + 1) % COLORS.length;
            points.forEach((p) => { p.v += 1.2 * Math.cos(2 * p.t); });
            haptic(12, 0);
            wake();
            draw();
        });

        size();
        if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
    };

    const init = {
        'ball-pit': initBallPit,
        spinner: initSpinner,
        'bubble-wrap': initBubbleWrap,
        'pop-it': initPopIt,
        'light-switch': initLightSwitch,
        clicker: initClicker,
        keyboard: initKeyboard,
        'newtons-cradle': initCradle,
        'stress-ball': initStressBall
    };
    fidgets.forEach((card) => init[card.dataset.fidget]?.(card));
})();
