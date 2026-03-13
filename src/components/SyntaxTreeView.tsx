import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { SyntaxTreeNode } from '@/algorithms/syntaxTreeBuilder';
import { motion } from 'framer-motion';

function setToStr(s: Set<number>): string {
  return `{${[...s].sort((a, b) => a - b).join(',')}}`;
}

interface SyntaxTreeViewProps {
  root: SyntaxTreeNode;
  showNullable?: boolean;
  showFirstpos?: boolean;
  showLastpos?: boolean;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 90;

function buildFlowElements(
  root: SyntaxTreeNode,
  showNullable: boolean,
  showFirstpos: boolean,
  showLastpos: boolean
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function traverse(node: SyntaxTreeNode, parentId?: string) {
    let label = node.symbol || '';
    if (node.type === 'leaf' && node.position !== undefined) {
      label = `${node.symbol} (${node.position})`;
    }

    let sublabel = '';
    const parts: string[] = [];
    if (showNullable) parts.push(`n: ${node.nullable}`);
    if (showFirstpos) parts.push(`fp: ${setToStr(node.firstpos)}`);
    if (showLastpos) parts.push(`lp: ${setToStr(node.lastpos)}`);
    sublabel = parts.join(' | ');

    const bgColor =
      node.type === 'leaf'
        ? 'hsl(168, 70%, 42%)'
        : node.type === 'concat'
        ? 'hsl(230, 80%, 56%)'
        : node.type === 'union'
        ? 'hsl(280, 70%, 56%)'
        : 'hsl(38, 92%, 50%)';

    nodes.push({
      id: node.id,
      data: {
        label: (
          <div className="text-center">
            <div className="font-bold text-sm" style={{ color: '#fff' }}>{label}</div>
            {sublabel && (
              <div className="text-[10px] mt-0.5 opacity-90" style={{ color: 'hsla(0,0%,100%,0.85)' }}>
                {sublabel}
              </div>
            )}
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: bgColor,
        border: node.nullable && showNullable ? '3px solid hsl(152, 60%, 42%)' : '2px solid hsla(0,0%,100%,0.2)',
        borderRadius: '12px',
        padding: '8px 12px',
        minWidth: `${NODE_WIDTH}px`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: 'hsl(220, 14%, 70%)', strokeWidth: 2 },
      });
    }

    if (node.left) traverse(node.left, node.id);
    if (node.right) traverse(node.right, node.id);
    if (node.child) traverse(node.child, node.id);
  }

  traverse(root);
  return { nodes, edges };
}

function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map(node => {
    const n = g.node(node.id);
    return {
      ...node,
      position: {
        x: n.x - NODE_WIDTH / 2,
        y: n.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export default function SyntaxTreeView({
  root,
  showNullable = false,
  showFirstpos = false,
  showLastpos = false,
}: SyntaxTreeViewProps) {
  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildFlowElements(root, showNullable, showFirstpos, showLastpos),
    [root, showNullable, showFirstpos, showLastpos]
  );

  const layoutedNodes = useMemo(() => layoutWithDagre(rawNodes, rawEdges), [rawNodes, rawEdges]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full h-[450px] rounded-xl border bg-card overflow-hidden"
    >
      <ReactFlow
        nodes={layoutedNodes}
        edges={rawEdges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(220, 14%, 85%)" />
      </ReactFlow>
    </motion.div>
  );
}
