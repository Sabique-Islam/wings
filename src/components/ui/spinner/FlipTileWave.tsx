import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const GRID_SIZE = 4;
const TILE = 30;

/** Grid of tiles flipping in a diagonal 3D wave. */
export function FlipTileWave({ className }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn("flex items-center justify-center", className)} style={{ perspective: 600 }}>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE}px)`,
          transformStyle: "preserve-3d",
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          return (
            <motion.div
              key={i}
              className="relative"
              style={{ width: TILE, height: TILE, transformStyle: "preserve-3d" }}
              animate={shouldReduceMotion ? undefined : { rotateY: 180 }}
              transition={{
                duration: 0.7,
                ease: "easeInOut",
                delay: (row + col) * 0.12,
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 1.2,
              }}
            >
              <div
                className="absolute inset-0 rounded-sm border border-border-subtle bg-surface-1"
                style={{ backfaceVisibility: "hidden" }}
              />
              <div
                className="absolute inset-0 rounded-sm bg-accent-strong"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
