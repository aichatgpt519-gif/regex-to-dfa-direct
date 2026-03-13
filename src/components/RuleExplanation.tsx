import { motion } from 'framer-motion';

interface RuleExplanationProps {
  step: number;
}

const explanations: Record<number, { title: string; rules: string[] }> = {
  1: {
    title: 'Augmenting the Regular Expression',
    rules: [
      'Append the end marker # to the regex: r → (r)#',
      'The # symbol marks the accepting position in the DFA',
      'The augmented expression is then parsed into a syntax tree',
    ],
  },
  2: {
    title: 'Syntax Tree Construction',
    rules: [
      'Leaf nodes represent symbols with position numbers',
      'Internal nodes: · (concat), | (union), * (Kleene star)',
      'Positions are numbered left to right for leaf nodes',
      'Color code: 🟢 Leaf, 🔵 Concat, 🟣 Union, 🟡 Star',
    ],
  },
  3: {
    title: 'Nullable Computation Rules',
    rules: [
      'leaf(i) → false (ε → true)',
      'c₁ | c₂ → nullable(c₁) OR nullable(c₂)',
      'c₁ · c₂ → nullable(c₁) AND nullable(c₂)',
      'c* → true (always nullable)',
    ],
  },
  4: {
    title: 'Firstpos Computation Rules',
    rules: [
      'leaf(i) → {i}',
      'c₁ | c₂ → firstpos(c₁) ∪ firstpos(c₂)',
      'c* → firstpos(c)',
      'c₁ · c₂ → if nullable(c₁): firstpos(c₁) ∪ firstpos(c₂), else: firstpos(c₁)',
    ],
  },
  5: {
    title: 'Lastpos Computation Rules',
    rules: [
      'leaf(i) → {i}',
      'c₁ | c₂ → lastpos(c₁) ∪ lastpos(c₂)',
      'c* → lastpos(c)',
      'c₁ · c₂ → if nullable(c₂): lastpos(c₁) ∪ lastpos(c₂), else: lastpos(c₂)',
    ],
  },
  6: {
    title: 'Followpos Computation Rules',
    rules: [
      'Rule 1 (Concat c₁·c₂): ∀i ∈ lastpos(c₁), add firstpos(c₂) to followpos(i)',
      'Rule 2 (Star c*): ∀i ∈ lastpos(c), add firstpos(c) to followpos(i)',
      'Followpos tells us which positions can follow position i in any string',
    ],
  },
  7: {
    title: 'DFA Construction Algorithm',
    rules: [
      'Start state = firstpos(root)',
      'For each unmarked state S and each input symbol a:',
      '  U = ∪ followpos(p) for all p ∈ S where symbol(p) = a',
      '  If U is new, add it as a new state',
      'Accepting states contain the position of #',
    ],
  },
};

export default function RuleExplanation({ step }: RuleExplanationProps) {
  const info = explanations[step];
  if (!info) return null;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel-card"
    >
      <div className="panel-header">{info.title}</div>
      <div className="p-4">
        <ul className="space-y-2">
          {info.rules.map((rule, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 text-sm"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="font-mono text-xs leading-relaxed">{rule}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
