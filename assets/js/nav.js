(() => {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Active page highlighting */
    const normalizePath = (path) => {
        let p = path.replace(/index\.html$/, '');
        if (!p.endsWith('/')) p += '/';
        return p;
    };

    const currentPath = normalizePath(window.location.pathname);

    nav.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('mailto:') || href.startsWith('http')) return;
        const url = new URL(href, window.location.origin);
        if (url.hash) return;
        const linkPath = normalizePath(url.pathname);
        const isMatch = linkPath === currentPath
            || (linkPath === '/newsroom/' && currentPath.startsWith('/newsroom/'));
        if (!isMatch) return;

        link.setAttribute('aria-current', 'page');

        const item = link.closest('.nav-item');
        if (item) {
            const trigger = item.querySelector('.nav-trigger');
            if (trigger) trigger.classList.add('is-active');
        }

        const mobileGroup = link.closest('.mobile-group');
        if (mobileGroup) {
            const groupBtn = mobileGroup.querySelector('.mobile-group-btn');
            const panel = mobileGroup.querySelector('.mobile-group-panel');
            if (groupBtn) {
                groupBtn.classList.add('is-active');
                groupBtn.setAttribute('aria-expanded', 'true');
            }
            if (panel) panel.hidden = false;
        }
    });

    /* Desktop dropdowns */
    const dropdownItems = [...nav.querySelectorAll('[data-dropdown]')];
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const closeTimers = new WeakMap();

    const setDropdown = (item, open) => {
        const trigger = item.querySelector('.nav-trigger');
        const menu = item.querySelector('.nav-dropdown');
        if (!trigger || !menu) return;
        clearTimeout(closeTimers.get(item));
        if (open) {
            dropdownItems.forEach((other) => {
                if (other !== item) setDropdown(other, false);
            });
        }
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
    };

    const closeAllDropdowns = () => {
        dropdownItems.forEach((item) => setDropdown(item, false));
    };

    dropdownItems.forEach((item) => {
        const trigger = item.querySelector('.nav-trigger');
        const menu = item.querySelector('.nav-dropdown');
        if (!trigger || !menu) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            setDropdown(item, menu.hidden);
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setDropdown(item, true);
                const firstLink = menu.querySelector('a');
                if (firstLink) firstLink.focus();
            }
        });

        menu.addEventListener('click', (e) => {
            if (e.target.closest('a')) setDropdown(item, false);
        });

        item.addEventListener('pointerenter', (e) => {
            if (e.pointerType === 'mouse' && canHover.matches) {
                clearTimeout(closeTimers.get(item));
                setDropdown(item, true);
            }
        });

        item.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'mouse' && canHover.matches) {
                clearTimeout(closeTimers.get(item));
                closeTimers.set(item, setTimeout(() => setDropdown(item, false), 140));
            }
        });
    });

    /* Mobile menu & accordion groups */
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    const setMobileMenu = (open) => {
        if (!navToggle || !mobileMenu) return;
        mobileMenu.hidden = !open;
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', () => setMobileMenu(mobileMenu.hidden));

        mobileMenu.querySelectorAll('[data-mobile-group]').forEach((group) => {
            const btn = group.querySelector('.mobile-group-btn');
            const panel = group.querySelector('.mobile-group-panel');
            if (!btn || !panel) return;
            btn.addEventListener('click', () => {
                const open = panel.hidden;
                panel.hidden = !open;
                btn.setAttribute('aria-expanded', String(open));
            });
        });

        mobileMenu.addEventListener('click', (e) => {
            if (e.target.closest('a')) setMobileMenu(false);
        });
    }

    /* Dismiss on Escape / outside click / desktop breakpoint */
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const openItem = dropdownItems.find((item) => {
            const menu = item.querySelector('.nav-dropdown');
            return menu && !menu.hidden;
        });
        if (openItem) {
            const trigger = openItem.querySelector('.nav-trigger');
            setDropdown(openItem, false);
            if (trigger) trigger.focus();
        }
        if (mobileMenu && !mobileMenu.hidden) {
            setMobileMenu(false);
            if (navToggle) navToggle.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) {
            closeAllDropdowns();
            setMobileMenu(false);
        }
    });

    window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
        if (e.matches) setMobileMenu(false);
        else closeAllDropdowns();
    });
})();
