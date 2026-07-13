import { motion } from "framer-motion";

/**
 * Accent-tinted starfield. Uses currentColor for the stars, so the parent
 * sets the hue (e.g. text-accent-strong-foreground on an accent header).
 */
export function StarField() {
  const stars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="dither dither--grain dither--dense absolute inset-0 opacity-30" aria-hidden />
      {stars.map((i) => {
        const top = (i * 37) % 100;
        const left = (i * 53) % 100;
        const size = 1 + ((i * 7) % 3);
        const delay = (i % 7) * 0.3;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-current"
            style={{ top: `${top}%`, left: `${left}%`, width: size, height: size, opacity: 0.6 }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.4, 0.8] }}
            transition={{ duration: 2 + (i % 3), delay, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
      <motion.div
        className="absolute -top-1 left-1/2 -translate-x-1/2 text-xl"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      >✦</motion.div>
    </div>
  );
}
