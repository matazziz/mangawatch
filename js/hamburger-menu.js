// Gestion du menu hamburger responsive
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    // Fonction pour basculer le menu
    function toggleMenu() {
        hamburgerBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        // Sur mobile le menu est un panneau étroit à droite : on laisse le body scrollable pour voir la page en fond
    }

    // Écouteur d'événement pour le bouton hamburger
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMenu);
    }

    // Fermer le menu quand on clique sur un lien
    const menuLinks = document.querySelectorAll('.mobile-menu .nav-links a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });

    // Fermer le menu quand on clique en dehors
    document.addEventListener('click', (e) => {
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                hamburgerBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        }
    });

    // Fermer le menu avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('active')) {
            hamburgerBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });

    // Gestion du redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1200) {
            // Sur desktop, fermer le menu mobile
            hamburgerBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
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