import { PropertyRow } from "@/lib/access";
import { DocumentRow, LedgerRow } from "@/lib/types";
import { money, fmtDate, fmtMonth, feeLabel } from "@/lib/format";
import ApiForm from "@/components/ApiForm";
import DocSection from "@/components/DocSection";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

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
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Next payment to owner</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">
            {nextPayout ? money(nextPayout.owner_payout) : "—"}
          </p>
          <p className="text-xs text-emerald-700">
            {nextPayout ? `scheduled ${fmtDate(nextPayout.payout_date)} (${fmtMonth(nextPayout.month)})` : "none scheduled"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Management fee</p>
          <p className="mt-1 text-xl font-semibold">{feeLabel(property.management_fee_type, property.management_fee_value)}</p>
          <p className="text-xs text-slate-400">{money(totals.fees)} charged to date</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tax-deductible to date</p>
          <p className="mt-1 text-xl font-semibold">{money(totals.tax)}</p>
          <p className="text-xs text-slate-400">management fees & deductible expenses</p>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Month-by-month ledger</h2>
          <a
            href={`/api/properties/${property.id}/ledger/export`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Export CSV
          </a>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Month</th>
                <th className="px-3 py-2.5 text-right">Rent collected</th>
                <th className="px-3 py-2.5 text-right">Other income</th>
                <th className="px-3 py-2.5 text-right">Expenses</th>
                <th className="px-3 py-2.5 text-right">Mgmt fee</th>
                <th className="px-3 py-2.5 text-right">Tax deductible</th>
                <th className="px-3 py-2.5 text-right">Owner payout</th>
                <th className="px-3 py-2.5">Payout date</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium">{fmtMonth(l.month)}</td>
                  <td className="px-3 py-2.5 text-right">{money(l.rent_collected)}</td>
                  <td className="px-3 py-2.5 text-right">{money(l.other_income)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {money(l.expenses)}
                    {l.expense_notes && <p className="text-xs font-normal text-slate-400">{l.expense_notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right">{money(l.management_fee)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {money(l.tax_deductible)}
                    {l.tax_notes && <p className="text-xs font-normal text-slate-400">{l.tax_notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">{money(l.owner_payout)}</td>
                  <td className="px-3 py-2.5">{fmtDate(l.payout_date)}</td>
                  <td className="px-3 py-2.5">
                    {l.payout_status === "paid" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Paid</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Scheduled</span>
                        {isManager && (
                          <ApiForm
                            action={`/api/properties/${property.id}/ledger`}
                            submitLabel="Mark paid"
                            className="inline"
                            buttonClassName="rounded border border-emerald-600 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
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
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">No months recorded yet.</td>
                </tr>
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-3 py-2.5">Totals</td>
                  <td className="px-3 py-2.5 text-right" colSpan={2}>{money(totals.rent)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.expenses)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.fees)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.tax)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.payout)}</td>
                  <td className="px-3 py-2.5" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {isManager && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-sky-700">+ Add month</summary>
            <ApiForm
              action={`/api/properties/${property.id}/ledger`}
              submitLabel="Add month"
              className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  Month
                  <input name="month" type="month" required className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  Rent collected ($)
                  <input name="rent_collected" type="number" step="0.01" className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  Other income ($)
                  <input name="other_income" type="number" step="0.01" className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  Expenses ($)
                  <input name="expenses" type="number" step="0.01" className={`${inputCls} mt-1 block w-full`} />
                </label>
                <input name="expense_notes" placeholder="Expense notes" className={`${inputCls} sm:col-span-2 self-end`} />
                <label className="text-xs text-slate-500">
                  Management fee ($ — blank = auto)
                  <input name="management_fee" type="number" step="0.01" className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  Tax deductible ($ — blank = fee + expenses)
                  <input name="tax_deductible" type="number" step="0.01" className={`${inputCls} mt-1 block w-full`} />
                </label>
                <input name="tax_notes" placeholder="Tax notes" className={`${inputCls} self-end`} />
                <label className="text-xs text-slate-500">
                  Owner payout ($ — blank = auto)
                  <input name="owner_payout" type="number" step="0.01" className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  Payout date
                  <input name="payout_date" type="date" className={`${inputCls} mt-1 block w-full`} />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Left blank, the management fee is calculated from the property's fee setting and the
                owner payout as income − expenses − fee.
              </p>
            </ApiForm>
          </details>
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
