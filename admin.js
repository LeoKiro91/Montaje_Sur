/**
 * Montajes Sur - Panel de Administración
 * Lógica de Autenticación, Gestión de Trabajos (CRUD), Subida a Storage y Configuración
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. VERIFICAR QUE SUPABASE ESTÉ DISPONIBLE
    if (!window.supabaseClient) {
        alert('Error: No se pudo conectar con Supabase. Verificá tu conexión a internet.');
        return;
    }

    const sb = window.supabaseClient;

    // 2. CONTROL DE SESIÓN: Si no está logueado, redirigir al login
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar el correo del usuario logueado en la barra superior
    const userEmailSpan = document.getElementById('user-email');
    if (userEmailSpan && session.user) {
        userEmailSpan.textContent = session.user.email;
    }

    // Escuchar cambios de estado en la autenticación (por si expira la sesión)
    sb.auth.onAuthStateChange((event, newSession) => {
        if (!newSession) {
            window.location.href = 'login.html';
        }
    });

    // Botón de Cerrar Sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await sb.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // 3. NAVEGACIÓN POR PESTAÑAS
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // Función auxiliar para mostrar notificaciones flotantes (Toast)
    function showToast(message) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-message');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // =========================================================================
    // 4. GESTIÓN DE TRABAJOS (LISTAR, CREAR, EDITAR, ELIMINAR)
    // =========================================================================
    const jobsContainer = document.getElementById('jobs-container');
    const jobModal = document.getElementById('job-modal');
    const jobForm = document.getElementById('job-form');
    const modalTitle = document.getElementById('modal-title');
    const jobModalError = document.getElementById('job-modal-error');
    const fileDropArea = document.getElementById('file-drop-area');
    const jobFileInput = document.getElementById('job-file-input');
    const jobImageUrlInput = document.getElementById('job-image-url');
    const addUrlPhotoBtn = document.getElementById('add-url-photo-btn');
    const imageThumbnailsGrid = document.getElementById('image-thumbnails-grid');
    const photosCounter = document.getElementById('photos-counter');

    let currentEditingJob = null;
    let currentPhotos = []; // Lista de fotos: { type: 'file' | 'url', file?, url?, preview }

    /**
     * Renderiza las miniaturas de las fotos en el modal
     */
    function renderThumbnails() {
        if (!imageThumbnailsGrid || !photosCounter) return;

        photosCounter.textContent = `${currentPhotos.length} / 10 fotos seleccionadas`;
        photosCounter.style.color = currentPhotos.length >= 10 ? 'var(--color-warning)' : 'var(--color-accent-blue-light)';

        if (currentPhotos.length === 0) {
            imageThumbnailsGrid.innerHTML = '';
            return;
        }

        imageThumbnailsGrid.innerHTML = currentPhotos.map((photo, index) => {
            const isCover = index === 0;
            const src = photo.preview || photo.url;
            return `
                <div class="thumb-item ${isCover ? 'cover-photo' : ''}">
                    <img src="${src}" alt="Foto ${index + 1}" onerror="this.src='IMG/hero-horno.jpg'">
                    ${isCover ? '<div class="cover-badge">Portada</div>' : ''}
                    <button type="button" class="thumb-remove-btn" data-index="${index}" title="Eliminar foto">&times;</button>
                </div>
            `;
        }).join('');

        // Evento para eliminar fotos individuales
        imageThumbnailsGrid.querySelectorAll('.thumb-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                currentPhotos.splice(idx, 1);
                renderThumbnails();
            });
        });
    }

    /**
     * Cargar y renderizar los trabajos en el panel
     * Ordenados del más NUEVO al más VIEJO (created_at DESC)
     */
    async function loadAdminJobs() {
        if (!jobsContainer) return;
        jobsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="spinner" style="margin-bottom: 12px;"></div>
                <p>Cargando trabajos...</p>
            </div>
        `;

        try {
            const { data: trabajos, error } = await sb
                .from('trabajos')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!trabajos || trabajos.length === 0) {
                jobsContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <p style="font-size: 16px; margin-bottom: 8px;">Aún no hay trabajos registrados.</p>
                        <p style="font-size: 13px;">Hacé clic en <strong>"Nuevo Trabajo"</strong> para agregar el primero.</p>
                    </div>
                `;
                return;
            }

            jobsContainer.innerHTML = trabajos.map(job => {
                // Obtener fotos
                let fotos = [];
                if (Array.isArray(job.imagenes) && job.imagenes.length > 0) {
                    fotos = job.imagenes;
                } else if (job.imagen_url) {
                    fotos = [job.imagen_url];
                }
                const coverImg = fotos[0] || 'IMG/hero-horno.jpg';
                const totalFotos = fotos.length;

                return `
                    <div class="job-admin-card" data-id="${job.id}">
                        <div class="job-card-thumb-wrapper">
                            <img src="${coverImg}" alt="${job.titulo}" class="job-card-thumb" onerror="this.src='IMG/hero-horno.jpg'">
                            <span class="photos-badge">📷 ${totalFotos} ${totalFotos === 1 ? 'foto' : 'fotos'}</span>
                        </div>
                        <div class="job-admin-card-body">
                            <h3 class="job-card-title">${job.titulo}</h3>
                            <p class="job-card-desc">${job.descripcion || 'Sin descripción adicional.'}</p>
                            <div class="job-card-actions">
                                <button class="btn-edit-outline edit-job-btn" data-id="${job.id}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Editar
                                </button>
                                <button class="btn-danger-outline delete-job-btn" data-id="${job.id}" data-title="${job.titulo}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Asignar eventos de editar y borrar
            document.querySelectorAll('.edit-job-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const job = trabajos.find(j => j.id == id);
                    if (job) openEditModal(job);
                });
            });

            document.querySelectorAll('.delete-job-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    const title = btn.getAttribute('data-title');
                    if (confirm(`¿Estás seguro de que querés eliminar el trabajo "${title}"?`)) {
                        await deleteJob(id);
                    }
                });
            });

        } catch (err) {
            console.error('Error cargando trabajos:', err);
            jobsContainer.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: #ef4444;">Error al cargar trabajos: ${err.message}</div>`;
        }
    }

    /**
     * Selección de múltiples archivos desde la computadora (hasta 10 fotos)
     */
    if (fileDropArea && jobFileInput) {
        fileDropArea.addEventListener('click', () => jobFileInput.click());

        jobFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            for (const file of files) {
                if (currentPhotos.length >= 10) {
                    alert('Podés agregar hasta 10 fotos por trabajo.');
                    break;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert(`La imagen "${file.name}" supera los 5MB.`);
                    continue;
                }
                currentPhotos.push({
                    type: 'file',
                    file: file,
                    preview: URL.createObjectURL(file)
                });
            }

            jobFileInput.value = '';
            renderThumbnails();
        });
    }

    /**
     * Agregar foto por URL
     */
    if (addUrlPhotoBtn && jobImageUrlInput) {
        addUrlPhotoBtn.addEventListener('click', () => {
            const url = jobImageUrlInput.value.trim();
            if (!url) return;

            if (currentPhotos.length >= 10) {
                alert('Podés agregar hasta 10 fotos por trabajo.');
                return;
            }

            currentPhotos.push({
                type: 'url',
                url: url,
                preview: url
            });

            jobImageUrlInput.value = '';
            renderThumbnails();
        });
    }

    /**
     * Abrir modal para NUEVO trabajo
     */
    const openNewJobBtn = document.getElementById('open-new-job-modal-btn');
    if (openNewJobBtn) {
        openNewJobBtn.addEventListener('click', () => {
            currentEditingJob = null;
            currentPhotos = [];
            jobForm.reset();
            document.getElementById('job-id').value = '';
            document.getElementById('job-order').value = '1';
            renderThumbnails();
            jobModalError.style.display = 'none';
            modalTitle.textContent = 'Nuevo Trabajo';
            jobModal.classList.add('active');
        });
    }

    /**
     * Abrir modal para EDITAR trabajo
     */
    function openEditModal(job) {
        currentEditingJob = job;
        currentPhotos = [];
        jobForm.reset();
        document.getElementById('job-id').value = job.id;
        document.getElementById('job-title').value = job.titulo;
        document.getElementById('job-desc').value = job.descripcion || '';
        document.getElementById('job-order').value = job.orden || 1;

        // Cargar fotos existentes
        let fotos = [];
        if (Array.isArray(job.imagenes) && job.imagenes.length > 0) {
            fotos = job.imagenes;
        } else if (job.imagen_url) {
            fotos = [job.imagen_url];
        }

        currentPhotos = fotos.map(url => ({
            type: 'url',
            url: url,
            preview: url
        }));

        renderThumbnails();
        jobModalError.style.display = 'none';
        modalTitle.textContent = 'Editar Trabajo';
        jobModal.classList.add('active');
    }

    /**
     * Cerrar modal
     */
    function closeModal() {
        jobModal.classList.remove('active');
        currentEditingJob = null;
        currentPhotos = [];
    }

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    jobModal.addEventListener('click', (e) => {
        if (e.target === jobModal) closeModal();
    });

    /**
     * Guardar trabajo (Crear o Actualizar con hasta 10 fotos)
     */
    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        jobModalError.style.display = 'none';

        const saveBtn = document.getElementById('save-job-btn');
        const saveText = document.getElementById('save-job-text');
        const saveSpinner = document.getElementById('save-job-spinner');

        const id = document.getElementById('job-id').value;
        const titulo = document.getElementById('job-title').value.trim();
        const descripcion = document.getElementById('job-desc').value.trim();
        const orden = parseInt(document.getElementById('job-order').value, 10) || 1;

        // Validar que haya al menos una foto
        if (currentPhotos.length === 0) {
            jobModalError.textContent = 'Por favor agregá al menos una foto para el trabajo.';
            jobModalError.style.display = 'block';
            return;
        }

        saveBtn.disabled = true;
        saveText.style.display = 'none';
        saveSpinner.style.display = 'inline-block';

        try {
            const finalImageUrls = [];

            // 1. Subir cada archivo nuevo a Supabase Storage y recopilar URLs
            for (let i = 0; i < currentPhotos.length; i++) {
                const photo = currentPhotos[i];

                if (photo.type === 'file' && photo.file) {
                    saveText.textContent = `Subiendo foto ${i + 1}/${currentPhotos.length}...`;
                    const fileExt = photo.file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                    const filePath = `trabajos/${fileName}`;

                    const { error: uploadError } = await sb.storage
                        .from('imagenes-trabajos')
                        .upload(filePath, photo.file, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = sb.storage
                        .from('imagenes-trabajos')
                        .getPublicUrl(filePath);

                    finalImageUrls.push(publicUrl);
                } else if (photo.url) {
                    finalImageUrls.push(photo.url);
                }
            }

            const coverImage = finalImageUrls[0] || 'IMG/hero-horno.jpg';

            // 2. Insertar o Actualizar en la base de datos
            if (id) {
                // Actualizar
                const { error } = await sb
                    .from('trabajos')
                    .update({
                        titulo,
                        descripcion,
                        orden,
                        imagen_url: coverImage,
                        imagenes: finalImageUrls
                    })
                    .eq('id', id);

                if (error) throw error;
                showToast('Trabajo actualizado exitosamente');
            } else {
                // Insertar nuevo (created_at queda como el más reciente)
                const { error } = await sb
                    .from('trabajos')
                    .insert([{
                        titulo,
                        descripcion,
                        orden,
                        imagen_url: coverImage,
                        imagenes: finalImageUrls,
                        activo: true,
                        created_at: new Date().toISOString()
                    }]);

                if (error) throw error;
                showToast('Nuevo trabajo agregado en primer lugar');
            }

            closeModal();
            await loadAdminJobs();

        } catch (err) {
            console.error('Error guardando trabajo:', err);
            jobModalError.textContent = 'Error: ' + err.message;
            jobModalError.style.display = 'block';
        } finally {
            saveBtn.disabled = false;
            saveText.textContent = 'Guardar Trabajo';
            saveText.style.display = 'inline-block';
            saveSpinner.style.display = 'none';
        }
    });

    /**
     * Eliminar trabajo
     */
    async function deleteJob(id) {
        try {
            const { error } = await sb
                .from('trabajos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Trabajo eliminado correctamente');
            await loadAdminJobs();
        } catch (err) {
            console.error('Error al eliminar:', err);
            alert('Error al eliminar el trabajo: ' + err.message);
        }
    }

    // =========================================================================
    // 5. GESTIÓN DE CONFIGURACIÓN Y DATOS DE CONTACTO
    // =========================================================================
    const configForm = document.getElementById('config-form');
    const configAlert = document.getElementById('config-alert');

    async function loadAdminConfig() {
        if (!configForm) return;

        try {
            const { data: config, error } = await sb
                .from('configuracion')
                .select('*')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (config) {
                document.getElementById('cfg-whatsapp').value = config.whatsapp_numero || '';
                document.getElementById('cfg-email').value = config.email_contacto || '';
                document.getElementById('cfg-telefono').value = config.telefono_contacto || '';
                document.getElementById('cfg-cobertura').value = config.cobertura_texto || '';
                document.getElementById('cfg-banner-desc').value = config.texto_banner || '';
            }
        } catch (err) {
            console.error('Error cargando configuración:', err);
        }
    }

    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        configAlert.style.display = 'none';

        const saveBtn = document.getElementById('save-config-btn');
        const saveText = document.getElementById('save-config-text');
        const saveSpinner = document.getElementById('save-config-spinner');

        function limpiarNumeroWhatsApp(num) {
            if (!num) return '5491166340462';
            let clean = num.toString().replace(/\D/g, '');
            if (clean.startsWith('0')) clean = clean.substring(1);
            if (clean.startsWith('15')) clean = clean.substring(2);
            if (clean.length === 10) clean = '549' + clean;
            else if (clean.startsWith('54') && !clean.startsWith('549') && clean.length === 12) clean = '549' + clean.substring(2);
            return clean || '5491166340462';
        }

        const rawWhatsApp = document.getElementById('cfg-whatsapp').value.trim();
        const whatsapp_numero = limpiarNumeroWhatsApp(rawWhatsApp);
        const email_contacto = document.getElementById('cfg-email').value.trim();
        const telefono_contacto = document.getElementById('cfg-telefono').value.trim();
        const cobertura_texto = document.getElementById('cfg-cobertura').value.trim();
        const texto_banner = document.getElementById('cfg-banner-desc').value.trim();

        saveBtn.disabled = true;
        saveText.style.display = 'none';
        saveSpinner.style.display = 'inline-block';

        try {
            const { error } = await sb
                .from('configuracion')
                .upsert({
                    id: 1,
                    whatsapp_numero,
                    email_contacto,
                    telefono_contacto,
                    cobertura_texto,
                    texto_banner,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            showToast('Datos de contacto actualizados correctamente');
        } catch (err) {
            console.error('Error guardando configuración:', err);
            configAlert.textContent = 'Error: ' + err.message;
            configAlert.style.display = 'block';
        } finally {
            saveBtn.disabled = false;
            saveText.style.display = 'inline-block';
            saveSpinner.style.display = 'none';
        }
    });

    // Iniciar carga de datos al abrir el panel
    loadAdminJobs();
    loadAdminConfig();
});
