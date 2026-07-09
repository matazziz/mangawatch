/**
 * AdSense MangaWatch — emplacements manuels entre sections.
 */
(function initMwAdsense() {
    function getConfig() {
        return window.MW_ADSENSE || {};
    }

    function getPath() {
        return (window.location.pathname || '').replace(/\\/g, '/');
    }

    function isExcluded() {
        const path = getPath();
        const cfg = getConfig();
        const list = Array.isArray(cfg.excludePaths) ? cfg.excludePaths : [];
        return list.some(function(p) {
            return path === p || path.endsWith(p);
        });
    }

    function isEnabled() {
        const cfg = getConfig();
        if (cfg.enabled === false) return false;
        const clientId = String(cfg.clientId || '').trim();
        if (!clientId || clientId.indexOf('ca-pub-') !== 0) return false;
        if (/X{4,}/i.test(clientId) || clientId === 'ca-pub-XXXXXXXXXXXXXXXX') return false;
        return true;
    }

    function getActivePageRule() {
        const path = getPath();
        const pages = getConfig().pages || {};
        const keys = Object.keys(pages);
        for (let i = 0; i < keys.length; i++) {
            const rule = pages[keys[i]];
            if (rule && rule.match && rule.match.test(path)) {
                return rule;
            }
        }
        return null;
    }

    function injectStyles() {
        if (document.getElementById('mw-adsense-css')) return;
        const link = document.createElement('link');
        link.id = 'mw-adsense-css';
        link.rel = 'stylesheet';
        link.href = '/css/adsense.css?v=2';
        document.head.appendChild(link);
    }

    function loadAdsenseScript(clientId) {
        if (document.querySelector('script[data-mw-adsense]')) {
            return Promise.resolve();
        }
        return new Promise(function(resolve, reject) {
            const script = document.createElement('script');
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
                encodeURIComponent(clientId);
            script.setAttribute('data-mw-adsense', '1');
            script.onload = function() { resolve(); };
            script.onerror = function() { reject(new Error('AdSense script')); };
            document.head.appendChild(script);
        });
    }

    function pushAd(ins) {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('[AdSense] Affichage annonce:', e);
        }
    }

    function renderInto(container, slotKey) {
        if (!container || container.querySelector('.adsbygoogle')) return;
        const cfg = getConfig();
        const clientId = String(cfg.clientId || '').trim();
        const slots = cfg.slots || {};
        const slotId = String(slots[slotKey] || slots.horizontal || '').trim();

        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', clientId);
        if (slotId) {
            ins.setAttribute('data-ad-slot', slotId);
        }
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');

        container.appendChild(ins);
        pushAd(ins);
    }

    function createAdWrap(slotKey) {
        const wrap = document.createElement('aside');
        wrap.className = 'mw-ad-wrap mw-ad-wrap--between';
        wrap.setAttribute('data-mw-ad', slotKey);
        wrap.setAttribute('aria-label', 'Publicité');

        const label = document.createElement('span');
        label.className = 'mw-ad-label';
        label.textContent = 'Publicité';
        wrap.appendChild(label);

        const slot = document.createElement('div');
        slot.className = 'mw-ad-slot';
        wrap.appendChild(slot);

        return wrap;
    }

    function hasAdAfter(element) {
        const next = element && element.nextElementSibling;
        return !!(next && next.classList && next.classList.contains('mw-ad-wrap--between'));
    }

    function insertAdsBetweenSections(rule, slotKey) {
        if (!rule || !rule.container || !rule.sections) return 0;

        const container = document.querySelector(rule.container);
        if (!container) return 0;

        const sections = container.querySelectorAll(rule.sections);
        if (!sections || sections.length < 2) return 0;

        let inserted = 0;
        for (let i = 0; i < sections.length - 1; i++) {
            const section = sections[i];
            if (!section.parentNode || hasAdAfter(section)) continue;

            const wrap = createAdWrap(slotKey);
            section.insertAdjacentElement('afterend', wrap);
            renderInto(wrap.querySelector('.mw-ad-slot'), slotKey);
            inserted += 1;
        }
        return inserted;
    }

    function renderExistingSlots() {
        document.querySelectorAll('[data-mw-ad]').forEach(function(el) {
            if (el.classList.contains('mw-ad-wrap--between')) return;
            const slotKey = el.getAttribute('data-mw-ad') || 'horizontal';
            const target = el.querySelector('.mw-ad-slot') || el;
            renderInto(target, slotKey);
        });
    }

    function watchDetailsPage(rule, slotKey) {
        const container = document.querySelector(rule.container);
        if (!container) return;

        let lastCount = 0;
        const maxMs = Number(rule.watchDelayMs) || 12000;
        const started = Date.now();

        function tick() {
            const count = insertAdsBetweenSections(rule, slotKey);
            if (count > 0) lastCount += count;

            const blocks = container.querySelectorAll(rule.sections);
            const expectedGaps = Math.max(0, blocks.length - 1);
            const currentAds = container.querySelectorAll('.mw-ad-wrap--between').length;

            if (currentAds >= expectedGaps || Date.now() - started > maxMs) {
                return;
            }
            setTimeout(tick, 450);
        }

        tick();

        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function() {
                insertAdsBetweenSections(rule, slotKey);
            });
            observer.observe(container, { childList: true, subtree: true });
            setTimeout(function() { observer.disconnect(); }, maxMs);
        }
    }

    function run() {
        if (isExcluded() || !isEnabled()) return;

        const cfg = getConfig();
        const rule = getActivePageRule();
        if (!rule) return;

        const slotKey = getPath().match(/anime-details/i) ? 'details' : 'home';
        injectStyles();

        loadAdsenseScript(cfg.clientId).then(function() {
            if (slotKey === 'details') {
                watchDetailsPage(rule, slotKey);
            } else {
                insertAdsBetweenSections(rule, slotKey);
            }
            renderExistingSlots();
        }).catch(function(err) {
            console.warn('[AdSense] Chargement impossible:', err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
