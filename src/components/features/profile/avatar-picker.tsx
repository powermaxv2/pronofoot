"use client";

import { m } from "motion/react";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useTransition } from "react";
import { toast } from "@/components/ui/toaster";
import { uploadAvatar } from "@/server/actions/profile";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const GALLERY = Array.from(
  { length: 12 },
  (_, i) => `/avatars/maillot-${String(i + 1).padStart(2, "0")}.svg`,
);

/** Choix d'avatar : galerie de maillots, photo Google, ou envoi d'une image. */
export function AvatarPicker({
  value,
  onChange,
  googleImage,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  googleImage?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const uploaded = value?.startsWith("/api/avatars/") ? value : null;
  const options: { url: string | null; label: string }[] = [
    { url: null, label: googleImage ? "Photo Google" : "Initiales" },
    ...(uploaded ? [{ url: uploaded, label: "Mon image" }] : []),
    ...GALLERY.map((url, i) => ({ url, label: `Maillot ${i + 1}` })),
  ];

  function onFile(file: File | undefined) {
    if (!file) return;
    const data = new FormData();
    data.set("file", file);
    startUpload(async () => {
      const result = await uploadAvatar(data);
      if (result.ok) {
        onChange(result.data.url);
        toast.success("Image enregistrée");
      } else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="Avatar" className="grid grid-cols-5 gap-2.5 sm:grid-cols-7">
        {options.map((o) => {
          const active = o.url === value;
          return (
            <button
              key={o.url ?? "none"}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={o.label}
              onClick={() => onChange(o.url)}
              className="relative aspect-square rounded-2xl"
            >
              {active && (
                <m.span
                  layoutId="avatar-ring"
                  transition={spring.snappy}
                  className="ring-volt absolute -inset-1 rounded-[18px] ring-2"
                  aria-hidden
                />
              )}
              <m.span
                whileTap={{ scale: 0.9 }}
                transition={spring.snappy}
                className="bg-surface-strong block size-full overflow-hidden rounded-2xl"
              >
                {o.url ? (
                  <Image
                    src={o.url}
                    alt=""
                    width={96}
                    height={96}
                    className="size-full object-cover"
                    unoptimized={o.url.endsWith(".svg")}
                  />
                ) : googleImage ? (
                  <Image src={googleImage} alt="" width={96} height={96} className="size-full object-cover" />
                ) : (
                  <span className="font-condensed text-muted-foreground grid size-full place-items-center text-xs font-bold uppercase">
                    Aa
                  </span>
                )}
              </m.span>
            </button>
          );
        })}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
        aria-label="Envoyer une image"
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={uploading}
        className={cn(
          "text-grass-ink inline-flex items-center gap-2 justify-self-start text-sm font-semibold hover:underline",
          uploading && "opacity-60",
        )}
      >
        <Upload className="size-4" /> {uploading ? "Envoi en cours…" : "Envoyer ma propre image (4 Mo max.)"}
      </button>
    </div>
  );
}
