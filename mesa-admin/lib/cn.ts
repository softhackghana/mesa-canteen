/**
 * Tiny class combiner. The MESA design system relies on low-chroma tonal
 * tokens; a single source of truth for class merging keeps overrides sane.
 * Hand-rolled to avoid adding a clsx/tailwind-merge dependency (this scaffold
 * has neither). Last-wins per logical group.
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  const classes = inputs
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .flatMap((s) => s.split(/\s+/))
    .filter(Boolean);

  const groups = new Map<string, string>();
  const order: string[] = [];

  const classify = (cls: string): string => {
    if (cls.startsWith("font-") && cls !== "font-medium" && cls !== "font-semibold" && cls !== "font-bold" && cls !== "font-normal") {
      return "font-family";
    }
    if (
      cls.startsWith("text-headline") ||
      cls.startsWith("text-body") ||
      cls.startsWith("text-nav-") ||
      cls.startsWith("text-label") ||
      cls.startsWith("text-data") ||
      cls.startsWith("text-table")
    ) {
      return "font-size";
    }
    if (cls.startsWith("text-[") && /^text-\[\d/.test(cls)) {
      return "font-size";
    }
    if (cls.startsWith("text-")) return "text-color";
    if (cls.startsWith("bg-")) return "bg";
    if (cls === "border" || cls === "border-0" || cls === "border-2" || cls === "border-4") {
      return "border-width";
    }
    if (cls.startsWith("border-")) return "border-color";
    if (cls.startsWith("rounded-")) return "radius";
    if (cls.startsWith("shadow-")) return "shadow";
    if (/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-/.test(cls)) return "box";
    if (/^(w|h|min-w|min-h|max-w|max-h)-/.test(cls)) return "size";
    if (/^gap(-[xy])?-/.test(cls)) return "gap";
    if (cls === "flex" || cls === "flex-1" || cls === "flex-auto" || cls === "flex-none") {
      return "flex";
    }
    if (cls.startsWith("grid-cols-")) return "grid";
    return cls; // treat as unique key
  };

  for (const cls of classes) {
    const key = classify(cls);
    if (!groups.has(key)) order.push(key);
    groups.set(key, cls);
  }

  return order.map((key) => groups.get(key)).join(" ");
}
