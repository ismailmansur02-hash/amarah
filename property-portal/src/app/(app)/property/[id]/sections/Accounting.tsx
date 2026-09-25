import { PropertyRow } from "@/lib/access";
import { DocumentRow, LedgerRow } from "@/lib/types";
import { money, fmtDate, fmtMonth, feeLabel } from "@/lib/format";
import ApiForm from "@/components/ApiForm";
import DocSection from "@/components/DocSection";
import Disclosure from "@/components/Disclosure";
import Field from "@/components/Field";

const inputCls = "input input-sm";

export default function Accounting({
  property,
  isManager,
  ledger,
  docs,
}: {
  property: PropertyRow;
  isManager: boolean;
  ledger: LedgerRow[];
  docs: DocumentRow[];
}) {
  const nextPayout = ledger
    .filter((l) => l.payout_status === "scheduled")
    .sort((a, b) => (a.payout_date || "").localeCompare(b.payout_date || ""))[0];
  const totals = ledger.reduce(
    (acc, l) => ({
      rent: acc.rent + l.rent_collected + l.other_income,
      expenses: acc.expenses + l.expenses,
      fees: acc.fees + l.management_fee,
      tax: acc.tax + l.tax_deductible,
      payout: acc.payout + l.owner_payout,
    }),
    { rent: 0, expenses: 0, fees: 0, tax: 0, payout: 0 }
  );

  return (
    <div className="space-y-10">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="card p-6">
          <p className="label">Next payment to owner</p>
          <p className="num mt-3 text-[2.25rem] font-semibold leading-none">
            {nextPayout ? money(nextPayout.owner_payout) : "—"}
          </p>
          <p className="mt-2.5 text-[13px] text-[var(--ink-3)]">
            {nextPayout
              ? `scheduled ${fmtDate(nextPayout.payout_date)} · for ${fmtMonth(nextPayout.month)}`
              : "none scheduled"}
          </p>
        </div>

        <div className="card grid gap-px overflow-hidden bg-[var(--line)] sm:grid-cols-2">
          <div className="bg-[var(--surface)] p-6">
            <p className="label">Management fee</p>
            <p className="num mt-3 text-[1.25rem] font-semibold leading-tight">
              {feeLabel(property.management_fee_type, property.management_fee_value)}
            </p>
            <p className="mt-2 text-[13px] text-[var(--ink-3)]">
              {money(totals.fees)} charged to date
            </p>
          </div>
          <div className="bg-[var(--surface)] p-6">
            <p className="label">Tax-deductible to date</p>
            <p className="num mt-3 text-[1.25rem] font-semibold leading-tight">
              {money(totals.tax)}
            </p>
            <p className="mt-2 text-[13px] text-[var(--ink-3)]">
              management fees & deductible expenses
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display-sm text-xl">Month-by-month ledger</h2>
          <a
            href={`/api/properties/${property.id}/ledger/export`}
            className="btn-quiet btn-sm"
          >
            Export CSV
          </a>
        </div>

        {/*
         * This one stays a real table — the brief asked for something that
         * reads like a spreadsheet, and columns of figures are what a
         * spreadsheet is for. Tabular figures and right alignment make the
         * columns line up digit for digit; the month column stays put while
         * the rest scrolls, so you never lose which row you are reading.
         */}
        <div className="card mt-5 overflow-x-auto">
          <table className="num w-full min-w-[900px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[var(--line)] whitespace-nowrap text-left text-[12px] font-normal text-[var(--ink-3)]">
                <th className="sticky left-0 bg-[var(--surface)] px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">Rent</th>
                <th className="px-4 py-3 text-right font-medium">Other income</th>
                <th className="px-4 py-3 text-right font-medium">Expenses</th>
                <th className="px-4 py-3 text-right font-medium">Mgmt fee</th>
                <th className="px-4 py-3 text-right font-medium">Tax deductible</th>
                <th className="px-4 py-3 text-right font-medium">Owner payout</th>
                <th className="px-4 py-3 font-medium">Payout date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-[var(--line-2)] transition-colors duration-150 last:border-0 hover:bg-black/[0.015]"
                >
                  <td className="sticky left-0 whitespace-nowrap bg-[var(--surface)] px-4 py-3 font-medium">
                    {fmtMonth(l.month)}
                  </td>
                  <td className="px-4 py-3 text-right">{money(l.rent_collected)}</td>
                  <td className="px-4 py-3 text-right">{money(l.other_income)}</td>
                  <td className="px-4 py-3 text-right">
                    {money(l.expenses)}
                    {l.expense_notes && (
                      <p className="mt-0.5 text-[12px] text-[var(--ink-3)]">{l.expense_notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{money(l.management_fee)}</td>
                  <td className="px-4 py-3 text-right">
                    {money(l.tax_deductible)}
                    {l.tax_notes && (
                      <p className="mt-0.5 text-[12px] text-[var(--ink-3)]">{l.tax_notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(l.owner_payout)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--ink-2)]">
                    {fmtDate(l.payout_date)}
                  </td>
                  <td className="px-4 py-3">
                    {l.payout_status === "paid" ? (
                      <span className="pill">
                        <span className="dot" style={{ background: "var(--accent)" }} />
                        Paid
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="pill">
                          <span className="dot" style={{ background: "#c98a00" }} />
                          Scheduled
                        </span>
                        {isManager && (
                          <ApiForm
                            action={`/api/properties/${property.id}/ledger`}
                            submitLabel="Mark paid"
                            className="inline"
                            buttonClassName="btn-quiet btn-sm"
                            footerClassName="flex items-center"
                          >
                            <input type="hidden" name="entry_id" value={l.id} />
                          </ApiForm>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[var(--ink-3)]">
                    No months recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot>
                <tr className="border-t border-[var(--line)] font-semibold">
                  <td className="sticky left-0 bg-[var(--surface)] px-4 py-3">Totals</td>
                  <td className="px-4 py-3 text-right" colSpan={2}>
                    {money(totals.rent)}
                  </td>
                  <td className="px-4 py-3 text-right">{money(totals.expenses)}</td>
                  <td className="px-4 py-3 text-right">{money(totals.fees)}</td>
                  <td className="px-4 py-3 text-right">{money(totals.tax)}</td>
                  <td className="px-4 py-3 text-right">{money(totals.payout)}</td>
                  <td className="px-4 py-3" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {isManager && (
          <Disclosure label="Add month" className="mt-4">
            <ApiForm
              action={`/api/properties/${property.id}/ledger`}
              submitLabel="Add month"
              className="card-flat mt-3 p-5"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Month">
                  <input name="month" type="month" required className={inputCls} />
                </Field>
                <Field label="Rent collected ($)">
                  <input name="rent_collected" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Other income ($)">
                  <input name="other_income" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Expenses ($)">
                  <input name="expenses" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Expense notes" className="sm:col-span-2">
                  <input name="expense_notes" className={inputCls} />
                </Field>
                <Field label="Management fee ($)" hint="Blank calculates it from the fee setting">
                  <input name="management_fee" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Tax deductible ($)" hint="Blank uses fee + expenses">
                  <input name="tax_deductible" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Tax notes">
                  <input name="tax_notes" className={inputCls} />
                </Field>
                <Field label="Owner payout ($)" hint="Blank uses income − expenses − fee">
                  <input name="owner_payout" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Payout date">
                  <input name="payout_date" type="date" className={inputCls} />
                </Field>
              </div>
            </ApiForm>
          </Disclosure>
        )}
      </section>

      <DocSection
        propertyId={property.id}
        section="accounting"
        docs={docs}
        isManager={isManager}
        heading="Accounting documents (management agreement, statements, 1099s…)"
      />
    </div>
  );
}
