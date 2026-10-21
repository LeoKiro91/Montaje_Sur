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

    // =========================================================================
    // 7. CARGA DINÁMICA DE TRABAJOS Y CONFIGURACIÓN DESDE SUPABASE
    // =========================================================================

    /**
     * Carga la lista de trabajos realizados desde la base de datos de Supabase.
     * Si no hay conexión o ocurre un error, mantiene intactas las tarjetas estáticas originales.
     */
    async function cargarTrabajosDesdeSupabase() {
        if (!window.supabaseClient) {
            console.warn('Supabase no está inicializado. Se muestran las tarjetas predeterminadas.');
            return;
        }

        try {
            const { data: trabajos, error } = await window.supabaseClient
                .from('trabajos')
                .select('*')
                .eq('activo', true)
                .order('orden', { ascending: true });

            if (error) {
                console.error('Error al consultar trabajos en Supabase:', error.message);
                return;
            }

            if (trabajos && trabajos.length > 0) {
                const trabajosContainer = document.getElementById('trabajos');
                if (!trabajosContainer) return;

                // Generamos el HTML usando exactamente las mismas clases de estilo
                const htmlTarjetas = trabajos.map(trabajo => {
                    const fallbackImg = 'IMG/hero-horno.jpg';
                    const imagenSrc = trabajo.imagen_url || fallbackImg;
                    const titulo = trabajo.titulo || 'Trabajo realizado';

                    return `
                        <div class="gallery-card">
                            <img 
                                src="${imagenSrc}" 
                                alt="${titulo}" 
                                class="gallery-card-img"
                                loading="lazy"
                                onerror="this.onerror=null;this.src='${fallbackImg}'"
                            >
                            <div class="gallery-card-overlay">
                                <span class="gallery-card-label">${titulo}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                trabajosContainer.innerHTML = htmlTarjetas;
            }
        } catch (err) {
            console.error('Error inesperado al cargar trabajos:', err);
        }
    }

    /**
     * Carga los datos de contacto y textos comerciales desde la tabla 'configuracion'.
     */
    async function cargarConfiguracionDesdeSupabase() {
        if (!window.supabaseClient) return;

        try {
            const { data: config, error } = await window.supabaseClient
                .from('configuracion')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                console.error('Error al consultar configuración en Supabase:', error.message);
                return;
            }

            if (config) {
                const numeroWhatsApp = config.whatsapp_numero || '5491100000000';

                // 1. Actualizar botón WhatsApp del header
                const navWhatsApp = document.getElementById('nav-whatsapp-btn');
                if (navWhatsApp) {
                    navWhatsApp.href = `https://wa.me/${numeroWhatsApp}?text=Hola%20Montajes%20Sur,%20quisiera%20hacer%20una%20consulta`;
                }

                // 2. Actualizar botón WhatsApp del banner
                const ctaWhatsApp = document.getElementById('cta-whatsapp-btn');
                if (ctaWhatsApp) {
                    ctaWhatsApp.href = `https://wa.me/${numeroWhatsApp}?text=Hola%20Montajes%20Sur,%20tengo%20un%20proyecto%20y%20quisiera%20asesoramiento`;
                }

                // 3. Actualizar texto descriptivo del banner
                const ctaBannerDesc = document.getElementById('cta-banner-desc');
                if (ctaBannerDesc && config.texto_banner) {
                    ctaBannerDesc.textContent = config.texto_banner;
                }

                // 4. Actualizar datos de contacto en el Footer
                const footerTelefono = document.getElementById('footer-telefono');
                if (footerTelefono && config.telefono_contacto) {
                    footerTelefono.textContent = config.telefono_contacto;
                }

                const footerEmail = document.getElementById('footer-email');
                if (footerEmail && config.email_contacto) {
                    footerEmail.textContent = config.email_contacto;
                }

                const footerCobertura = document.getElementById('footer-cobertura');
                if (footerCobertura && config.cobertura_texto) {
                    footerCobertura.textContent = config.cobertura_texto;
                }
            }
        } catch (err) {
            console.error('Error inesperado al cargar configuración:', err);
        }
    }

    // Ejecutar la carga de datos al iniciar la página
    cargarTrabajosDesdeSupabase();
    cargarConfiguracionDesdeSupabase();
});
