import { Ascii } from "@/lib/ascii";
import { WINGS_WORDMARK } from "@/lib/ascii/art";

const WORDMARK_COLS = Math.max(
  ...WINGS_WORDMARK.trim().split("\n").map((line) => [...line].length),
);

/** Full-bleed static WINGS wordmark — scales to viewport width. */
export function FooterWordmark() {
  return (
    <div
      className="nw-footer-wordmark-wrap relative left-1/2 -translate-x-1/2 w-screen select-none overflow-hidden"
      aria-hidden
      style={{ "--wordmark-cols": WORDMARK_COLS } as React.CSSProperties}
    >
      <Ascii size="" box className="nw-footer-wordmark">
        {WINGS_WORDMARK.trim()}
      </Ascii>
    </div>
  );
}
