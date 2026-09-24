import { QUESTIONS, TOPICS, EXAM_CONFIGS } from '../../shared/content/index.js';

// Could a student score well WITHOUT knowing any law, just by picking the
// longest option? If so the question bank is training test-craft, not law.
let longest = 0, total = 0;
const perTopic = {};
QUESTIONS.forEach(q => {
  const correct = q.options.find(o => o.id === q.correctOptionId);
  if (!correct) return;
  const maxLen = Math.max(...q.options.map(o => o.text.length));
  const isLongest = correct.text.length === maxLen;
  total++;
  if (isLongest) longest++;
  const t = (TOPICS.find(x => x.id === q.topicId) || {}).shortTitle || q.topicId;
  perTopic[t] = perTopic[t] || { l: 0, n: 0 };
  perTopic[t].n++; if (isLongest) perTopic[t].l++;
});
console.log(`WHOLE BANK: correct answer is the LONGEST option in ${longest}/${total} = ${Math.round(longest/total*100)}%`);
console.log('(random chance with 4 options would be ~25%)\n');

// mean length of correct vs incorrect
let cLen = 0, cN = 0, wLen = 0, wN = 0;
QUESTIONS.forEach(q => q.options.forEach(o => {
  if (o.id === q.correctOptionId) { cLen += o.text.length; cN++; }
  else { wLen += o.text.length; wN++; }
}));
console.log(`Mean length  correct: ${Math.round(cLen/cN)} chars   incorrect: ${Math.round(wLen/wN)} chars`);
console.log(`Correct options are ${(cLen/cN)/(wLen/wN) === 1 ? 'the same' : ((cLen/cN)/(wLen/wN)).toFixed(1)+'x'} the length of wrong ones\n`);

console.log('Worst topics (longest-option cue rate):');
Object.entries(perTopic).sort((a,b)=>b[1].l/b[1].n - a[1].l/a[1].n).slice(0,10)
  .forEach(([t,v]) => console.log(`  ${String(Math.round(v.l/v.n*100)).padStart(3)}%  ${v.l}/${v.n}  ${t}`));

console.log('\nBest topics (least cued):');
Object.entries(perTopic).sort((a,b)=>a[1].l/a[1].n - b[1].l/b[1].n).slice(0,6)
  .forEach(([t,v]) => console.log(`  ${String(Math.round(v.l/v.n*100)).padStart(3)}%  ${v.l}/${v.n}  ${t}`));
