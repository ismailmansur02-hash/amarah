import type { ExamBoard, Level } from "./types";

/**
 * Routing on exam board is a deliberate differentiator: no on-demand competitor
 * does it, and an Edexcel Further Maths student wants a tutor who sat Edexcel
 * Further Maths. Topics are the real spec topics students search for.
 */

export const EXAM_BOARDS: ExamBoard[] = [
  "AQA",
  "Edexcel",
  "OCR",
  "WJEC/Eduqas",
  "Not sure",
];

export interface Subject {
  id: string;
  name: string;
  icon: string;
  levels: Level[];
  topics: Record<string, string[]>;
}

export const SUBJECTS: Subject[] = [
  {
    id: "maths",
    name: "Maths",
    icon: "∑",
    levels: ["GCSE", "A-level"],
    topics: {
      GCSE: [
        "Algebra and equations",
        "Quadratics",
        "Simultaneous equations",
        "Trigonometry",
        "Circle theorems",
        "Probability",
        "Vectors",
        "Surds and indices",
        "Graphs and transformations",
        "Ratio and proportion",
      ],
      "A-level": [
        "Differentiation",
        "Integration",
        "Integration by parts",
        "Binomial expansion",
        "Trigonometric identities",
        "Logs and exponentials",
        "Vectors",
        "Sequences and series",
        "Hypothesis testing",
        "Mechanics: forces and motion",
      ],
    },
  },
  {
    id: "physics",
    name: "Physics",
    icon: "⚛",
    levels: ["GCSE", "A-level"],
    topics: {
      GCSE: [
        "Forces and motion",
        "Energy transfers",
        "Electricity circuits",
        "Waves",
        "Radioactivity",
        "Magnetism",
        "Particle model",
      ],
      "A-level": [
        "Mechanics",
        "Materials",
        "Waves and optics",
        "Electric fields",
        "Capacitance",
        "Nuclear physics",
        "Thermal physics",
        "Required practicals",
      ],
    },
  },
  {
    id: "chemistry",
    name: "Chemistry",
    icon: "⚗",
    levels: ["GCSE", "A-level"],
    topics: {
      GCSE: [
        "Atomic structure",
        "Bonding",
        "Moles and calculations",
        "Rates of reaction",
        "Electrolysis",
        "Organic chemistry",
        "Required practicals",
      ],
      "A-level": [
        "Amount of substance",
        "Bonding and structure",
        "Equilibria",
        "Organic mechanisms",
        "Redox and electrochemistry",
        "Kinetics",
        "Spectroscopy and NMR",
        "Transition metals",
      ],
    },
  },
  {
    id: "biology",
    name: "Biology",
    icon: "🧬",
    levels: ["GCSE", "A-level"],
    topics: {
      GCSE: [
        "Cell biology",
        "Enzymes and digestion",
        "Photosynthesis",
        "Respiration",
        "Homeostasis",
        "Inheritance and genetics",
        "Ecology",
      ],
      "A-level": [
        "Biological molecules",
        "Cells and transport",
        "Gas exchange and mass transport",
        "Genetics and inheritance",
        "Energy transfer: photosynthesis",
        "Energy transfer: respiration",
        "Nervous coordination",
        "Gene expression",
      ],
    },
  },
];

export function subjectById(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function topicsFor(subjectId: string, level: Level): string[] {
  return subjectById(subjectId)?.topics[level] ?? [];
}
