const links = [
  { label: "Docs", href: "https://docs.dgdreams.space", external: true },
  { label: "X / Twitter", href: "https://x.com/DGDreamsapp", external: true },
  { label: "GitHub", href: "https://github.com/Misagh95/dgdreams", external: true },
];

export default function SiteFooter() {
  return (
    <footer
      className="px-4 sm:px-6 py-6 mt-6"
      style={{ borderTop: "1px solid var(--border-default)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <nav className="flex items-center gap-6 flex-wrap justify-center">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-xs font-mono transition-all hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
          DGDreams <span style={{ color: "var(--text-tertiary)" }}>v2.1</span> · Web3 Space Terminal
        </p>
      </div>
    </footer>
  );
}
