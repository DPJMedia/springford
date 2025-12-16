export default function SubscribePage() {
  const plans = [
    {
      name: "Reader",
      price: "$5/mo",
      perks: ["Ad-free experience", "Weekly briefing", "Save stories"],
    },
    {
      name: "Supporter",
      price: "$9/mo",
      perks: ["Everything in Reader", "Early access to features", "Invite-only Q&A"],
    },
    {
      name: "Patron",
      price: "$15/mo",
      perks: ["Everything in Supporter", "Quarterly newsroom call", "Shout-out in newsletter"],
    },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow text-[color:var(--color-medium)]">Subscribe</p>
          <h1 className="headline text-2xl font-semibold text-[color:var(--color-dark)]">
            Support Spring-Ford Press
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-medium)]">
            Mock pricing for now—wire this to your payment provider later.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-[color:var(--color-border)]"
            >
              <p className="eyebrow">{plan.name}</p>
              <h3 className="mt-1 text-xl font-semibold text-[color:var(--color-dark)]">
                {plan.price}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-medium)]">
                {plan.perks.map((perk) => (
                  <li key={perk}>• {perk}</li>
                ))}
              </ul>
              <button className="mt-3 w-full rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 transition">
                Subscribe (mock)
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

