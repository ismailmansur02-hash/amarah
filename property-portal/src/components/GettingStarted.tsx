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
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
      <h2 className="text-lg font-semibold text-sky-900">Getting started</h2>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                s.done ? "bg-emerald-600 text-white" : "bg-white text-sky-800 ring-1 ring-sky-300"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${s.done ? "text-emerald-800" : "text-sky-900"}`}>
                {s.title}
              </p>
              <p className="text-xs text-sky-800/80">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
