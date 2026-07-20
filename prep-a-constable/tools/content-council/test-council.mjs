// ============================================================================
// test-council.mjs — offline test of the council orchestration.
// Injects a FAKE model caller (no network, no API key) that scripts every
// stage, then asserts the pipeline detects disputes, runs peer review, lets the
// chairman decide, and builds a correctly-ranked report.
//   Run: node test-council.mjs
// ============================================================================

import { runCouncil, buildReport } from "./council.mjs";

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) pass++; else { fail++; console.log("FAIL: " + name); } };

// Four synthetic items exercising every path.
const items = [
  { id: "ok-1",   type: "offence",  topicId: null, text: "OFFENCE: Theft — Section 1 Theft Act 1968." },
  { id: "bad-1",  type: "offence",  topicId: null, text: "OFFENCE: Theft — max sentence 10 years." },
  { id: "disp-1", type: "question", topicId: "t",  text: "QUESTION about the section number." },
  { id: "nis-1",  type: "power",    topicId: null, text: "POWER not mentioned anywhere in this source." },
];

const source = "A person is guilty of theft ... a person guilty of theft is liable on indictment to imprisonment for a term not exceeding seven years.";

// Fake model: decides its reply from the prompt stage + model identity.
const fakeQuery = async (model, messages) => {
  const content = messages[0].content;
  if (model === "m/DEAD") return null;                       // a model that fails entirely

  if (content.includes("You are the CHAIRMAN")) {
    return "```json\n" + JSON.stringify({
      final: [{ id: "disp-1", verdict: "CONTRADICTED", note: "source gives a different section number" }],
      summary: "Two items contradict the source: bad-1 (sentence) and disp-1 (section). Both need correcting against Mr Mansur's document.",
    }) + "\n```";
  }
  if (content.includes("OTHER REVIEWERS")) {                 // peer-review round (disp-1)
    return JSON.stringify({ id: "disp-1", verdict: "CONTRADICTED", source_quote: "seven years", note: "reconsidered: contradicts" });
  }
  // Stage 1 verification — vary the disputed item by model.
  const disp = model === "m/A" ? "SUPPORTED" : model === "m/B" ? "CONTRADICTED" : "NOT_IN_SOURCE";
  return JSON.stringify([
    { id: "ok-1",   verdict: "SUPPORTED",     source_quote: "A person is guilty of theft", note: "matches source" },
    { id: "bad-1",  verdict: "CONTRADICTED",  source_quote: "seven years", note: "app says 10 years; source says seven" },
    { id: "disp-1", verdict: disp,            source_quote: "", note: "unclear" },
    { id: "nis-1",  verdict: "NOT_IN_SOURCE", source_quote: "", note: "not covered by this source" },
  ]);
};

const result = await runCouncil({
  source, items,
  models: ["m/A", "m/B", "m/C", "m/DEAD"],
  chairmanModel: "m/CHAIR",
  queryModel: fakeQuery,
});

const find = (id) => result.findings.find((f) => f.id === id);

t("dead model excluded from responders", result.respondingModels.length === 3 && !result.respondingModels.includes("m/DEAD"));
t("ok-1 -> SUPPORTED, undisputed", find("ok-1").verdict === "SUPPORTED" && find("ok-1").disputed === false);
t("bad-1 -> CONTRADICTED, undisputed", find("bad-1").verdict === "CONTRADICTED" && find("bad-1").disputed === false);
t("bad-1 keeps the deciding source quote", /seven years/.test(find("bad-1").quote));
t("disp-1 detected as disputed", find("disp-1").disputed === true);
t("disp-1 -> chairman's final verdict CONTRADICTED", find("disp-1").verdict === "CONTRADICTED");
t("exactly one item escalated to peer/chairman", result.disputed.length === 1);
t("nis-1 -> NOT_IN_SOURCE", find("nis-1").verdict === "NOT_IN_SOURCE");
t("chairman summary captured", /contradict/i.test(result.summary));

const report = buildReport(result, { sourceName: "theft.txt" });
t("report leads with CONTRADICTED count of 2", report.includes("CONTRADICTED — review these first (2)"));
t("report lists bad-1 and disp-1 in contradicted section",
  report.indexOf("`bad-1`") > 0 && report.indexOf("`disp-1`") > 0);
t("report shows per-model breakdown", /A=|B=|C=/.test(report));
t("report includes chairman summary", report.includes("Chairman's summary"));
t("CONTRADICTED appears before SUPPORTED in the report",
  report.indexOf("CONTRADICTED — review these first") < report.indexOf("SUPPORTED — faithful"));

console.log(`\n${pass} passed, ${fail} failed`);
if (!fail) {
  console.log("\n--- sample report ---\n");
  console.log(report);
}
process.exit(fail === 0 ? 0 : 1);
