/**
 * Global SVG filter definitions for the dither system.
 * Mount once at app root — referenced by CSS via url(#nw-dither-grain-*).
 */
export function DitherFilterDefs() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed h-0 w-0 overflow-hidden"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Fine stochastic grain — printer / film diffusion dither */}
        <filter id="nw-dither-grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" stitchTiles="stitch" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 24 -9"
            result="bin"
          />
          <feComponentTransfer in="bin" result="mono">
            <feFuncR type="discrete" tableValues="0 1" />
            <feFuncG type="discrete" tableValues="0 1" />
            <feFuncB type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>

        <filter id="nw-dither-grain-dense" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="5" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 28 -11" result="bin" />
          <feComponentTransfer in="bin" result="mono">
            <feFuncR type="discrete" tableValues="0 1" />
            <feFuncG type="discrete" tableValues="0 1" />
            <feFuncB type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>

        <filter id="nw-dither-grain-sparse" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.52" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 18 -7" result="bin" />
          <feComponentTransfer in="bin" result="mono">
            <feFuncR type="discrete" tableValues="0 1" />
            <feFuncG type="discrete" tableValues="0 1" />
            <feFuncB type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>

        <filter id="nw-dither-grain-coarse" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 16 -6" result="bin" />
          <feComponentTransfer in="bin" result="mono">
            <feFuncR type="discrete" tableValues="0 1" />
            <feFuncG type="discrete" tableValues="0 1" />
            <feFuncB type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>

        {/* Text dither — thresholds glyph fill; composites with SourceGraphic */}
        <filter id="nw-dither-text" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 14 -4.5"
            result="thresh"
          />
          <feComponentTransfer in="thresh" result="mask">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>

        {/* Shape dither — binarizes gradients inside black viewboxes */}
        <filter id="nw-dither-shape" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum" />
          <feDisplacementMap in="lum" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="disp" />
          <feComposite in="SourceGraphic" in2="noise" operator="arithmetic" k1="0" k2="0" k3="1" k4="0" result="mixed" />
          <feColorMatrix
            in="mixed"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 20 -8"
            result="high"
          />
          <feComponentTransfer in="high">
            <feFuncR type="discrete" tableValues="0 1" />
            <feFuncG type="discrete" tableValues="0 1" />
            <feFuncB type="discrete" tableValues="0 1" />
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
