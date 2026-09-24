// ============================================================================
// MockSetupScreen — a port of the web MockSetupScreen.
//
// Two shapes: the briefing for a fixed Assessment Point mock, and the custom
// builder (pick topics, question count and time limit).
//
// AP mocks are scoped strictly by EXAM_CONFIGS — the Assessment Point topic
// lists from Mr Mansur's document. Nothing outside that list is ever drawn.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel, PrimaryButton } from '../ui';
import { C, fontDisplay, fontBody, fontBodyMed, fontBodySemi, fontBodyBold } from '../theme';
import { TOPICS, QUESTIONS, EXAM_CONFIGS } from '../../../shared/content/index.js';
import { pickQuestions } from '../../../shared/logic.js';

const Row = ({ label, value }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={s.rowValue}>{value}</Text>
  </View>
);

function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={s.segment}>
      {options.map((opt) => {
        const sel = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            style={[s.segBtn, sel && { backgroundColor: 'white' }]}
          >
            <Text style={[s.segText, sel && { color: C.navy }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MockSetupScreen({ examLevel, go }) {
  const isCustom = examLevel === 'custom';
  const [count, setCount] = useState(20);
  const [duration, setDuration] = useState(30);
  const [topicSel, setTopicSel] = useState(TOPICS.map((t) => t.id));

  if (!isCustom) {
    const cfg = EXAM_CONFIGS[examLevel];
    const poolSize = QUESTIONS.filter((q) => cfg.topicIds.includes(q.topicId)).length;
    const willUse = Math.min(cfg.questions, poolSize);
    const covers = cfg.topicIds
      .map((tid) => (TOPICS.find((t) => t.id === tid) || {}).shortTitle)
      .filter(Boolean)
      .join(' · ');

    return (
      <Screen>
        <Header title={`${cfg.label} mock`} onBack={() => go({ name: 'mockList' })} bg={C.red} />
        <View style={{ padding: 18 }}>
          <Card style={{ marginBottom: 16 }} accent={C.red}>
            <Text style={s.cardTitle}>{cfg.label} — exam conditions</Text>
            <Row label="Questions" value={`${cfg.questions}`} />
            <Row label="Time limit" value={`${cfg.durationMins} minutes`} />
            <Row label="Pass mark" value={`${Math.round(cfg.passMark * 100)}%`} />
            <Row label="Feedback" value="At end only" />
            <Text style={s.covers}>
              <Text style={s.coversLabel}>Covers: </Text>{covers}
            </Text>
            {willUse < cfg.questions ? (
              <Text style={s.notice}>
                The seed bank has {QUESTIONS.length} questions — your mock will run with {willUse} unique questions for now.
              </Text>
            ) : null}
          </Card>
          <PrimaryButton
            full
            style={{ backgroundColor: C.red }}
            onPress={() => go({
              name: 'mock',
              examLevel: cfg.label,
              durationMins: cfg.durationMins,
              questionIds: pickQuestions({ topicIds: cfg.topicIds, count: cfg.questions }).map((q) => q.id),
            })}
          >
            Begin {cfg.label}
          </PrimaryButton>
        </View>
      </Screen>
    );
  }

  const toggleTopic = (id) =>
    setTopicSel(topicSel.includes(id) ? topicSel.filter((x) => x !== id) : [...topicSel, id]);
  const availableInSel = QUESTIONS.filter((q) => topicSel.includes(q.topicId)).length;
  const willUse = Math.min(count, availableInSel);

  return (
    <Screen>
      <Header title="Custom mock" onBack={() => go({ name: 'mockList' })} bg={C.red} />
      <View style={{ padding: 18 }}>
        <SectionLabel>Topics</SectionLabel>
        <View style={{ gap: 8, marginBottom: 22 }}>
          {TOPICS.map((t) => {
            const sel = topicSel.includes(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => toggleTopic(t.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={t.shortTitle}
                accessibilityState={{ checked: sel }}
                style={[s.topicRow, sel && { backgroundColor: 'rgba(26, 58, 108, 0.07)', borderColor: C.navy }]}
              >
                <View style={[s.box, sel ? { backgroundColor: C.navy, borderColor: C.navy } : { borderColor: C.borderStrong }]}>
                  <Text style={{ color: 'white', fontSize: 14 }}>{sel ? '✓' : ''}</Text>
                </View>
                <Text style={s.topicName}>{t.shortTitle}</Text>
                <Text style={s.topicQs}>{QUESTIONS.filter((q) => q.topicId === t.id).length} qs</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Questions</SectionLabel>
        <SegmentedControl
          value={count}
          onChange={setCount}
          options={[{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 40, label: '40' }, { value: 80, label: '80' }]}
        />

        <SectionLabel style={{ marginTop: 22 }}>Time limit</SectionLabel>
        <SegmentedControl
          value={duration}
          onChange={setDuration}
          options={[{ value: 15, label: '15m' }, { value: 30, label: '30m' }, { value: 60, label: '60m' }, { value: 0, label: 'Off' }]}
        />

        <View style={s.summary}>
          <Text style={s.summaryText}>
            Set to run with <Text style={s.summaryBold}>{willUse} question{willUse === 1 ? '' : 's'}</Text> and{' '}
            <Text style={s.summaryBold}>{duration === 0 ? 'no time limit' : `${duration} minutes`}</Text>.
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <PrimaryButton
            full
            style={topicSel.length === 0 || willUse === 0 ? null : { backgroundColor: C.red }}
            disabled={topicSel.length === 0 || willUse === 0}
            onPress={() => go({
              name: 'mock',
              examLevel: 'Custom',
              durationMins: duration,
              questionIds: pickQuestions({ topicIds: topicSel, count }).map((q) => q.id),
            })}
          >
            Begin custom mock
          </PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  cardTitle: { fontFamily: fontDisplay, fontSize: 22, color: C.text, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  rowLabel: { fontFamily: fontBody, fontSize: 14, color: C.textMuted },
  rowValue: { fontFamily: fontBodySemi, fontSize: 14, color: C.text },
  covers: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, lineHeight: 18, marginTop: 12 },
  coversLabel: { fontFamily: fontBodyBold, color: C.text },
  notice: { marginTop: 14, padding: 10, backgroundColor: C.flagBg, borderRadius: 8, fontFamily: fontBody, fontSize: 13, lineHeight: 19, color: C.text },

  topicRow: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  topicName: { flex: 1, fontFamily: fontBodyMed, fontSize: 15, color: C.text },
  topicQs: { fontFamily: fontBody, fontSize: 12, color: C.textFaint },

  segment: { flexDirection: 'row', backgroundColor: '#EDF0F5', borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center' },
  segText: { fontFamily: fontBodySemi, fontSize: 14, color: C.textMuted },

  summary: { marginTop: 22, padding: 14, backgroundColor: 'rgba(26, 58, 108, 0.05)', borderRadius: 10 },
  summaryText: { fontFamily: fontBody, fontSize: 13, lineHeight: 20, color: C.text },
  summaryBold: { fontFamily: fontBodyBold },
});
