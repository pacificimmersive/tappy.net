(() => {
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const flash = (btn, text) => {
        const label = btn.querySelector('span') || btn;
        const original = label.textContent;
        label.textContent = text;
        btn.classList.add('is-done');
        setTimeout(() => {
            label.textContent = original;
            btn.classList.remove('is-done');
        }, 1600);
    };

    const copy = async (text, btn, done) => {
        try {
            await navigator.clipboard.writeText(text);
            flash(btn, done);
        } catch {
            window.prompt('Copy this text:', text);
        }
    };

    $$('[data-copy-article]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const parts = $$('[data-copy-part]')
                .flatMap((el) => (el.matches('.nr-body') ? $$(':scope > h2, :scope > p, :scope > ul', el) : [el]))
                .map((el) => el.innerText.trim())
                .filter(Boolean);
            copy(parts.join('\n\n'), btn, 'Copied!');
        });
    });

    $$('[data-share]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
            if (navigator.share) {
                try {
                    await navigator.share({ title: document.title, url });
                    return;
                } catch (err) {
                    if (err && err.name === 'AbortError') return;
                }
            }
            copy(url, btn, 'Link copied');
        });
    });

    $$('[data-gallery]').forEach((gallery) => {
        const track = gallery.querySelector('.nr-gallery-track');
        const slides = Array.from(track.children);
        const caption = gallery.querySelector('[data-gallery-caption]');
        const download = gallery.querySelector('[data-gallery-download]');
        const count = gallery.querySelector('[data-gallery-count]');
        const prev = gallery.querySelector('[data-gallery-prev]');
        const next = gallery.querySelector('[data-gallery-next]');
        let index = 0;

        const render = () => {
            const slide = slides[index];
            caption.textContent = slide.dataset.caption;
            download.href = slide.dataset.download;
            count.textContent = `${index + 1} / ${slides.length}`;
            prev.disabled = index === 0;
            next.disabled = index === slides.length - 1;
            slides.forEach((s, i) => s.setAttribute('aria-hidden', String(i !== index)));
        };

        const go = (i) => {
            index = Math.max(0, Math.min(slides.length - 1, i));
            track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
            render();
        };

        prev.addEventListener('click', () => go(index - 1));
        next.addEventListener('click', () => go(index + 1));

        let ticking = false;
        track.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                const i = Math.round(track.scrollLeft / track.clientWidth);
                if (i !== index) {
                    index = i;
                    render();
                }
            });
        }, { passive: true });

        gallery.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') go(index - 1);
            if (e.key === 'ArrowRight') go(index + 1);
        });

        render();
    });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    $$('[data-video]').forEach((panel) => {
        const video = panel.querySelector('video');
        const toggle = panel.querySelector('[data-video-toggle]');
        let pausedByUser = reduceMotion;

        const sync = () => {
            toggle.classList.toggle('is-paused', video.paused);
            toggle.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
        };
        video.addEventListener('play', sync);
        video.addEventListener('pause', sync);

        toggle.addEventListener('click', () => {
            pausedByUser = !video.paused;
            if (video.paused) video.play().catch(() => {});
            else video.pause();
        });

        new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) video.pause();
            else if (!pausedByUser) video.play().catch(() => {});
        }, { threshold: 0.35 }).observe(video);

        sync();
    });
})();
