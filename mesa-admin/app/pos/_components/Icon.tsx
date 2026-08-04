import { cn } from "@/lib/cn";

/**
 * Material Symbols wrapper. Font is loaded via the POS layout's <head> link.
 * `fill` toggles the FILL font axis; `className` merges sizing/color.
 */
export function Icon({
  name,
  fill = false,
  className,
  style,
}: {
  name: string;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
