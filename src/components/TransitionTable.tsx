import { motion } from 'framer-motion';
import { DFAResult } from '@/algorithms/dfaBuilder';

interface TransitionTableProps {
  dfa: DFAResult;
}

function setToStr(s: Set<number>): string {
  return `{${[...s].sort((a, b) => a - b).join(',')}}`;
}

export default function TransitionTable({ dfa }: TransitionTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel-card"
    >
      <div className="panel-header">DFA Transition Table</div>
      <div className="p-4">
        {/* State definitions */}
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-2">State Definitions</p>
          {dfa.states.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono ${
                s.isAccepting ? 'bg-accent/10 border border-accent/30' : 'bg-muted/50'
              }`}
            >
              <span className="font-bold text-primary">{s.name}</span>
              <span className="text-muted-foreground">=</span>
              <span>{setToStr(s.positions)}</span>
              {s.isAccepting && (
                <span className="ml-auto text-[10px] font-semibold text-accent uppercase tracking-wider">
                  accepting
                </span>
              )}
              {s.name === dfa.startState && (
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  start
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Transition table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-3 text-left font-semibold text-muted-foreground">State</th>
                {dfa.alphabet.map(a => (
                  <th key={a} className="py-2 px-3 text-center font-semibold text-muted-foreground font-mono">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dfa.states.map((state, i) => (
                <motion.tr
                  key={state.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border-b last:border-b-0 ${
                    state.isAccepting ? 'bg-accent/5' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-mono font-bold text-primary">
                    {state.isAccepting ? `*${state.name}` : state.name}
                    {state.name === dfa.startState ? ' →' : ''}
                  </td>
                  {dfa.alphabet.map(a => {
                    const t = dfa.transitions.find(
                      tr => tr.from === state.name && tr.symbol === a
                    );
                    return (
                      <td key={a} className="py-2 px-3 text-center font-mono">
                        {t ? t.to : '—'}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
