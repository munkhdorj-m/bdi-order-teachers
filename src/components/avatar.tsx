import { givenName } from "@/lib/format";
import { cn } from "@/lib/utils";

/** First letter of the given name in a dark circle. */
export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center rounded-full bg-ink font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {givenName(name).charAt(0).toUpperCase() || "?"}
    </span>
  );
}
