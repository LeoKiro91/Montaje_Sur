/**
 * Montajes Sur - Hornos Industriales
 * Conexión centralizada con Supabase
 */

const SUPABASE_URL = 'https://qfguwahxwylkulssplwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6dirpAM-Iy34Kp8GgbEjxg_QTVTrlq2';

// Inicializar el cliente de Supabase una sola vez para todo el sitio
if (!window.supabase) {
    console.error('La librería de Supabase no se cargó correctamente. Asegurate de incluir el script del CDN.');
}

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
