// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isBrowser = typeof window !== "undefined";
const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

if (isBrowser && isDev) {
  console.debug("[supabase] URL:", url);
  console.debug("[supabase] anon key presente:", Boolean(key));
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
