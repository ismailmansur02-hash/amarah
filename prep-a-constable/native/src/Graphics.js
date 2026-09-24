// ============================================================================
// Graphics.js — the app's illustrations and icons, ported from the web build's
// inline SVG to react-native-svg.
//
// Every path, coordinate and colour here is copied from app/prep-a-constable.jsx
// so the native app looks like the same product rather than a plainer cousin.
// ============================================================================

import React from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path, Rect, Circle, Line, Ellipse, Polygon, G, Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { C, fontDisplay, fontDisplaySemi, fontDisplayItalic } from './theme';

export function ShieldLogo({ width = 40, height = 46 }) {
  // The web draws "PC" as SVG <text>; RN Svg text metrics differ enough that
  // overlaying a real <Text> gives a more reliable result across devices.
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 40 46">
        <Path
          d="M20 2 L36 7 L36 22 C36 33 28 41 20 44 C12 41 4 33 4 22 L4 7 Z"
          fill={C.navy} stroke="white" strokeWidth="1.5"
        />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontDisplayItalic, fontSize: 16, color: 'white', marginTop: -1 }}>
          PC
        </Text>
      </View>
    </View>
  );
}

// The hero's CSS gradient (#E8EFF8 -> #F2F4F8) as an absolutely-positioned
// fill, so the native hero has the same wash behind it as the web one.
export function HeroGradient() {
  return (
    <Svg
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="hero" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="#E8EFF8" />
          <Stop offset="100%" stopColor="#F2F4F8" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#hero)" />
    </Svg>
  );
}

export const BadgeIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L14.5 7.5 L20.5 8.4 L16 12.6 L17.2 18.6 L12 15.8 L6.8 18.6 L8 12.6 L3.5 8.4 L9.5 7.5 Z" fill={color} />
  </Svg>
);

export const BookIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 5 C4 4 5 3 6 3 L11 3 L11 19 L6 19 C5 19 4 19.5 4 21 Z" fill={color} />
    <Path d="M20 5 C20 4 19 3 18 3 L13 3 L13 19 L18 19 C19 19 20 19.5 20 21 Z" fill={color} />
  </Svg>
);

export const AlertIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3 L22 21 L2 21 Z" fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
    <Rect x="11" y="9" width="2" height="6" fill={color} />
    <Rect x="11" y="17" width="2" height="2" fill={color} />
  </Svg>
);

export const CalendarIcon = ({ color = 'white', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke={color} strokeWidth="2" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
    <Line x1="8" y1="3" x2="8" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="16" y1="3" x2="16" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const RefIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 5 L11 8 L11 21 L3 18 Z" fill={color} opacity="0.92" />
    <Path d="M21 5 L13 8 L13 21 L21 18 Z" fill={color} />
  </Svg>
);

// Circular progress ring for the daily goal, streak number in the centre.
export function StreakRing({ pct, current }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.max(0, Math.min(100, pct)) / 100) * circ;
  return (
    <View style={{ width: 56, height: 56 }}>
      <Svg width={56} height={56} viewBox="0 0 56 56">
        <Circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="5" />
        <Circle
          cx="28" cy="28" r={r} fill="none"
          stroke={pct >= 100 ? C.green : C.navy} strokeWidth="5"
          strokeDasharray={`${circ}`} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontDisplaySemi, fontSize: 18, color: C.navy }}>{current}</Text>
      </View>
    </View>
  );
}

// The big percentage ring used on Exam Prep for overall mastery.
export function ProgressRing({ value, max, color = C.gold, size = 96, stroke = 9, trackColor = '#F0E4C7' }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <Circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontDisplay, fontSize: size / 4, color: C.text, letterSpacing: -0.5 }}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
    </View>
  );
}

// The London skyline: Big Ben, the London Eye, the Gherkin, the Shard, and a
// Met patrol car on the road. Ported coordinate-for-coordinate from the web.
export function HomeIllustration({ height = 105 }) {
  // Wrapped in a View, and sized through `style` rather than the width/height
  // props. Both matter: a bare <Svg> is a raw <svg> element under
  // react-native-web, which the absolutely-positioned hero gradient then paints
  // straight over — the skyline was there in the DOM but invisible on screen.
  return (
    <View style={{ width: '100%', height }}>
      <Svg
        style={{ width: '100%', height }}
        viewBox="0 0 400 105"
        preserveAspectRatio="xMidYMax slice"
      >
      <Defs>
        <LinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="#D6E2F2" />
          <Stop offset="100%" stopColor="#F2F4F8" />
        </LinearGradient>
        <LinearGradient id="bldg" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="#1A3A6C" />
          <Stop offset="100%" stopColor="#14305A" />
        </LinearGradient>
      </Defs>

      <Rect width="400" height="105" fill="url(#sky)" />

      {/* Clouds */}
      <Ellipse cx="330" cy="16" rx="24" ry="4" fill="white" opacity="0.7" />
      <Ellipse cx="80" cy="13" rx="18" ry="3" fill="white" opacity="0.6" />
      <Ellipse cx="200" cy="22" rx="15" ry="2.8" fill="white" opacity="0.55" />

      {/* Background skyline */}
      <Path
        d="M0,88 L20,88 L20,72 L35,72 L35,80 L55,80 L55,68 L70,68 L70,88 L155,88 L170,80 L185,88 L240,88 L255,75 L275,88 L320,88 L335,80 L355,88 L400,88 L400,105 L0,105 Z"
        fill="#1A3A6C" opacity="0.18"
      />

      {/* Big Ben */}
      <G>
        <Rect x="48" y="46" width="20" height="42" fill="url(#bldg)" />
        <Rect x="50" y="53" width="16" height="13" fill="#E8E0C4" />
        <Circle cx="58" cy="59.5" r="4.5" fill="white" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="58" y1="59.5" x2="58" y2="56" stroke="#1A3A6C" strokeWidth="0.7" strokeLinecap="round" />
        <Line x1="58" y1="59.5" x2="60.5" y2="59.5" stroke="#1A3A6C" strokeWidth="0.7" strokeLinecap="round" />
        <Rect x="51" y="40" width="14" height="6" fill="#14305A" />
        <Rect x="53" y="37" width="10" height="3" fill="#1A3A6C" />
        <Polygon points="48,37 68,37 63,26 53,26" fill="#1A3A6C" />
        <Polygon points="53,26 63,26 58,16" fill="#14305A" />
        <Circle cx="58" cy="14.5" r="1.3" fill="#C9A227" />
        <Line x1="58" y1="46" x2="58" y2="88" stroke="#0E1B33" strokeWidth="0.5" opacity="0.3" />
      </G>

      {/* London Eye */}
      <G>
        <Line x1="113" y1="88" x2="125" y2="58" stroke="#1A3A6C" strokeWidth="2" strokeLinecap="round" />
        <Line x1="137" y1="88" x2="125" y2="58" stroke="#1A3A6C" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="125" cy="58" r="20" fill="none" stroke="#1A3A6C" strokeWidth="2" />
        <Circle cx="125" cy="58" r="2.4" fill="#1A3A6C" />
        <Line x1="125" y1="58" x2="125" y2="38" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="125" y2="78" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="105" y2="58" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="145" y2="58" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="139.1" y2="43.9" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="110.9" y2="43.9" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="139.1" y2="72.1" stroke="#1A3A6C" strokeWidth="0.7" />
        <Line x1="125" y1="58" x2="110.9" y2="72.1" stroke="#1A3A6C" strokeWidth="0.7" />
        <Circle cx="125" cy="38" r="2" fill="#4A6FA5" />
        <Circle cx="125" cy="78" r="2" fill="#4A6FA5" />
        <Circle cx="105" cy="58" r="2" fill="#4A6FA5" />
        <Circle cx="145" cy="58" r="2" fill="#4A6FA5" />
        <Circle cx="139.1" cy="43.9" r="2" fill="#4A6FA5" />
        <Circle cx="110.9" cy="43.9" r="2" fill="#4A6FA5" />
        <Circle cx="139.1" cy="72.1" r="2" fill="#4A6FA5" />
        <Circle cx="110.9" cy="72.1" r="2" fill="#4A6FA5" />
      </G>

      {/* The Gherkin */}
      <G>
        <Path d="M210,88 L210,58 Q210,40 222,32 Q234,40 234,58 L234,88 Z" fill="url(#bldg)" />
        <Path d="M212,52 L232,58 M212,62 L232,68 M212,72 L232,78 M212,82 L232,88" stroke="#4A6FA5" strokeWidth="0.5" opacity="0.55" />
        <Path d="M232,52 L212,58 M232,62 L212,68 M232,72 L212,78 M232,82 L212,88" stroke="#4A6FA5" strokeWidth="0.5" opacity="0.55" />
      </G>

      {/* The Shard */}
      <G>
        <Polygon points="290,88 310,88 306,24 294,24" fill="url(#bldg)" />
        <Line x1="294" y1="34" x2="306" y2="34" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
        <Line x1="293" y1="46" x2="307" y2="46" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
        <Line x1="292" y1="58" x2="308" y2="58" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
        <Line x1="291" y1="70" x2="309" y2="70" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
        <Line x1="290" y1="82" x2="310" y2="82" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
        <Polygon points="294,24 306,24 300,16" fill="#14305A" />
      </G>

      {/* Filler buildings */}
      <Rect x="78" y="68" width="16" height="20" fill="#1A3A6C" opacity="0.85" />
      <Rect x="160" y="64" width="20" height="24" fill="#1A3A6C" opacity="0.8" />
      <Rect x="178" y="72" width="12" height="16" fill="#14305A" opacity="0.85" />
      <Rect x="252" y="62" width="18" height="26" fill="#1A3A6C" opacity="0.85" />
      <Rect x="268" y="70" width="12" height="18" fill="#14305A" opacity="0.8" />
      <Rect x="318" y="68" width="14" height="20" fill="#1A3A6C" opacity="0.85" />
      <Rect x="350" y="62" width="20" height="26" fill="#1A3A6C" opacity="0.9" />
      <Rect x="370" y="72" width="14" height="16" fill="#14305A" opacity="0.85" />

      <Line x1="0" y1="89" x2="400" y2="89" stroke="#4A6FA5" strokeWidth="1" opacity="0.6" />

      {/* Road */}
      <Rect x="0" y="90" width="400" height="15" fill="#3A3F4A" />
      <Line x1="0" y1="98" x2="400" y2="98" stroke="#E4DC8E" strokeWidth="1.2" strokeDasharray="14 10" />

      {/* Met patrol car */}
      <G transform="translate(40, 83)">
        <Ellipse cx="28" cy="22" rx="26" ry="1.5" fill="black" opacity="0.18" />
        <Path d="M2,16 L4,10 Q5,8 8,8 L48,8 Q51,8 52,10 L54,16 L54,20 L2,20 Z" fill="#F5F7FA" />
        <Path d="M12,8 L17,3 Q18,2 20,2 L38,2 Q40,2 41,3 L46,8 Z" fill="#F5F7FA" stroke="#CFD4DE" strokeWidth="0.4" />
        <Path d="M14.5,7.5 L18.5,3.5 Q19,3 20,3 L28,3 L28,7.5 Z" fill="#3A4A66" />
        <Path d="M30,3 L37.5,3 Q38.5,3 39,3.5 L43,7.5 L30,7.5 Z" fill="#3A4A66" />
        <Rect x="4" y="11" width="6" height="4" fill="#1F4FA8" />
        <Rect x="16" y="11" width="6" height="4" fill="#1F4FA8" />
        <Rect x="28" y="11" width="6" height="4" fill="#1F4FA8" />
        <Rect x="40" y="11" width="6" height="4" fill="#1F4FA8" />
        <Rect x="50" y="11" width="4" height="4" fill="#1F4FA8" />
        <Rect x="4" y="15" width="6" height="5" fill="#F2D33A" />
        <Rect x="16" y="15" width="6" height="5" fill="#F2D33A" />
        <Rect x="28" y="15" width="6" height="5" fill="#F2D33A" />
        <Rect x="40" y="15" width="6" height="5" fill="#F2D33A" />
        <Rect x="50" y="15" width="4" height="5" fill="#F2D33A" />
        <Rect x="20" y="0" width="18" height="2.2" rx="0.5" fill="#0E1B33" />
        <Rect x="21" y="0.4" width="7" height="1.6" rx="0.3" fill="#2F7FD9" />
        <Rect x="30" y="0.4" width="7" height="1.6" rx="0.3" fill="#2F7FD9" />
        <Circle cx="13" cy="20" r="3.5" fill="#1A1F2A" />
        <Circle cx="13" cy="20" r="1.4" fill="#5B6577" />
        <Circle cx="43" cy="20" r="3.5" fill="#1A1F2A" />
        <Circle cx="43" cy="20" r="1.4" fill="#5B6577" />
        <Rect x="52" y="14" width="2" height="2.5" fill="#FFE9A8" />
        </G>
      </Svg>
    </View>
  );
}
