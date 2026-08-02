import { HelixSpinner } from "./HelixSpinner";
import { FlipTileWave } from "./FlipTileWave";
import { GyroscopeRings } from "./GyroscopeRings";

export type WingsLoaderVariant = "helix" | "flip" | "gyro";

const loaders = {
  helix: HelixSpinner,
  flip: FlipTileWave,
  gyro: GyroscopeRings,
} as const;

export function WingsLoader({
  variant = "gyro",
  className,
}: {
  variant?: WingsLoaderVariant;
  className?: string;
}) {
  const Loader = loaders[variant];
  return <Loader className={className} />;
}

export function LoadingScreen({
  variant = "gyro",
  label,
}: {
  variant?: WingsLoaderVariant;
  label?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <WingsLoader variant={variant} />
      {label && <p className="text-xs font-mono text-ink-2">{label}</p>}
    </div>
  );
}
