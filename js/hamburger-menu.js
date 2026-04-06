// Gestion du menu hamburger responsive
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileBreakpoint = 768;

    if (!hamburgerBtn || !mobileMenu) {
        return;
    }

    function isMobileViewport() {
        return window.innerWidth <= mobileBreakpoint;
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

    // Fonction pour basculer le menu
    function toggleMenu() {
        if (mobileMenu.classList.contains('active')) {
            closeMenu();
            return;
        }
        openMenu();
    }

    // Écouteur d'événement pour le bouton hamburger
    hamburgerBtn.addEventListener('click', toggleMenu);
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.setAttribute('aria-controls', 'mobileMenuPanel');
    mobileMenu.setAttribute('id', 'mobileMenuPanel');

    // Fermer le menu quand on clique sur un lien
    const menuLinks = document.querySelectorAll('.mobile-menu .nav-links a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Fermer le menu quand on clique en dehors
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active')) {
            if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                closeMenu();
            }
        }
    });

    // Fermer le menu avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    // Gestion du redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        if (mobileMenu.classList.contains('active') && !isMobileViewport()) {
            // Quand on quitte la vue téléphone, on réinitialise pour éviter les états CSS incohérents.
            closeMenu();
        }
    });

    // Marquer le lien actif selon la page courante
    function setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'acceuil.html';
        const menuLinks = document.querySelectorAll('.nav-links a');
        
        menuLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === 'acceuil.html' && href === 'acceuil.html')) {
                link.classList.add('active');
            }
        });
    }

    // Appeler la fonction au chargement
    setActiveLink();
}); 