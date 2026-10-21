-- =====================================================================
-- AGREGAR SOPORTE PARA HASTA 10 FOTOS POR TRABAJO
-- =====================================================================

-- 1. Agregar columna 'imagenes' de tipo JSONB para almacenar la lista de fotos
ALTER TABLE public.trabajos ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar los trabajos existentes para que su foto actual sea la primera de su lista
UPDATE public.trabajos 
SET imagenes = json_build_array(imagen_url)::jsonb 
WHERE imagen_url IS NOT NULL AND (imagenes IS NULL OR jsonb_array_length(imagenes) = 0);
