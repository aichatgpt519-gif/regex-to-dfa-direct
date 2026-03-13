import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  ConnectionLineType,
  MarkerType,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { DFAResult } from '@/algorithms/dfaBuilder';
import { motion } from 'framer-motion';

const NODE_SIZE = 60;

function buildDFAFlowElements(dfa: DFAResult): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = dfa.states.map(state => ({
    id: state.name,
    data: {
      label: (
        <div className="flex items-center justify-center font-mono font-bold text-sm" style={{ color: '#fff' }}>
          {state.name}
        </div>
      ),
    },
    position: { x: 0, y: 0 },
    style: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: state.isAccepting
        ? 'hsl(168, 70%, 42%)'
        : 'hsl(230, 80%, 56%)',
      border: state.isAccepting
        ? '4px double hsla(0,0%,100%,0.8)'
        : '2px solid hsla(0,0%,100%,0.3)',
      boxShadow: state.name === dfa.startState
        ? '0 0 0 3px hsl(38, 92%, 50%)'
        : '0 2px 8px rgba(0,0,0,0.15)',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  // Group transitions by from-to pair
  const transMap = new Map<string, string[]>();
  dfa.transitions.forEach(t => {
    const key = `${t.from}->${t.to}`;
    if (!transMap.has(key)) transMap.set(key, []);
    transMap.get(key)!.push(t.symbol);
  });

  const edges: Edge[] = [];
  transMap.forEach((symbols, key) => {
    const [from, to] = key.split('->');
    const isSelf = from === to;
    edges.push({
      id: `e-${key}`,
      source: from,
      target: to,
      label: symbols.join(', '),
      type: isSelf ? 'default' : 'smoothstep',
      style: { stroke: 'hsl(220, 14%, 55%)', strokeWidth: 2 },
      labelStyle: {
        fill: 'hsl(220, 25%, 10%)',
        fontWeight: 600,
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      labelBgStyle: {
        fill: 'hsl(0, 0%, 100%)',
        fillOpacity: 0.9,
      },
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'hsl(220, 14%, 55%)',
      },
    });
  });

  return { nodes, edges };
}

function layoutDFA(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 });

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_SIZE + 40, height: NODE_SIZE + 40 });
  });
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map(node => {
    const n = g.node(node.id);
    return {
      ...node,
      position: { x: n.x - NODE_SIZE / 2, y: n.y - NODE_SIZE / 2 },
    };
  });
}

interface DFAGraphProps {
  dfa: DFAResult;
  graphRef?: React.RefObject<HTMLDivElement>;
}

export default function DFAGraph({ dfa, graphRef }: DFAGraphProps) {
  const { nodes: rawNodes, edges } = useMemo(() => buildDFAFlowElements(dfa), [dfa]);
  const nodes = useMemo(() => layoutDFA(rawNodes, edges), [rawNodes, edges]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel-card"
    >
      <div className="panel-header flex items-center justify-between">
        <span>DFA State Diagram</span>
        <div className="flex gap-3 text-[10px] font-normal normal-case tracking-normal">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'hsl(230, 80%, 56%)' }} />
            Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'hsl(168, 70%, 42%)', border: '2px double white' }} />
            Accepting
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'hsl(230, 80%, 56%)', boxShadow: '0 0 0 2px hsl(38, 92%, 50%)' }} />
            Start
          </span>
        </div>
      </div>
      <div ref={graphRef} className="h-[350px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(220, 14%, 85%)" />
        </ReactFlow>
      </div>
    </motion.div>
  );
}
