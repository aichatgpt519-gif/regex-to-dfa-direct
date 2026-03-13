import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  ConnectionLineType,
  MarkerType,
  Background,
  BackgroundVariant,
  Handle,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { DFAResult } from '@/algorithms/dfaBuilder';
import { motion } from 'framer-motion';

const NODE_SIZE = 56;

/* ── Custom node with double-circle for accepting ── */
function DFANode({ data }: NodeProps) {
  const { label, isAccepting, isStart } = data;
  return (
    <div className="relative flex items-center justify-center" style={{ width: NODE_SIZE, height: NODE_SIZE }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {/* Start arrow */}
      {isStart && (
        <svg
          className="absolute"
          style={{ left: -30, top: '50%', transform: 'translateY(-50%)' }}
          width="28" height="16" viewBox="0 0 28 16"
        >
          <polygon points="0,8 16,0 16,16" fill="hsl(38,92%,50%)" />
          <line x1="16" y1="8" x2="28" y2="8" stroke="hsl(38,92%,50%)" strokeWidth="2" />
        </svg>
      )}

      {/* Outer circle (double ring for accepting) */}
      <svg width={NODE_SIZE} height={NODE_SIZE} className="absolute inset-0">
        {isAccepting && (
          <circle
            cx={NODE_SIZE / 2} cy={NODE_SIZE / 2} r={NODE_SIZE / 2 - 2}
            fill="none" stroke="hsl(168,70%,42%)" strokeWidth="2"
          />
        )}
        <circle
          cx={NODE_SIZE / 2} cy={NODE_SIZE / 2}
          r={isAccepting ? NODE_SIZE / 2 - 8 : NODE_SIZE / 2 - 2}
          fill={isAccepting ? 'hsl(168,70%,42%)' : 'hsl(230,80%,56%)'}
          stroke={isAccepting ? 'hsl(168,70%,42%)' : 'hsl(230,70%,48%)'}
          strokeWidth="2"
        />
      </svg>

      {/* Label */}
      <span
        className="relative z-10 font-mono font-bold select-none"
        style={{ fontSize: 15, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {label}
      </span>
    </div>
  );
}

const nodeTypes = { dfaNode: DFANode };

function buildElements(dfa: DFAResult): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = dfa.states.map(state => ({
    id: state.name,
    type: 'dfaNode',
    data: {
      label: state.name,
      isAccepting: state.isAccepting,
      isStart: state.name === dfa.startState,
    },
    position: { x: 0, y: 0 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: NODE_SIZE, height: NODE_SIZE },
  }));

  // Group transitions by from→to
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
    // Check if reverse edge exists for curve handling
    const reverseKey = `${to}->${from}`;
    const hasBidirectional = transMap.has(reverseKey) && from !== to;

    edges.push({
      id: `e-${key}`,
      source: from,
      target: to,
      label: symbols.join(', '),
      type: isSelf ? 'default' : 'smoothstep',
      animated: false,
      style: {
        stroke: isSelf ? 'hsl(280,60%,55%)' : 'hsl(220,20%,45%)',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: 'hsl(220,25%,15%)',
        fontWeight: 700,
        fontSize: 13,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      },
      labelBgStyle: {
        fill: 'hsl(0,0%,97%)',
        fillOpacity: 0.95,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 6,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isSelf ? 'hsl(280,60%,55%)' : 'hsl(220,20%,45%)',
        width: 18,
        height: 18,
      },
      ...(hasBidirectional && from < to ? { sourceHandle: 'top', targetHandle: 'top' } : {}),
    });
  });

  return { nodes, edges };
}

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 160, marginx: 40, marginy: 40 });

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_SIZE + 60, height: NODE_SIZE + 60 });
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
  const { nodes: rawNodes, edges } = useMemo(() => buildElements(dfa), [dfa]);
  const nodes = useMemo(() => layoutNodes(rawNodes, edges), [rawNodes, edges]);

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
            <svg width="14" height="14"><polygon points="0,7 10,2 10,12" fill="hsl(38,92%,50%)" /></svg>
            Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: 'hsl(230,80%,56%)' }} />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full inline-block" style={{
              background: 'hsl(168,70%,42%)',
              boxShadow: '0 0 0 2px hsl(0,0%,100%), 0 0 0 4px hsl(168,70%,42%)',
            }} />
            Accepting
          </span>
        </div>
      </div>
      <div ref={graphRef} className="h-[400px] bg-gradient-to-br from-slate-50 to-white">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(220,14%,88%)" />
        </ReactFlow>
      </div>

      {/* State definitions */}
      <div className="p-3 border-t text-xs font-mono space-y-1">
        <p className="text-muted-foreground font-sans text-[11px] font-semibold mb-1.5">State Definitions</p>
        {dfa.states.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="font-bold" style={{ color: s.isAccepting ? 'hsl(168,70%,35%)' : 'hsl(230,80%,50%)' }}>
              {s.name}
            </span>
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
