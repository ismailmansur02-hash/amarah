// ============================================================================
// ConstableCompanionScreen — native port.
//
// Four tabs, matching web after the Situation tab was removed: Daily-use, A–Z,
// Powers and TOR Codes. Search, the category filter and the detail sheet all
// behave as on web; the data and the search synonyms come from shared/.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontDisplayItalic, fontBody, fontBodySemi, fontMono } from '../theme';
import {
  OFFENCES, OFFENCE_CATEGORIES, POWERS, POWER_CATEGORIES, TOR_CODES, TOR_STATUTE_KEY,
  SEARCH_SYNONYMS,
} from '../../../shared/content/index.js';
import { torActsFor } from '../../../shared/logic.js';

const TABS = [
  { id: 'daily', label: 'Daily-use' },
  { id: 'az', label: 'A–Z' },
  { id: 'powers', label: 'Powers' },
  { id: 'codes', label: 'TOR Codes' },
];

export default function ConstableCompanionScreen({ go }) {
  const [tab, setTab] = useState('daily');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [openItem, setOpenItem] = useState(null); // { type, id }

  const q = query.trim().toLowerCase();

  // Expand the query into all the terms we should match against, exactly as on
  // web: the cards use full titles ("anti-social behaviour"), so an officer
  // typing "ASB" or "GBH" must still find them.
  const queryTerms = useMemo(() => {
    if (!q) return [];
    const terms = [q];
    if (SEARCH_SYNONYMS[q]) terms.push(...SEARCH_SYNONYMS[q]);
    // also catch the abbreviation typed with dots, e.g. "a.s.b"
    const stripped = q.replace(/[.\s]/g, '');
    if (stripped !== q && SEARCH_SYNONYMS[stripped]) terms.push(...SEARCH_SYNONYMS[stripped]);
    return terms;
  }, [q]);

  const matches = (item) => {
    if (!q) return true;
    const haystack = [item.title, item.section, item.act, item.notes, item.grounds, item.definition, item.category]
      .filter(Boolean).join(' ').toLowerCase();
    return queryTerms.some((term) => haystack.includes(term));
  };

  const dailyOffences = useMemo(() => OFFENCES.filter((o) => o.daily && matches(o)), [q]);

  const azItems = useMemo(() => {
    const all = [
      ...OFFENCES.map((o) => ({ ...o, _type: 'offence' })),
      ...POWERS.map((p) => ({ ...p, _type: 'power' })),
    ];
    return all
      .filter((it) => (categoryFilter === 'all' || it.category === categoryFilter) && matches(it))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [q, categoryFilter]);

  const powers = useMemo(
    () => POWERS.filter((p) => (categoryFilter === 'all' || p.category === categoryFilter) && matches(p)),
    [q, categoryFilter]
  );

  const torCodes = useMemo(() => {
    if (tab !== 'codes') return [];
    return TOR_CODES.filter((t) => {
      if (!q) return true;
      return `${t.code} ${t.statute} ${t.wording} ${t.section}`.toLowerCase().includes(q);
    });
  }, [tab, q]);

  const torSections = useMemo(() => [...new Set(torCodes.map((t) => t.section))], [torCodes]);

  const resolved = openItem
    ? openItem.type === 'offence'
      ? OFFENCES.find((o) => o.id === openItem.id)
      : POWERS.find((p) => p.id === openItem.id)
    : null;

  const placeholder =
    tab === 'powers' ? 'Search powers, sections, acts…'
    : tab === 'codes' ? 'Search TOR code, statute or wording…'
    : 'Search offences, sections, acts…';

  const powersGrouped = {};
  powers.forEach((p) => {
    (powersGrouped[p.category] ||= []).push(p);
  });

  return (
    <Screen>
      <Header title="Constable Companion" onBack={() => go({ name: 'home' })} />

      <View style={s.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => { setTab(t.id); setCategoryFilter('all'); }}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: tab === t.id }}
            style={[s.tab, tab === t.id && s.tabActive]}
          >
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={C.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={s.search}
          accessibilityLabel={placeholder}
        />
      </View>

      {(tab === 'az' || tab === 'powers') && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {[{ id: 'all', label: 'All' }, ...(tab === 'az' ? [...OFFENCE_CATEGORIES, ...POWER_CATEGORIES] : POWER_CATEGORIES)].map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryFilter(c.id)}
              style={[s.chip, categoryFilter === c.id && s.chipActive]}
            >
              <Text style={[s.chipText, categoryFilter === c.id && { color: 'white' }]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={{ padding: 16, gap: 10 }}>
        {tab === 'daily' && (
          dailyOffences.length === 0
            ? <Empty query={query} />
            : dailyOffences.map((o) => (
                <OffenceCard key={o.id} offence={o} onPress={() => setOpenItem({ type: 'offence', id: o.id })} />
              ))
        )}

        {tab === 'az' && (
          azItems.length === 0
            ? <Empty query={query} />
            : azItems.map((it) => (
                <OffenceCard
                  key={`${it._type}-${it.id}`}
                  offence={it}
                  onPress={() => setOpenItem({ type: it._type, id: it.id })}
                />
              ))
        )}

        {tab === 'powers' && (
          powers.length === 0
            ? <Empty query={query} />
            : POWER_CATEGORIES.filter((c) => powersGrouped[c.id]).map((c) => (
                <View key={c.id} style={{ marginBottom: 12 }}>
                  <SectionLabel>{c.label}</SectionLabel>
                  <View style={{ gap: 8 }}>
                    {powersGrouped[c.id].map((p) => (
                      <OffenceCard key={p.id} offence={p} onPress={() => setOpenItem({ type: 'power', id: p.id })} />
                    ))}
                  </View>
                </View>
              ))
        )}

        {tab === 'codes' && (
          <>
            <View style={s.banner}>
              <Text style={s.bannerText}>
                What to write ON THE TRAFFIC OFFENCE REPORT itself — the Met's own Form 4740
                (endorsable) and 4741 (non-endorsable) offence codes. Different from the DVLA
                endorsement codes (SP30, CU80, etc.) elsewhere in Constable Companion, which is
                what goes on the driver's licence. Codes marked "?" had a torn source card —
                verify the exact number before relying on it.
              </Text>
            </View>

            {torCodes.length === 0 ? <Empty query={query} /> : torSections.map((section) => (
              <View key={section} style={{ marginBottom: 12 }}>
                <SectionLabel>{section}</SectionLabel>
                <View style={{ gap: 8 }}>
                  {torCodes.filter((t) => t.section === section).map((t, i) => (
                    <TorCodeCard key={`${t.code}-${i}`} torCode={t} />
                  ))}
                </View>
              </View>
            ))}

            {!q && (
              <View style={{ marginTop: 4 }}>
                <SectionLabel>Statute reference key</SectionLabel>
                <Card>
                  {TOR_STATUTE_KEY.map((k) => (
                    <View key={k.letter} style={{ flexDirection: 'row', gap: 8, marginBottom: 2 }}>
                      <Text style={s.keyLetter}>{k.letter}</Text>
                      <Text style={s.keyAct}>{k.act}</Text>
                    </View>
                  ))}
                  <Text style={s.keyNote}>
                    VW = normally subject only to a verbal warning. VDR = Vehicle Defect
                    Rectification Scheme (Book 114; not applicable to LGVs, PCVs or taxis).
                  </Text>
                </Card>
              </View>
            )}
          </>
        )}
      </View>

      <DetailSheet item={resolved} type={openItem?.type} onClose={() => setOpenItem(null)} />
    </Screen>
  );
}

function Empty({ query }) {
  return (
    <View style={{ paddingVertical: 30, alignItems: 'center' }}>
      <Text style={{ fontFamily: fontBody, color: C.textMuted, textAlign: 'center' }}>
        {query ? `Nothing matches “${query}”.` : 'Nothing to show.'}
      </Text>
    </View>
  );
}

function OffenceCard({ offence: o, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      <Text style={s.cardTitle}>{o.title}</Text>
      <Text style={s.cardMeta}>{[o.section, o.act].filter(Boolean).join(' · ')}</Text>
      {o.mode || o.sentence ? (
        <Text style={s.cardSub}>{[o.mode, o.sentence].filter(Boolean).join(' · ')}</Text>
      ) : null}
    </Pressable>
  );
}

function TorCodeCard({ torCode: t }) {
  const uncertain = t.code.includes('?');
  const acts = torActsFor(t.statute);
  return (
    <View style={[s.card, { flexDirection: 'row', gap: 10 }, uncertain && { borderColor: C.gold }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.torWording}>{t.wording}</Text>
        <Text style={s.torCode}>{t.code}{t.statute ? ` · ${t.statute}` : ''}</Text>
        {acts.length ? <Text style={s.torActs}>{acts.join(' · ')}</Text> : null}
      </View>
      <Text style={s.torPenalty}>{t.penalty}</Text>
    </View>
  );
}

function DetailSheet({ item, type, onClose }) {
  return (
    <Modal visible={!!item} animationType="slide" onRequestClose={onClose} transparent={false}>
      {item ? (
        <View style={{ flex: 1, backgroundColor: C.paper }}>
          <Header title={item.title} onBack={onClose} />
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
            <Text style={s.detailMeta}>{[item.section, item.act].filter(Boolean).join(' · ')}</Text>

            {item.definition ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Definition</SectionLabel>
                <Text style={s.detailBody}>{item.definition}</Text>
              </>
            ) : null}

            {item.grounds ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Grounds</SectionLabel>
                <Text style={s.detailBody}>{item.grounds}</Text>
              </>
            ) : null}

            {item.where ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Where</SectionLabel>
                <Text style={s.detailBody}>{item.where}</Text>
              </>
            ) : null}

            {item.pointsToProve?.length ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Points to prove — ALL of these</SectionLabel>
                {item.pointsToProve.map((pt, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                    <Text style={{ color: C.navy, fontFamily: fontBodySemi }}>•</Text>
                    <Text style={[s.detailBody, { flex: 1, marginBottom: 0 }]}>{pt}</Text>
                  </View>
                ))}
              </>
            ) : null}

            {item.mode || item.sentence ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Mode & sentence</SectionLabel>
                <Text style={s.detailBody}>{[item.mode, item.sentence].filter(Boolean).join(' · ')}</Text>
              </>
            ) : null}

            {item.endorsement ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Endorsement</SectionLabel>
                <Text style={s.detailBody}>
                  {item.endorsement.code} · {item.endorsement.points} points · {item.endorsement.fine}
                </Text>
                {item.endorsement.note ? <Text style={s.detailBody}>{item.endorsement.note}</Text> : null}
              </>
            ) : null}

            {item.mnemonic && item.mnemonic !== '—' ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Mnemonic</SectionLabel>
                <Text style={s.detailBody}>{item.mnemonic}</Text>
              </>
            ) : null}

            {item.notes ? (
              <>
                <SectionLabel style={{ marginTop: 16 }}>Notes</SectionLabel>
                <Text style={s.detailBody}>{item.notes}</Text>
              </>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

const s = StyleSheet.create({
  tabBar: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.navy },
  tabText: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted },
  tabTextActive: { fontFamily: fontBodySemi, color: C.navy },
  search: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10, backgroundColor: C.paper,
    paddingVertical: 11, paddingHorizontal: 14, fontFamily: fontBody, fontSize: 14.5, color: C.text,
  },
  chips: { marginTop: 10, maxHeight: 44 },
  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: 'white' },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontFamily: fontBody, fontSize: 12.5, color: C.text },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 14 },
  cardTitle: { fontFamily: fontDisplay, fontSize: 16, color: C.text, letterSpacing: -0.2, lineHeight: 20 },
  cardMeta: { fontFamily: fontMono, fontSize: 11.5, color: C.navyLight, marginTop: 3 },
  cardSub: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 5 },
  banner: { backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.gold, borderRadius: 10, padding: 12 },
  bannerText: { fontFamily: fontBody, fontSize: 12, color: C.goldDeep, lineHeight: 18 },
  torWording: { fontFamily: fontBody, fontSize: 14.5, color: C.text, lineHeight: 20 },
  torCode: { fontFamily: fontMono, fontSize: 11.5, color: C.navyLight, marginTop: 3 },
  torActs: { fontFamily: fontBody, fontSize: 11.5, color: C.textMuted, marginTop: 3, lineHeight: 17 },
  torPenalty: { fontFamily: fontMono, fontSize: 12, color: C.navy, textAlign: 'right' },
  keyLetter: { fontFamily: fontMono, color: C.navy, width: 16 },
  keyAct: { flex: 1, fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, lineHeight: 19 },
  keyNote: { fontFamily: fontBody, fontSize: 11.5, color: C.textFaint, marginTop: 8, lineHeight: 17 },
  detailMeta: { fontFamily: fontMono, fontSize: 12, color: C.navyLight },
  detailBody: { fontFamily: fontBody, fontSize: 14.5, color: C.text, lineHeight: 22, marginBottom: 8 },
});
