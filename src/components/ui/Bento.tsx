import type { ReactNode } from "react";

/**
 * BentoCard — the unit of the grid under the hero.
 *
 * One hairline border, one flat surface, optional accent corner. No glow,
 * no tilt, no gradient.
 */
export function BentoCard({
  title,
  icon,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-[20px] overflow-hidden ${className}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <header className="flex items-center gap-2 px-5 pt-5 pb-3">
        {icon ? (
          <span className="flex items-center" style={{ color: "var(--text-tertiary)" }}>
            {icon}
          </span>
        ) : null}
        <h2 className="text-[14px] font-semibold" style={{ color: "var(--text-bright)" }}>
          {title}
        </h2>
        {action ? <div className="ml-auto">{action}</div> : null}
      </header>
      <div className={`flex-1 px-5 pb-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** The grid itself: three columns on wide screens, one on a phone. */
export function BentoGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

export default BentoCard;
