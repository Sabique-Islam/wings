import logoAsset from "@/assets/wings-logo.png.asset.json";

interface Props {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Wings brand mark. Wraps the uploaded logo asset so we never inline the
 * binary path in components — swap the asset and every surface updates.
 */
export function Logo({ size = 28, className = "", withWordmark = false, wordmarkClassName = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoAsset.url}
        width={size}
        height={size}
        alt="Wings"
        loading="eager"
        decoding="async"
        className="block select-none"
        draggable={false}
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span className={`font-mono tracking-tight ${wordmarkClassName || "text-sm"}`}>wings</span>
      )}
    </span>
  );
}
