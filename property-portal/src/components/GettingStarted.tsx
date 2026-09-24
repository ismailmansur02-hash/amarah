/**
 * First-run guidance. The order matters and is not guessable: a property
 * cannot exist without an owner to attach it to, so the client login has to
 * come first. Shown until there is at least one property.
 */
export default function GettingStarted({
  hasClients,
  hasProperties,
}: {
  hasClients: boolean;
  hasProperties: boolean;
}) {
  const steps = [
    {
      done: hasClients,
      title: "Create a client login",
      body: "Every property belongs to an owner, so the owner's login has to exist first. You choose their username and password and hand it to them.",
    },
    {
      done: hasProperties,
      title: "Add their property",
      body: "Pick the owner, enter the address and takeover date. The 14-step rent-ready legal checklist is created automatically.",
    },
    {
      done: false,
      title: "Send them the link",
      body: "Give each client the site address and their login. They will only ever see their own property.",
    },
  ];

  return (
    <section className="card p-6 sm:p-7">
      <h2 className="display-sm text-xl">Getting started</h2>
      <ol className="mt-5 space-y-5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4">
            <span
              className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-500"
              style={
                s.done
                  ? { background: "var(--accent)", color: "#fff" }
                  : { border: "1px solid var(--line)", color: "var(--ink-3)" }
              }
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p
                className="text-[15px] font-medium"
                style={s.done ? { color: "var(--ink-3)" } : undefined}
              >
                {s.title}
              </p>
              <p className="mt-1 max-w-prose text-[14px] leading-relaxed text-[var(--ink-2)]">
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
