// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Accept both plain project URL and URLs accidentally ending with /rest/v1
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const url = rawUrl?.replace(/\/rest\/v1\/?$/, "");
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isBrowser = typeof window !== "undefined";
const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

if (isBrowser && isDev) {
  console.debug("[supabase] URL:", url);
  console.debug("[supabase] anon key presente:", Boolean(key));
}

// Passthrough lock: evita el cuelgue de `navigator.locks` cuando una pestaña
// previa dejó el lock sin liberar (cierre brusco, crash, iOS). Sin este
// override, getSession/getUser pueden quedar esperando el lock indefinidamente
// y la app se queda en "Cargando…".
const passthroughLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: passthroughLock,
  },
});
