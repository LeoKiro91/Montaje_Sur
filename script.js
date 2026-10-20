/**
 * Montajes Sur - Hornos Industriales
 * Lógica JavaScript Vanilla para el Menú Hamburguesa, Overlay y Navegación
 */

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navOverlay = document.getElementById('nav-overlay');
    const navLinks = document.querySelectorAll('.nav-link');
    const siteHeader = document.querySelector('.site-header');

    // Función unificada para cerrar el menú móvil
    function closeMobileMenu() {
        if (navMenu && navMenu.classList.contains('is-open')) {
            navMenu.classList.remove('is-open');
            hamburgerBtn.classList.remove('is-active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
            if (navOverlay) navOverlay.classList.remove('is-active');
            document.body.style.overflow = '';
        }
    }

    // 1. Alternar apertura / cierre del menú móvil al pulsar hamburguesa
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('is-open');
            hamburgerBtn.classList.toggle('is-active');
            hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            
            if (navOverlay) {
                navOverlay.classList.toggle('is-active', isOpen);
            }
            
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // 2. Cerrar el menú móvil al hacer clic en el overlay exterior
        if (navOverlay) {
            navOverlay.addEventListener('click', closeMobileMenu);
        }

        // 3. Cerrar el menú al pulsar cualquier enlace de navegación
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        // 4. Cerrar el menú si se presiona la tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });
    }

    // 5. Cambiar estilo del header al hacer scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            siteHeader.style.backgroundColor = 'rgba(5, 8, 15, 0.98)';
            siteHeader.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
        } else {
            siteHeader.style.backgroundColor = 'rgba(7, 10, 18, 0.95)';
            siteHeader.style.boxShadow = 'none';
        }
    });

    // 6. Resaltar enlace activo según la sección visible
    const sectionsToTrack = document.querySelectorAll('#inicio, #servicios, #trabajos, #nosotros, #contacto');
    
    function highlightActiveLink() {
        const currentScroll = window.scrollY || window.pageYOffset;

        sectionsToTrack.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 140;
            const sectionId = section.getAttribute('id');
            const correspondingLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);

            if (correspondingLink) {
                if (currentScroll >= sectionTop && currentScroll < sectionTop + sectionHeight) {
                    navLinks.forEach(link => link.classList.remove('active'));
                    correspondingLink.classList.add('active');
                }
            }
        });
    }

    window.addEventListener('scroll', highlightActiveLink, { passive: true });
});
