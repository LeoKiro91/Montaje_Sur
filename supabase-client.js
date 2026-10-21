/**
 * Montajes Sur - Hornos Industriales
 * Conexión centralizada con Supabase
 */

const SUPABASE_URL = 'https://qfguwahxwylkulssplwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6dirpAM-Iy34Kp8GgbEjxg_QTVTrlq2';

// Inicializar y asignar explícitamente a window para acceso global
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Cliente de Supabase inicializado correctamente.');
} else {
    console.error('❌ La librería de Supabase no se cargó correctamente desde el CDN.');
    window.supabaseClient = null;
}
