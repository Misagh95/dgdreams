export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-base)]">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <div className="absolute w-3 h-3 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] animate-pulse" />
      </div>
      <div className="text-sm font-mono tracking-widest uppercase text-[var(--accent)] animate-pulse">
        Connecting Terminal...
      </div>
      <p className="text-xs font-mono mt-2 text-[var(--text-tertiary)]">
        Synchronizing on-chain state
      </p>
    </div>
  );
}
