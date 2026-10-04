import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "@/lib/env";

/** Sert les avatars envoyés par les joueurs (noms stricts, pas de traversée de répertoire). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-z0-9-]+\.webp$/.test(file)) return new Response("Introuvable", { status: 404 });
  try {
    const data = await readFile(join(env().UPLOAD_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
