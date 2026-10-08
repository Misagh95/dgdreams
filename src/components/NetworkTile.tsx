"use client";

import Image from "next/image";
import type { NetworkConfig } from "@/config/chains";

/**
 * One network tile in the "pick a network" grid.
 *
 * Lives on the 6-in-1 card: picking a network here sets the chain the runner
 * deploys to and sends the Check-In/GM/GN missions to. A network with no NikBase cannot
 * take the missions, so it is dimmed and says so rather than looking clickable.
 */
export function NetworkTile({
  network,
  isSelected,
  isDisabled,
  hasContract,
  onSelect,
}: {
  network: NetworkConfig;
  isSelected: boolean;
  isDisabled: boolean;
  /** a NikBase on this chain, so Check-In/GM/GN can land there */
  hasContract: boolean;
  onSelect: () => void;
}) {
  const canInteract = hasContract && !isDisabled;

  return (
    <button
      type="button"
      onClick={canInteract ? onSelect : undefined}
      disabled={!canInteract}
      aria-pressed={isSelected}
      className={
        "p-2.5 rounded-lg transition-all duration-200 relative flex flex-col gap-2 text-left w-full disabled:cursor-not-allowed " +
        (!hasContract ? "opacity-40 " : "") +
        (canInteract ? "cursor-pointer hover:opacity-85 " : "")
      }
      style={{
        background: isSelected ? "var(--bg-subtle)" : "var(--bg-card)",
        border: isSelected ? `1px solid var(--accent)` : `1px solid var(--border-default)`,
        ...(isSelected
          ? { boxShadow: `0 0 10px color-mix(in srgb, var(--accent) 18%, transparent)` }
          : {}),
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${network.color} 20%, transparent)` }}
        >
          <Image
            src={network.logo}
            alt={network.name}
            width={16}
            height={16}
            style={{ objectFit: "contain" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-semibold truncate leading-tight" style={{ color: "var(--text-bright)" }}>
            {network.name}
          </h3>
        </div>
        {isSelected && (
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
            }}
          >
            SELECTED
          </span>
        )}
      </div>

      {!hasContract ? (
        <p className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>
          Not deployed
        </p>
      ) : (
        <p className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          Click to run GM — Check — GN
        </p>
      )}
    </button>
  );
}

export default NetworkTile;
