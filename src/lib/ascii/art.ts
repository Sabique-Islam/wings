// Single source of truth for Wings' ASCII art.

export const WINGS_WORDMARK = `
 ██╗    ██╗██╗███╗   ██╗ ██████╗ ███████╗
 ██║    ██║██║████╗  ██║██╔════╝ ██╔════╝
 ██║ █╗ ██║██║██╔██╗ ██║██║  ███╗███████╗
 ██║███╗██║██║██║╚██╗██║██║   ██║╚════██║
 ╚███╔███╔╝██║██║ ╚████║╚██████╔╝███████║
  ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝
`;

export const WINGS_TAGLINE = "a quiet place for loud ideas";

export const WINGS_MARK_COMPACT = `┌──────────────────────┐
│  ◼  wings · write    │
│  /think  >  render   │
└──────────────────────┘`;

export const SPINNER_FRAMES = [
  `   __        __
   \\ \\      / /
    \\ \\ /\\ / / 
     \\ V  V /  
      \\_/\\_/   `,
  `   __        __ .
   \\ \\      / / ..
    \\ \\ /\\ / / ...
     \\ V  V /  ....
      \\_/\\_/   .....`,
  `   __        __  ·
   \\ \\      / / ··
    \\ \\ /\\ / / ···
     \\ V  V /  ····
      \\_/\\_/   ·····`,
];

export const EMPTY_BOX = `    ┌──────────┐
    │  ◇  ◇  ◇ │
    │  write   │
    │  freely  │
    └──────────┘`;

// Block-fill ramp for ASCII sparklines / meters.
export const BLOCK_RAMP = " ▁▂▃▄▅▆▇█";
export const METER_FILL = "█";
export const METER_EMPTY = "░";

/** Map a number series onto vertical block characters (▁▂▃▄▅▆▇█). */
export function toBlocks(data: number[]): string {
  const max = Math.max(1, ...data);
  const ramp = "▁▂▃▄▅▆▇█";
  return data
    .map((v) => ramp[Math.min(ramp.length - 1, Math.max(0, Math.round((v / max) * (ramp.length - 1))))])
    .join("");
}

/** Render a fixed-width ASCII meter, e.g. ████████░░░░. */
export function toMeter(value: number, width = 12): string {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * width);
  return METER_FILL.repeat(filled) + METER_EMPTY.repeat(Math.max(0, width - filled));
}
