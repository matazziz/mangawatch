/**
 * Chargement Google AdSense (auto + emplacements data-mw-ad).
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
        const defaults = [
            '/admin.html',
            '/pages/admin.html',
            '/reset-password.html',
            '/pages/reset-password.html',
            '/public/reset-password.html'
        ];
        const list = Array.isArray(cfg.excludePaths) ? cfg.excludePaths : defaults;
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

    function injectStyles() {
        if (document.getElementById('mw-adsense-css')) return;
        const link = document.createElement('link');
        link.id = 'mw-adsense-css';
        link.rel = 'stylesheet';
        link.href = '/css/adsense.css?v=1';
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

    function createAdWrap(slotKey, extraClass) {
        const wrap = document.createElement('aside');
        wrap.className = 'mw-ad-wrap' + (extraClass ? ' ' + extraClass : '');
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

    function insertBeforeFooter(slotKey) {
        if (document.querySelector('.mw-ad-wrap[data-mw-ad="' + slotKey + '"]')) return;
        const footer = document.querySelector('.footer-unified');
        if (!footer || !footer.parentNode) return;
        const wrap = createAdWrap(slotKey, 'mw-ad-wrap--footer');
        footer.parentNode.insertBefore(wrap, footer);
        renderInto(wrap.querySelector('.mw-ad-slot'), slotKey);
    }

    function insertCatalogAd() {
        const path = getPath();
        if (!/\/manga-database\.html$/i.test(path)) return;
        if (document.querySelector('.mw-ad-wrap--catalog')) return;

        const anchor = document.querySelector('.catalogue-container') ||
            document.querySelector('#catalogue-grid') ||
            document.querySelector('.manga-grid') ||
            document.querySelector('main');

        if (!anchor || !anchor.parentNode) return;

        const wrap = createAdWrap('catalog', 'mw-ad-wrap--catalog');
        anchor.parentNode.insertBefore(wrap, anchor);
        renderInto(wrap.querySelector('.mw-ad-slot'), 'catalog');
    }

    function renderExistingSlots() {
        document.querySelectorAll('[data-mw-ad]').forEach(function(el) {
            const slotKey = el.getAttribute('data-mw-ad') || 'horizontal';
            const target = el.querySelector('.mw-ad-slot') || el;
            renderInto(target, slotKey);
        });
    }

    function run() {
        if (isExcluded() || !isEnabled()) return;

        const cfg = getConfig();
        injectStyles();

        loadAdsenseScript(cfg.clientId).then(function() {
            if (cfg.autoInsertFooter !== false) {
                insertBeforeFooter('horizontal');
            }
            insertCatalogAd();
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
