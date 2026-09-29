import Image from "next/image";
import { cn, initials } from "@/lib/utils";

const PALETTE = ["#16a34a", "#0ea5e9", "#7c3aed", "#dc2626", "#ea580c", "#ca8a04", "#0d9488", "#db2777"];

function colorFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

/** Avatar : image (upload, Google, galerie) ou initiales sur fond coloré stable. */
export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
        className,
      )}
      style={{ width: size, height: size, background: src ? undefined : colorFor(name) }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized={src.endsWith(".svg")}
        />
      ) : (
        <span className="font-condensed font-bold text-white" style={{ fontSize: size * 0.38 }} aria-hidden>
          {initials(name)}
        </span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
