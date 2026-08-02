import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const BAR_COUNT = 16;
const TWIST_PER_BAR = -18;

/** Column of bars spinning as a 3D helix. */
export function HelixSpinner({ className }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn("flex items-center justify-center", className)} style={{ perspective: 700 }}>
      <div className="flex flex-col items-center gap-[3px]" style={{ transformStyle: "preserve-3d" }}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <motion.div
            key={i}
            className="h-1 w-24 rounded-full bg-accent-strong/70"
            initial={{ rotateY: i * TWIST_PER_BAR }}
            animate={shouldReduceMotion ? undefined : { rotateY: i * TWIST_PER_BAR + 360 }}
            transition={{ duration: 4, ease: "linear", repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}
