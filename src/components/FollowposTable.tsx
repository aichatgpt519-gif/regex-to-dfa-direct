import { motion } from 'framer-motion';
import { SyntaxTreeNode, getPositionSymbolMap } from '@/algorithms/syntaxTreeBuilder';

interface FollowposTableProps {
  followpos: Map<number, Set<number>>;
  root: SyntaxTreeNode;
}

function setToStr(s: Set<number>): string {
  return `{${[...s].sort((a, b) => a - b).join(', ')}}`;
}

export default function FollowposTable({ followpos, root }: FollowposTableProps) {
  const posSymMap = getPositionSymbolMap(root);
  const positions = [...followpos.keys()].sort((a, b) => a - b);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel-card"
    >
      <div className="panel-header">Followpos Table</div>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Position</th>
                <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Symbol</th>
                <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Followpos</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <motion.tr
                  key={pos}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-2 px-3 font-mono font-bold text-primary">{pos}</td>
                  <td className="py-2 px-3 font-mono">{posSymMap.get(pos) || ''}</td>
                  <td className="py-2 px-3 font-mono text-xs">
                    {setToStr(followpos.get(pos) || new Set())}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
