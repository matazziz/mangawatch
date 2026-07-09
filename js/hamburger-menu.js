// Gestion du menu hamburger responsive
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileBreakpoint = 768;

    if (!hamburgerBtn || !mobileMenu) {
        return;
    }

    function isBoutiqueDisabledTemporarily() {
        const path = (window.location.pathname || '').replace(/\\/g, '/');
        if (/\/user-profile\.html/.test(path)) {
            return true;
        }
        try {
            return sessionStorage.getItem('mw_boutique_disabled') === '1' ||
                localStorage.getItem('mw_boutique_disabled') === '1' ||
                document.documentElement.getAttribute('data-boutique-disabled') === '1' ||
                document.body.getAttribute('data-boutique-disabled') === '1';
        } catch (e) {
            return false;
        }
    }

    function isMobileViewport() {
        return window.innerWidth <= mobileBreakpoint;
    }

    function resolveForumHref() {
        const path = (window.location.pathname || '').replace(/\\/g, '/');
        if (/\/pages\//.test(path)) {
            return 'salon.html';
        }
        if (/\/public\//.test(path)) {
            return '../pages/salon.html';
        }
        return 'pages/salon.html';
    }

    function isForumChatNavLink(anchor) {
        const href = (anchor.getAttribute('href') || '').toLowerCase();
        return href.includes('salon') || href.includes('utilisateurs') ||
            (href.includes('forum') && !href.includes('topic'));
    }

    /** Lien Forum (chat communautaire) unique dans chaque menu hamburger. */
    function ensureForumInMobileMenu() {
        document.querySelectorAll('.mobile-menu .nav-links').forEach(function (nav) {
            const matches = Array.from(nav.querySelectorAll('a')).filter(isForumChatNavLink);
            if (matches.length > 1) {
                matches.slice(1).forEach(function (dup) { dup.remove(); });
            }

            let link = matches[0];
            if (!link) {
                link = document.createElement('a');
                link.setAttribute('data-nav-forum-chat', '1');
                const insertBefore = nav.querySelector('a[href*="profil.html"]') ||
                    nav.querySelector('a[href*="tierlist"]');
                if (insertBefore) {
                    nav.insertBefore(link, insertBefore);
                } else {
                    nav.appendChild(link);
                }
            }

            link.href = resolveForumHref();
            link.innerHTML = '<i class="fas fa-comments"></i><span data-i18n="nav.forum">Forum</span>';
        });

        if (window.localization && typeof window.localization.apply === 'function') {
            window.localization.apply();
        }
    }

    function resolveBoutiqueHref() {
        const path = (window.location.pathname || '').replace(/\\/g, '/');
        if (/\/pages\//.test(path)) {
            return 'boutique.html';
        }
        if (/\/public\//.test(path)) {
            return '../pages/boutique.html';
        }
        return 'pages/boutique.html';
    }

    function isBoutiqueNavLink(anchor) {
        const href = (anchor.getAttribute('href') || '').toLowerCase();
        return href.includes('boutique');
    }

    /** Lien Boutique unique dans chaque menu hamburger (évite les doublons HTML + JS). */
    function ensureBoutiqueInMobileMenu() {
        if (isBoutiqueDisabledTemporarily()) {
            // Nettoyage : on retire tout lien boutique potentiellement déjà présent.
            document.querySelectorAll('.mobile-menu .nav-links a').forEach(function (a) {
                if (isBoutiqueNavLink(a)) a.remove();
            });
            if (window.localization && typeof window.localization.apply === 'function') {
                window.localization.apply();
            }
            return;
        }

        document.querySelectorAll('.mobile-menu .nav-links').forEach(function (nav) {
            const existing = Array.from(nav.querySelectorAll('a')).filter(isBoutiqueNavLink);
            if (existing.length > 1) {
                existing.slice(1).forEach(function (dup) {
                    dup.remove();
                });
            }
            if (existing.length >= 1) {
                return;
            }

            const link = document.createElement('a');
            link.href = resolveBoutiqueHref();
            link.setAttribute('data-nav-boutique', '1');
            link.innerHTML = '<i class="fas fa-store"></i><span data-i18n="nav.shop">Boutique</span>';

            const insertBefore = nav.querySelector('a[href*="list.html"]') ||
                nav.querySelector('a[href*="profil.html"]') ||
                nav.querySelector('a[href*="tierlist"]') ||
                nav.querySelector('a[href*="forum"]');

            if (insertBefore) {
                nav.insertBefore(link, insertBefore);
            } else {
                const mangaLink = nav.querySelector('a[href*="manga-database"]');
                if (mangaLink && mangaLink.nextSibling) {
                    nav.insertBefore(link, mangaLink.nextSibling);
                } else {
                    nav.appendChild(link);
                }
            }
        });

        if (window.localization && typeof window.localization.apply === 'function') {
            window.localization.apply();
        }
    }

    function openMenu() {
        hamburgerBtn.classList.add('active');
        mobileMenu.classList.add('active');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mobile-menu-open');
    }

    function closeMenu() {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-menu-open');
    }

    function toggleMenu() {
        if (mobileMenu.classList.contains('active')) {
            closeMenu();
            return;
        }
        openMenu();
    }

    ensureBoutiqueInMobileMenu();
    ensureForumInMobileMenu();

    hamburgerBtn.addEventListener('click', toggleMenu);
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.setAttribute('aria-controls', 'mobileMenuPanel');
    mobileMenu.setAttribute('id', 'mobileMenuPanel');

    function bindMenuLinkClose() {
        document.querySelectorAll('.mobile-menu .nav-links a').forEach(function (link) {
            if (link.dataset.menuBound === '1') return;
            link.dataset.menuBound = '1';
            link.addEventListener('click', function () {
                closeMenu();
            });
        });
    }

    bindMenuLinkClose();

    document.addEventListener('click', function (e) {
        if (mobileMenu.classList.contains('active')) {
            if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                closeMenu();
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    window.addEventListener('resize', function () {
        if (mobileMenu.classList.contains('active') && !isMobileViewport()) {
            closeMenu();
        }
    });

    function setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'acceuil.html';
        document.querySelectorAll('.mobile-menu .nav-links a').forEach(function (link) {
            link.classList.remove('active');
            const href = link.getAttribute('href') || '';
            const hrefPage = href.split('/').pop();
            if (hrefPage === currentPage || href === currentPage) {
                link.classList.add('active');
            }
            if ((currentPage === 'salon.html' || currentPage === 'utilisateurs.html') &&
                isForumChatNavLink(link)) {
                link.classList.add('active');
            }
        });
    }

    setActiveLink();
    bindMenuLinkClose();
});

(function ensureHeaderAvatarScript() {
    if (typeof window.refreshHeaderAvatar === 'function') {
        if (typeof window.syncHeaderAuthState === 'function') {
            window.syncHeaderAuthState();
        }
        window.refreshHeaderAvatar();
        return;
    }
    var script = document.createElement('script');
    script.src = '/js/header-avatar.js?v=8';
    script.async = false;
    document.head.appendChild(script);
})();

(function bootstrapMwAdsense() {
    if (window.__mwAdsenseBootstrap) return;
    window.__mwAdsenseBootstrap = true;

    var configScript = document.createElement('script');
    configScript.src = '/js/adsense-config.js?v=2';
    configScript.onload = function() {
        var adsScript = document.createElement('script');
        adsScript.src = '/js/adsense.js?v=2';
        adsScript.defer = true;
        document.body.appendChild(adsScript);
    };
    document.body.appendChild(configScript);
})();
