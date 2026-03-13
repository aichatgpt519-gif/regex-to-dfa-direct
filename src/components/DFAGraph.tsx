import { useMemo } from 'react';
import { DFAResult } from '@/algorithms/dfaBuilder';
import { motion } from 'framer-motion';

const R = 28; // node radius
const SELF_LOOP_R = 18;
const ARROW_SIZE = 8;
const H_GAP = 140;
const V_CENTER = 160;
const START_ARROW_LEN = 36;
const PAD_LEFT = 70;

interface Vec { x: number; y: number }

function normalize(v: Vec, len = 1): Vec {
  const m = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
  return { x: (v.x / m) * len, y: (v.y / m) * len };
}

function arrowHead(tip: Vec, dir: Vec): string {
  const d = normalize(dir, ARROW_SIZE);
  const perp = { x: -d.y * 0.5, y: d.x * 0.5 };
  const p1 = { x: tip.x - d.x + perp.x, y: tip.y - d.y + perp.y };
  const p2 = { x: tip.x - d.x - perp.x, y: tip.y - d.y - perp.y };
  return `M${tip.x},${tip.y} L${p1.x},${p1.y} L${p2.x},${p2.y} Z`;
}

export default function DFAGraph({ dfa, graphRef }: { dfa: DFAResult; graphRef?: React.RefObject<HTMLDivElement> }) {
  const layout = useMemo(() => {
    // Position states in a row (LR). Use dagre-like simple row layout.
    const statePos = new Map<string, Vec>();
    const ordered = [...dfa.states];

    // BFS from start to order states logically
    const visited = new Set<string>();
    const queue = [dfa.startState];
    const order: string[] = [];
    visited.add(dfa.startState);
    while (queue.length > 0) {
      const s = queue.shift()!;
      order.push(s);
      // find transitions from s, add unvisited targets
      for (const t of dfa.transitions) {
        if (t.from === s && !visited.has(t.to)) {
          visited.add(t.to);
          queue.push(t.to);
        }
      }
    }
    // Add any remaining states not reachable
    for (const s of ordered) {
      if (!visited.has(s.name)) order.push(s.name);
    }

    order.forEach((name, i) => {
      statePos.set(name, { x: PAD_LEFT + i * H_GAP, y: V_CENTER });
    });

    return { statePos, order };
  }, [dfa]);

  const { statePos, order } = layout;

  // Group transitions by from→to
  const transMap = new Map<string, string[]>();
  dfa.transitions.forEach(t => {
    const key = `${t.from}->${t.to}`;
    if (!transMap.has(key)) transMap.set(key, []);
    transMap.get(key)!.push(t.symbol);
  });

  const svgW = PAD_LEFT + order.length * H_GAP + 40;
  const svgH = V_CENTER * 2 + 20;

  // Determine which edges go above/below to avoid overlap
  const edgeEntries = [...transMap.entries()];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel-card"
    >
      <div className="panel-header flex items-center justify-between">
        <span>DFA State Diagram</span>
        <div className="flex gap-4 text-[11px] font-normal normal-case tracking-normal">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14"><polygon points="0,7 10,2 10,12" fill="hsl(220,70%,50%)" /></svg>
            Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full inline-block border-2" style={{ borderColor: 'hsl(220,70%,50%)' }} />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block border-2" style={{
              borderColor: 'hsl(220,70%,50%)',
              boxShadow: '0 0 0 2px hsl(220,70%,50%)',
            }} />
            Accepting
          </span>
        </div>
      </div>

      <div ref={graphRef} className="overflow-x-auto bg-white" style={{ minHeight: svgH }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto block">
          {/* Start arrow */}
          {(() => {
            const startPos = statePos.get(dfa.startState)!;
            const tipX = startPos.x - R;
            const tailX = tipX - START_ARROW_LEN;
            return (
              <g>
                <line x1={tailX} y1={startPos.y} x2={tipX} y2={startPos.y}
                  stroke="hsl(220,70%,50%)" strokeWidth="2" />
                <path d={arrowHead({ x: tipX, y: startPos.y }, { x: 1, y: 0 })}
                  fill="hsl(220,70%,50%)" />
              </g>
            );
          })()}

          {/* Edges */}
          {edgeEntries.map(([key, symbols]) => {
            const [from, to] = key.split('->');
            const pFrom = statePos.get(from)!;
            const pTo = statePos.get(to)!;
            const label = symbols.join(', ');

            if (from === to) {
              // Self-loop (draw above)
              const cx = pFrom.x;
              const cy = pFrom.y - R - SELF_LOOP_R - 2;
              const enterAngle = Math.PI * 0.75;
              const exitAngle = Math.PI * 0.25;
              const startX = cx + SELF_LOOP_R * Math.cos(enterAngle + Math.PI);
              const startY = cy + SELF_LOOP_R * Math.sin(enterAngle + Math.PI);

              // Arc from top-left of node to top-right
              const loopStartX = pFrom.x - R * 0.5;
              const loopStartY = pFrom.y - R * 0.85;
              const loopEndX = pFrom.x + R * 0.5;
              const loopEndY = pFrom.y - R * 0.85;
              const loopTopY = pFrom.y - R - SELF_LOOP_R * 2 - 6;

              const path = `M${loopStartX},${loopStartY} C${loopStartX - 12},${loopTopY} ${loopEndX + 12},${loopTopY} ${loopEndX},${loopEndY}`;

              // Arrow direction at end
              const dir = { x: -0.5, y: 0.85 };

              return (
                <g key={key}>
                  <path d={path} fill="none" stroke="hsl(220,70%,50%)" strokeWidth="2" />
                  <path d={arrowHead({ x: loopEndX, y: loopEndY }, dir)} fill="hsl(220,70%,50%)" />
                  <text x={pFrom.x} y={loopTopY + 2}
                    textAnchor="middle" dominantBaseline="middle"
                    className="text-xs font-bold font-mono" fill="hsl(220,70%,50%)"
                  >{label}</text>
                </g>
              );
            }

            // Check for reverse edge
            const reverseKey = `${to}->${from}`;
            const hasReverse = transMap.has(reverseKey);
            const fromIdx = order.indexOf(from);
            const toIdx = order.indexOf(to);
            const isForward = fromIdx < toIdx;
            const dist = Math.abs(toIdx - fromIdx);

            // Determine curve direction
            // For adjacent forward edges: straight
            // For back-edges or long jumps: curve above or below
            let curveDir = 0; // 0 = straight, -1 = above, 1 = below

            if (dist > 1) {
              // Long edge: curve above for forward, below for backward
              curveDir = isForward ? -1 : 1;
            } else if (hasReverse) {
              // Bidirectional adjacent: one above, one below
              curveDir = isForward ? -1 : 1;
            }

            const dx = pTo.x - pFrom.x;
            const dy = pTo.y - pFrom.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len;
            const uy = dy / len;

            if (curveDir === 0) {
              // Straight line
              const sx = pFrom.x + ux * R;
              const sy = pFrom.y + uy * R;
              const ex = pTo.x - ux * R;
              const ey = pTo.y - uy * R;

              return (
                <g key={key}>
                  <line x1={sx} y1={sy} x2={ex} y2={ey}
                    stroke="hsl(220,70%,50%)" strokeWidth="2" />
                  <path d={arrowHead({ x: ex, y: ey }, { x: ux, y: uy })} fill="hsl(220,70%,50%)" />
                  <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 10}
                    textAnchor="middle" dominantBaseline="middle"
                    className="text-xs font-bold font-mono" fill="hsl(220,70%,50%)"
                  >{label}</text>
                </g>
              );
            }

            // Curved edge
            const curveMag = Math.min(60, 30 + dist * 15) * curveDir;
            const midX = (pFrom.x + pTo.x) / 2;
            const midY = (pFrom.y + pTo.y) / 2 + curveMag;

            // Start/end on circle boundary toward control point
            const ctrlFromDx = midX - pFrom.x;
            const ctrlFromDy = midY - pFrom.y;
            const ctrlFromLen = Math.sqrt(ctrlFromDx * ctrlFromDx + ctrlFromDy * ctrlFromDy);
            const sx = pFrom.x + (ctrlFromDx / ctrlFromLen) * R;
            const sy = pFrom.y + (ctrlFromDy / ctrlFromLen) * R;

            const ctrlToDx = midX - pTo.x;
            const ctrlToDy = midY - pTo.y;
            const ctrlToLen = Math.sqrt(ctrlToDx * ctrlToDx + ctrlToDy * ctrlToDy);
            const ex = pTo.x + (ctrlToDx / ctrlToLen) * R;
            const ey = pTo.y + (ctrlToDy / ctrlToLen) * R;

            // Arrow direction at endpoint
            const arrDir = { x: pTo.x - midX, y: pTo.y - midY };

            const path = `M${sx},${sy} Q${midX},${midY} ${ex},${ey}`;

            // Label position
            const labelX = midX;
            const labelY = midY + (curveDir < 0 ? -8 : 14);

            return (
              <g key={key}>
                <path d={path} fill="none" stroke="hsl(220,70%,50%)" strokeWidth="2" />
                <path d={arrowHead({ x: ex, y: ey }, arrDir)} fill="hsl(220,70%,50%)" />
                <text x={labelX} y={labelY}
                  textAnchor="middle" dominantBaseline="middle"
                  className="text-xs font-bold font-mono" fill="hsl(220,70%,50%)"
                >{label}</text>
              </g>
            );
          })}

          {/* State circles */}
          {dfa.states.map(state => {
            const pos = statePos.get(state.name)!;
            return (
              <g key={state.name}>
                {/* Outer circle for accepting */}
                {state.isAccepting && (
                  <circle cx={pos.x} cy={pos.y} r={R + 5}
                    fill="none" stroke="hsl(220,70%,50%)" strokeWidth="2" />
                )}
                <circle cx={pos.x} cy={pos.y} r={R}
                  fill="white" stroke="hsl(220,70%,50%)" strokeWidth="2" />
                <text x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="central"
                  className="text-base font-bold font-mono" fill="hsl(220,70%,50%)"
                >{state.name}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* State definitions */}
      <div className="p-3 border-t text-xs font-mono space-y-1">
        <p className="text-muted-foreground font-sans text-[11px] font-semibold mb-1.5">State Definitions</p>
        {dfa.states.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="font-bold" style={{ color: 'hsl(220,70%,50%)' }}>{s.name}</span>
            <span className="text-muted-foreground">=</span>
            <span>{`{${[...s.positions].sort((a, b) => a - b).join(', ')}}`}</span>
            {s.isAccepting && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-sans">accepting</span>}
            {s.name === dfa.startState && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-sans">start</span>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
