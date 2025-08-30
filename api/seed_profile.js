// api/seed_profile.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id, email, nombre, apellidos, dni, rol, unidad, areas_interes } = req.body || {};
  if (!id || !email) return res.status(400).json({ error: "Missing id or email" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Supabase env vars missing" });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const payload = {
      id,
      email,
      nombre: nombre ?? null,
      apellidos: apellidos ?? null,
      dni: dni ?? null,
      rol: rol ?? null,
      unidad: unidad ?? null,
      areas_interes: Array.isArray(areas_interes) ? areas_interes : (areas_interes ? [areas_interes] : []),
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("seed_profile error", e);
    return res.status(500).json({ error: "Server error" });
  }
}