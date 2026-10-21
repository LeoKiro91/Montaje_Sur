-- =====================================================================
-- PERMISOS PARA ROLES DE SUPABASE (Solución al error "permission denied")
-- =====================================================================

-- 1. Dar acceso al esquema público
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Dar permisos sobre la tabla 'trabajos'
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trabajos TO authenticated;
GRANT SELECT ON TABLE public.trabajos TO anon;

-- 3. Dar permisos sobre la tabla 'configuracion'
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.configuracion TO authenticated;
GRANT SELECT ON TABLE public.configuracion TO anon;

-- 4. Dar permisos sobre los IDs autoincrementales (secuencias)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
