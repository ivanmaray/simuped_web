#!/usr/bin/env node
/**
 * Sube las imágenes curadas de /imagenes/ al bucket `microcase-images`
 * y actualiza la columna metadata.imaging del nodo correspondiente.
 *
 * Uso:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/upload-microcase-images.mjs
 *
 * Requiere:
 *   - VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
 *   - Usuario admin (is_admin=true en profiles) para pasar la RLS del bucket.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "imagenes");
const BUCKET = "microcase-images";

/* ── Carga .env.local manualmente (sin dependencia) ──────────── */
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL) {
  console.error("❌ Falta VITE_SUPABASE_URL en .env.local");
  process.exit(1);
}
const USE_SERVICE_ROLE = Boolean(SERVICE_ROLE_KEY);
if (!USE_SERVICE_ROLE && (!SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD)) {
  console.error("❌ Define SUPABASE_SERVICE_ROLE_KEY, o bien VITE_SUPABASE_ANON_KEY + ADMIN_EMAIL + ADMIN_PASSWORD.");
  process.exit(1);
}

/* ── Mapeo fichero → nodo + metadatos ──────────────────────── */
const MAPPING = [
  {
    file: "960px-Angioedema2010.jpeg",
    nodeId: "aa000000-0000-4000-a000-000000000000",
    caso: "Anafilaxia por fármaco — intro",
    meta: {
      modality: "FOTO",
      name: "Angioedema facial",
      finding: "Edema labial y periocular característico de reacción anafiláctica.",
      attribution: "Wikimedia Commons — James Heilman, MD · CC BY-SA 3.0",
      attribution_url: "https://commons.wikimedia.org/wiki/File:Angioedema2010.JPG",
      hotspots: [
        { x: 48, y: 55, label: "Edema labial" },
        { x: 55, y: 28, label: "Edema periorbital" },
      ],
    },
  },
  {
    file: "cerebral-edema-due-to-severe-hyponatremia.jpg",
    nodeId: "ff000000-0000-4000-a000-000000000002",
    caso: "Hiponatremia — fase aguda sintomática",
    meta: {
      modality: "TC",
      name: "TC craneal sin contraste",
      finding: "Edema cerebral difuso con borramiento de surcos y pérdida de diferenciación córtico-subcortical por hiponatremia grave.",
      attribution: "Radiopaedia.org — CC BY-NC-SA 3.0",
      attribution_url: "https://radiopaedia.org/cases/cerebral-edema-due-to-severe-hyponatremia",
      hotspots: [
        { x: 50, y: 45, label: "Borramiento de surcos" },
        { x: 50, y: 60, label: "Pérdida de diferenciación" },
      ],
    },
  },
  {
    file: "central-pontine-myelinolysis-1.jpg",
    nodeId: "ff000000-0000-4000-a000-0000000000b3",
    caso: "Hiponatremia — outcome de sobrecorrección",
    meta: {
      modality: "RM",
      name: "RM encefálica — T2/FLAIR axial",
      finding: "Hiperintensidad central pontina con respeto periférico característica de mielinólisis osmótica (sobrecorrección de Na⁺).",
      attribution: "Radiopaedia.org — CC BY-NC-SA 3.0",
      attribution_url: "https://radiopaedia.org/cases/central-pontine-myelinolysis-4",
      hotspots: [
        { x: 50, y: 55, label: "Hiperintensidad pontina central" },
      ],
    },
  },
  {
    file: "epidural-haematoma-paediatric.jpg",
    nodeId: "a7000000-0000-4000-a000-000000000007",
    caso: "Trauma craneal — TC tras osmoterapia",
    meta: {
      modality: "TC",
      name: "TC craneal sin contraste",
      finding: "Hematoma epidural temporal izquierdo (lente biconvexa) con desplazamiento de línea media y fractura temporal subyacente.",
      attribution: "Radiopaedia.org — CC BY-NC-SA 3.0",
      attribution_url: "https://radiopaedia.org/cases/epidural-haematoma-paediatric",
      hotspots: [
        { x: 28, y: 42, label: "Hematoma epidural" },
        { x: 52, y: 50, label: "Desplazamiento de línea media" },
        { x: 30, y: 30, label: "Fractura temporal" },
      ],
    },
  },
  {
    file: "ECG-Hyperkalaemia-peaked-T-waves-serum-potassium-7.0.jpg",
    nodeId: "dd000000-0000-4000-a000-000000000001",
    caso: "Hiperpotasemia — reconocimiento inicial",
    meta: {
      modality: "ECG",
      name: "ECG 12 derivaciones",
      finding: "Ondas T picudas simétricas de base estrecha con K⁺ 7,0 mEq/L. PR alargado incipiente.",
      attribution: "LITFL.com — CC BY-NC-SA 4.0",
      attribution_url: "https://litfl.com/hyperkalaemia-ecg-library/",
      hotspots: [
        { x: 20, y: 45, label: "Onda T picuda (V2-V3)" },
        { x: 55, y: 50, label: "Onda T picuda (V4-V5)" },
      ],
    },
  },
];

/* ── Ejecución ─────────────────────────────────────────────── */
const supabase = createClient(SUPABASE_URL, USE_SERVICE_ROLE ? SERVICE_ROLE_KEY : SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  if (USE_SERVICE_ROLE) {
    console.log("🔑 Usando SUPABASE_SERVICE_ROLE_KEY (salta RLS). Subiendo imágenes…\n");
  } else {
    console.log(`🔐 Login como ${ADMIN_EMAIL}…`);
    const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (loginErr || !auth?.session) {
      console.error("❌ Fallo de login:", loginErr?.message || "sin sesión");
      process.exit(1);
    }
    console.log("✅ Sesión iniciada. Subiendo imágenes…\n");
  }

  const results = [];
  for (const item of MAPPING) {
    const src = path.join(IMAGES_DIR, item.file);
    if (!fs.existsSync(src)) {
      console.warn(`⚠️  No encontrado: ${item.file} — salto.`);
      continue;
    }
    const ext = path.extname(item.file).toLowerCase().replace(".", "") || "jpg";
    const contentType = ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : ext === "gif"  ? "image/gif"
      : "image/jpeg";
    const key = `${item.nodeId}/${path.basename(item.file)}`;
    const buffer = fs.readFileSync(src);

    console.log(`📤 ${item.caso}`);
    console.log(`   ${item.file} → ${key}`);
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType, upsert: true });
    if (upErr) {
      console.error(`   ❌ upload: ${upErr.message}`);
      continue;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      console.error("   ❌ No se obtuvo publicUrl.");
      continue;
    }

    const imaging = [{ ...item.meta, url: publicUrl }];

    // Fetch current metadata para mergear (no pisar vitals/labs/etc.)
    const { data: nodeRow, error: nodeErr } = await supabase
      .from("micro_case_nodes")
      .select("metadata")
      .eq("id", item.nodeId)
      .single();
    if (nodeErr) {
      console.error(`   ❌ leer metadata: ${nodeErr.message}`);
      continue;
    }
    const nextMeta = { ...(nodeRow?.metadata || {}), imaging };
    const { error: updErr } = await supabase
      .from("micro_case_nodes")
      .update({ metadata: nextMeta })
      .eq("id", item.nodeId);
    if (updErr) {
      console.error(`   ❌ update node: ${updErr.message}`);
      continue;
    }
    console.log(`   ✅ metadata actualizada\n`);
    results.push({ nodeId: item.nodeId, url: publicUrl });
  }

  if (!USE_SERVICE_ROLE) await supabase.auth.signOut();
  console.log(`\n🎯 Completadas ${results.length} de ${MAPPING.length} imágenes.`);
}

main().catch((err) => {
  console.error("💥 Error inesperado:", err);
  process.exit(1);
});
