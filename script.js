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

    // 5. Navegación suave personalizada con compensación exacta del header fijo
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                closeMobileMenu();

                // Calculamos la altura real del header fijo + un margen de respiro
                const headerHeight = siteHeader ? siteHeader.offsetHeight : 90;
                const marginOffset = 20;
                const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const finalPosition = targetId === '#inicio' ? 0 : elementTop - (headerHeight + marginOffset);

                window.scrollTo({
                    top: Math.max(0, finalPosition),
                    behavior: 'smooth'
                });

                if (history.pushState) {
                    history.pushState(null, null, targetId);
                }
            }
        });
    });

    // 6. Cambiar estilo del header al hacer scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            siteHeader.style.backgroundColor = 'rgba(5, 8, 15, 0.98)';
            siteHeader.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
        } else {
            siteHeader.style.backgroundColor = 'rgba(7, 10, 18, 0.95)';
            siteHeader.style.boxShadow = 'none';
        }
    });

    // 7. Resaltar enlace activo según la sección visible
    function highlightActiveLink() {
        const currentScroll = window.scrollY || window.pageYOffset;
        const headerHeight = siteHeader ? siteHeader.offsetHeight : 90;
        const checkPosition = currentScroll + headerHeight + 60;

        const sections = [
            document.getElementById('inicio'),
            document.getElementById('servicios'),
            document.getElementById('nosotros'),
            document.getElementById('trabajos'),
            document.getElementById('contacto')
        ].filter(Boolean);

        let activeSectionId = 'inicio';

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            if (checkPosition >= top && checkPosition < top + height) {
                activeSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${activeSectionId}`) {
                link.classList.add('active');
            } else if (href && href.startsWith('#')) {
                link.classList.remove('active');
            }
        });
    }

    window.addEventListener('scroll', highlightActiveLink, { passive: true });

    // =========================================================================
    // 7. CARGA DINÁMICA DE TRABAJOS Y CONFIGURACIÓN DESDE SUPABASE
    // =========================================================================

    /**
     * Carga la lista de trabajos realizados desde Supabase.
     * Ordenados de MÁS NUEVO a MÁS VIEJO (created_at DESC).
     * Soporta hasta 10 fotos por trabajo con visor interactivo (Lightbox).
     */
    let trabajosCargados = [];

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
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error al consultar trabajos en Supabase:', error.message);
                return;
            }

            if (trabajos && trabajos.length > 0) {
                trabajosCargados = trabajos;
                const trabajosContainer = document.getElementById('trabajos-grid') || document.getElementById('trabajos');
                if (!trabajosContainer) return;

                // Generamos el HTML usando exactamente las mismas clases de estilo
                const htmlTarjetas = trabajos.map((trabajo, index) => {
                    const fallbackImg = 'IMG/hero-horno.jpg';
                    let fotos = [];
                    if (Array.isArray(trabajo.imagenes) && trabajo.imagenes.length > 0) {
                        fotos = trabajo.imagenes;
                    } else if (trabajo.imagen_url) {
                        fotos = [trabajo.imagen_url];
                    }
                    const imagenSrc = fotos[0] || fallbackImg;
                    const titulo = trabajo.titulo || 'Trabajo realizado';
                    const totalFotos = fotos.length;

                    return `
                        <div class="gallery-card" data-job-index="${index}" title="Hacé clic para ver las fotos">
                            <img 
                                src="${imagenSrc}" 
                                alt="${titulo}" 
                                class="gallery-card-img"
                                loading="lazy"
                                onerror="this.onerror=null;this.src='${fallbackImg}'"
                            >
                            ${totalFotos > 1 ? `<span class="gallery-card-badge">📷 ${totalFotos} fotos</span>` : ''}
                            <div class="gallery-card-overlay">
                                <span class="gallery-card-label">${titulo}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                trabajosContainer.innerHTML = htmlTarjetas;

                // Eventos de clic para abrir el visor de fotos (Lightbox)
                trabajosContainer.querySelectorAll('.gallery-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const idx = parseInt(card.getAttribute('data-job-index'), 10);
                        abrirLightbox(idx);
                    });
                });
            }
        } catch (err) {
            console.error('Error inesperado al cargar trabajos:', err);
        }
    }

    // =========================================================================
    // 8. LÓGICA DEL VISOR MODAL (LIGHTBOX) PARA EXPLORAR FOTOS
    // =========================================================================
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-current-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxThumbsStrip = document.getElementById('lightbox-thumbs-strip');
    const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
    const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
    const lightboxNextBtn = document.getElementById('lightbox-next-btn');

    let currentJobPhotos = [];
    let currentPhotoIndex = 0;

    function abrirLightbox(jobIndex) {
        const job = trabajosCargados[jobIndex];
        if (!job) return;

        let fotos = [];
        if (Array.isArray(job.imagenes) && job.imagenes.length > 0) {
            fotos = job.imagenes;
        } else if (job.imagen_url) {
            fotos = [job.imagen_url];
        }

        if (fotos.length === 0) fotos = ['IMG/hero-horno.jpg'];

        currentJobPhotos = fotos;
        currentPhotoIndex = 0;

        lightboxTitle.textContent = job.titulo || 'Trabajo realizado';
        lightboxDesc.textContent = job.descripcion || '';

        actualizarFotoLightbox();
        lightboxModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function actualizarFotoLightbox() {
        if (!currentJobPhotos.length) return;

        const currentUrl = currentJobPhotos[currentPhotoIndex];
        lightboxImg.src = currentUrl;
        lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${currentJobPhotos.length}`;

        // Mostrar u ocultar botones de siguiente / anterior si hay una sola foto
        if (currentJobPhotos.length <= 1) {
            lightboxPrevBtn.style.display = 'none';
            lightboxNextBtn.style.display = 'none';
            lightboxThumbsStrip.style.display = 'none';
        } else {
            lightboxPrevBtn.style.display = 'flex';
            lightboxNextBtn.style.display = 'flex';
            lightboxThumbsStrip.style.display = 'flex';

            // Generar tira inferior de miniaturas
            lightboxThumbsStrip.innerHTML = currentJobPhotos.map((url, i) => `
                <img 
                    src="${url}" 
                    class="lightbox-strip-thumb ${i === currentPhotoIndex ? 'active' : ''}" 
                    data-thumb-index="${i}"
                    alt="Miniatura ${i + 1}"
                >
            `).join('');

            lightboxThumbsStrip.querySelectorAll('.lightbox-strip-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    currentPhotoIndex = parseInt(thumb.getAttribute('data-thumb-index'), 10);
                    actualizarFotoLightbox();
                });
            });
        }
    }

    function cerrarLightbox() {
        if (lightboxModal) {
            lightboxModal.classList.remove('is-open');
            document.body.style.overflow = '';
        }
    }

    function fotoAnterior() {
        if (currentJobPhotos.length <= 1) return;
        currentPhotoIndex = (currentPhotoIndex - 1 + currentJobPhotos.length) % currentJobPhotos.length;
        actualizarFotoLightbox();
    }

    function fotoSiguiente() {
        if (currentJobPhotos.length <= 1) return;
        currentPhotoIndex = (currentPhotoIndex + 1) % currentJobPhotos.length;
        actualizarFotoLightbox();
    }

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', cerrarLightbox);
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', fotoAnterior);
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', fotoSiguiente);

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) cerrarLightbox();
        });
    }

    // Navegación con teclado (Flechas y ESC)
    document.addEventListener('keydown', (e) => {
        if (lightboxModal && lightboxModal.classList.contains('is-open')) {
            if (e.key === 'Escape') cerrarLightbox();
            if (e.key === 'ArrowLeft') fotoAnterior();
            if (e.key === 'ArrowRight') fotoSiguiente();
        }
    });


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
