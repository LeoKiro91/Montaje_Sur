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
    const imagePreview = document.getElementById('image-preview');
    const jobImageUrlInput = document.getElementById('job-image-url');

    let currentEditingJob = null;
    let selectedFile = null;

    /**
     * Cargar y renderizar los trabajos en el panel
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
                .order('orden', { ascending: true });

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
                const img = job.imagen_url || 'IMG/hero-horno.jpg';
                return `
                    <div class="job-admin-card" data-id="${job.id}">
                        <div class="job-card-thumb-wrapper">
                            <img src="${img}" alt="${job.titulo}" class="job-card-thumb" onerror="this.src='IMG/hero-horno.jpg'">
                            <span class="job-card-order-badge">Orden #${job.orden || 1}</span>
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
     * Manejo del selector de archivos y vista previa
     */
    if (fileDropArea && jobFileInput) {
        fileDropArea.addEventListener('click', () => jobFileInput.click());

        jobFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('La imagen no puede pesar más de 5MB.');
                    jobFileInput.value = '';
                    return;
                }
                selectedFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.src = event.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (jobImageUrlInput) {
        jobImageUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                imagePreview.src = url;
                imagePreview.style.display = 'block';
                selectedFile = null;
            }
        });
    }

    /**
     * Abrir modal para NUEVO trabajo
     */
    const openNewJobBtn = document.getElementById('open-new-job-modal-btn');
    if (openNewJobBtn) {
        openNewJobBtn.addEventListener('click', () => {
            currentEditingJob = null;
            selectedFile = null;
            jobForm.reset();
            document.getElementById('job-id').value = '';
            document.getElementById('job-order').value = '1';
            imagePreview.style.display = 'none';
            imagePreview.src = '';
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
        selectedFile = null;
        jobForm.reset();
        document.getElementById('job-id').value = job.id;
        document.getElementById('job-title').value = job.titulo;
        document.getElementById('job-desc').value = job.descripcion || '';
        document.getElementById('job-order').value = job.orden || 1;
        document.getElementById('job-image-url').value = job.imagen_url || '';

        if (job.imagen_url) {
            imagePreview.src = job.imagen_url;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }

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
        selectedFile = null;
    }

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    jobModal.addEventListener('click', (e) => {
        if (e.target === jobModal) closeModal();
    });

    /**
     * Guardar trabajo (Crear o Actualizar)
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
        let imagen_url = document.getElementById('job-image-url').value.trim();

        // Validar que haya al menos una imagen
        if (!selectedFile && !imagen_url && (!currentEditingJob || !currentEditingJob.imagen_url)) {
            jobModalError.textContent = 'Por favor seleccioná una imagen o ingresá una URL.';
            jobModalError.style.display = 'block';
            return;
        }

        saveBtn.disabled = true;
        saveText.style.display = 'none';
        saveSpinner.style.display = 'inline-block';

        try {
            // 1. Si el usuario seleccionó un archivo local, subirlo a Supabase Storage
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                const filePath = `trabajos/${fileName}`;

                const { data: uploadData, error: uploadError } = await sb.storage
                    .from('imagenes-trabajos')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Obtener la URL pública oficial de la foto subida
                const { data: { publicUrl } } = sb.storage
                    .from('imagenes-trabajos')
                    .getPublicUrl(filePath);

                imagen_url = publicUrl;
            } else if (!imagen_url && currentEditingJob) {
                imagen_url = currentEditingJob.imagen_url;
            }

            // 2. Insertar o Actualizar en la base de datos
            if (id) {
                // Actualizar
                const { error } = await sb
                    .from('trabajos')
                    .update({
                        titulo,
                        descripcion,
                        orden,
                        imagen_url
                    })
                    .eq('id', id);

                if (error) throw error;
                showToast('Trabajo actualizado exitosamente');
            } else {
                // Insertar nuevo
                const { error } = await sb
                    .from('trabajos')
                    .insert([{
                        titulo,
                        descripcion,
                        orden,
                        imagen_url,
                        activo: true
                    }]);

                if (error) throw error;
                showToast('Nuevo trabajo agregado a la galería');
            }

            closeModal();
            await loadAdminJobs();

        } catch (err) {
            console.error('Error guardando trabajo:', err);
            jobModalError.textContent = 'Error: ' + err.message;
            jobModalError.style.display = 'block';
        } finally {
            saveBtn.disabled = false;
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

        const whatsapp_numero = document.getElementById('cfg-whatsapp').value.trim();
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
