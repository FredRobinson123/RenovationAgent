const highlights = [
  {
    title: "Personal renovations",
    description: "Advice is grounded in the lessons from renovating my own 1920s home.",
  },
  {
    title: "Budget clarity",
    description: "Spreadsheets, allowances, and contingency prompts keep decisions honest.",
  },
  {
    title: "Human tone",
    description: "Wren speaks plainly—no jargon, just actionable next steps.",
  },
];

export function WhyWrenWidget() {
  return (
    <section
      className="rounded-3xl bg-bubble-user text-charcoal-taupe border border-bubble-user-border shadow-lg shadow-bubble-user/40"
      data-testid="why-wren-widget"
    >
      <div className="p-8 space-y-6 md:space-y-0 md:flex md:items-center md:gap-10">
        <div className="flex-1 space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] font-semibold text-charcoal-taupe/70">
            Why I built Wren
          </p>
          <p className="text-xl leading-relaxed">
            I wanted a calm, central place to capture the chaos of renovation planning—a guide that could
            keep trades, budgets, design inspo, and decision fatigue in one conversation. Wren is that
            assistant.
          </p>
        </div>
        <div className="flex-1 grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white/60 border border-bubble-user-border/60 p-4 shadow-sm"
            >
              <p className="text-sm font-semibold tracking-wide">{item.title}</p>
              <p className="text-sm text-charcoal-taupe/80 mt-2">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

