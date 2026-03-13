import { SyntaxTreeNode } from './syntaxTreeBuilder';

// Compute nullable, firstpos, lastpos for all nodes (bottom-up)
export function computeNullable(node: SyntaxTreeNode): void {
  if (node.left) computeNullable(node.left);
  if (node.right) computeNullable(node.right);
  if (node.child) computeNullable(node.child);

  switch (node.type) {
    case 'leaf':
      node.nullable = node.symbol === 'ε';
      break;
    case 'union':
      node.nullable = (node.left?.nullable || false) || (node.right?.nullable || false);
      break;
    case 'concat':
      node.nullable = (node.left?.nullable || false) && (node.right?.nullable || false);
      break;
    case 'star':
      node.nullable = true;
      break;
  }
}

export function computeFirstpos(node: SyntaxTreeNode): void {
  if (node.left) computeFirstpos(node.left);
  if (node.right) computeFirstpos(node.right);
  if (node.child) computeFirstpos(node.child);

  node.firstpos = new Set();

  switch (node.type) {
    case 'leaf':
      if (node.position !== undefined) {
        node.firstpos.add(node.position);
      }
      break;
    case 'union':
      if (node.left) node.left.firstpos.forEach(p => node.firstpos.add(p));
      if (node.right) node.right.firstpos.forEach(p => node.firstpos.add(p));
      break;
    case 'concat':
      if (node.left?.nullable) {
        if (node.left) node.left.firstpos.forEach(p => node.firstpos.add(p));
        if (node.right) node.right.firstpos.forEach(p => node.firstpos.add(p));
      } else {
        if (node.left) node.left.firstpos.forEach(p => node.firstpos.add(p));
      }
      break;
    case 'star':
      if (node.child) node.child.firstpos.forEach(p => node.firstpos.add(p));
      break;
  }
}

export function computeLastpos(node: SyntaxTreeNode): void {
  if (node.left) computeLastpos(node.left);
  if (node.right) computeLastpos(node.right);
  if (node.child) computeLastpos(node.child);

  node.lastpos = new Set();

  switch (node.type) {
    case 'leaf':
      if (node.position !== undefined) {
        node.lastpos.add(node.position);
      }
      break;
    case 'union':
      if (node.left) node.left.lastpos.forEach(p => node.lastpos.add(p));
      if (node.right) node.right.lastpos.forEach(p => node.lastpos.add(p));
      break;
    case 'concat':
      if (node.right?.nullable) {
        if (node.left) node.left.lastpos.forEach(p => node.lastpos.add(p));
        if (node.right) node.right.lastpos.forEach(p => node.lastpos.add(p));
      } else {
        if (node.right) node.right.lastpos.forEach(p => node.lastpos.add(p));
      }
      break;
    case 'star':
      if (node.child) node.child.lastpos.forEach(p => node.lastpos.add(p));
      break;
  }
}

export function computeFollowpos(node: SyntaxTreeNode): Map<number, Set<number>> {
  const followpos = new Map<number, Set<number>>();

  // Initialize followpos for all positions
  function initPositions(n: SyntaxTreeNode) {
    if (n.type === 'leaf' && n.position !== undefined) {
      followpos.set(n.position, new Set());
    }
    if (n.left) initPositions(n.left);
    if (n.right) initPositions(n.right);
    if (n.child) initPositions(n.child);
  }
  initPositions(node);

  function traverse(n: SyntaxTreeNode) {
    // Rule 1: For concat node n = c1·c2
    if (n.type === 'concat' && n.left && n.right) {
      for (const i of n.left.lastpos) {
        const fp = followpos.get(i);
        if (fp) {
          for (const j of n.right.firstpos) {
            fp.add(j);
          }
        }
      }
    }

    // Rule 2: For star node n = c*
    if (n.type === 'star' && n.child) {
      for (const i of n.lastpos) {
        const fp = followpos.get(i);
        if (fp) {
          for (const j of n.firstpos) {
            fp.add(j);
          }
        }
      }
    }

    if (n.left) traverse(n.left);
    if (n.right) traverse(n.right);
    if (n.child) traverse(n.child);
  }

  traverse(node);
  return followpos;
}

export function computeAll(node: SyntaxTreeNode) {
  computeNullable(node);
  computeFirstpos(node);
  computeLastpos(node);
  const followpos = computeFollowpos(node);
  return { followpos };
}
