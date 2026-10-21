-- =====================================================================
-- SOLUCIÓN DEFINITIVA DE PERMISOS PARA ESCRITORIO Y CELULAR
-- =====================================================================

-- 1. Conceder permisos de tabla a nivel de base de datos
GRANT ALL ON TABLE public.trabajos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.configuracion TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Asegurar que RLS (Row Level Security) esté activado
ALTER TABLE public.trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas anteriores de 'trabajos'
DROP POLICY IF EXISTS "Lectura pública de trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Admin inserta trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Admin actualiza trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Admin borra trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Administradores pueden insertar trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Administradores pueden actualizar trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Administradores pueden eliminar trabajos" ON public.trabajos;
DROP POLICY IF EXISTS "Permitir todo a autenticados en trabajos" ON public.trabajos;

-- 4. Crear políticas limpias y definitivas para 'trabajos':
-- Lectura pública para cualquier visitante
CREATE POLICY "Lectura pública de trabajos" ON public.trabajos
    FOR SELECT USING (true);

-- Control total (crear, editar, eliminar) para usuarios que iniciaron sesión
CREATE POLICY "Permitir todo a autenticados en trabajos" ON public.trabajos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Limpiar y configurar políticas de 'configuracion'
DROP POLICY IF EXISTS "Lectura pública de configuración" ON public.configuracion;
DROP POLICY IF EXISTS "Admin actualiza configuración" ON public.configuracion;
DROP POLICY IF EXISTS "Admin inserta configuración" ON public.configuracion;
DROP POLICY IF EXISTS "Administradores pueden actualizar configuración" ON public.configuracion;
DROP POLICY IF EXISTS "Administradores pueden insertar configuración" ON public.configuracion;
DROP POLICY IF EXISTS "Permitir todo a autenticados en configuracion" ON public.configuracion;

CREATE POLICY "Lectura pública de configuración" ON public.configuracion
    FOR SELECT USING (true);

CREATE POLICY "Permitir todo a autenticados en configuracion" ON public.configuracion
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Refrescar caché de la API de Supabase
NOTIFY pgrst, 'reload schema';
