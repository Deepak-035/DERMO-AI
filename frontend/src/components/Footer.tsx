export function Footer() {
  return (
    <footer className="border-t border-border bg-bg mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand + Disclaimer */}
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" className="text-text" />
              <circle cx="20" cy="12" r="3" fill="currentColor" className="text-accent" />
            </svg>
            <span className="text-base tracking-tight">
              <span className="font-display font-bold">Dermo</span>
              <span className="font-mono font-bold text-accent">AI</span>
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            DermoAI is a screening aid, not a medical diagnosis. AI predictions are probabilistic
            and may be incorrect. Always confirm results with a board-certified dermatologist.
          </p>

          <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-sm">
            <p className="text-xs text-destructive font-medium leading-relaxed">
              <strong>See a doctor urgently</strong> if a mole changes rapidly in size, shape or colour,
              bleeds without injury, or if a sore does not heal within 3 weeks.
            </p>
          </div>
        </div>

        <hr className="hairline mt-10 mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted">
          <span>&copy; {new Date().getFullYear()} DermoAI. All rights reserved.</span>
          <span className="font-mono">A screening aid. Not a diagnosis.</span>
        </div>

        {/* Giant wordmark */}
        <div className="mt-8 overflow-hidden select-none" aria-hidden="true">
          <span className="font-display font-black text-[clamp(4rem,12vw,10rem)] leading-none tracking-tight-display text-border opacity-40">
            DermoAI
          </span>
        </div>
      </div>
    </footer>
  );
}
