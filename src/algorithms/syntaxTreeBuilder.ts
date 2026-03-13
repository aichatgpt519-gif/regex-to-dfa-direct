// Syntax tree node types
export type NodeType = 'leaf' | 'concat' | 'union' | 'star';

export interface SyntaxTreeNode {
  id: string;
  type: NodeType;
  symbol?: string;
  position?: number; // only for leaf nodes
  left?: SyntaxTreeNode;
  right?: SyntaxTreeNode;
  child?: SyntaxTreeNode; // for star
  nullable: boolean;
  firstpos: Set<number>;
  lastpos: Set<number>;
}

let positionCounter = 0;
let nodeIdCounter = 0;

function newId(): string {
  return `node_${nodeIdCounter++}`;
}

// Tokenizer
type Token =
  | { type: 'char'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'union' }
  | { type: 'star' }
  | { type: 'plus' }
  | { type: 'question' };

function tokenize(regex: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < regex.length) {
    const c = regex[i];
    if (c === '(') tokens.push({ type: 'lparen' });
    else if (c === ')') tokens.push({ type: 'rparen' });
    else if (c === '|') tokens.push({ type: 'union' });
    else if (c === '*') tokens.push({ type: 'star' });
    else if (c === '+') tokens.push({ type: 'plus' });
    else if (c === '?') tokens.push({ type: 'question' });
    else if (c === '\\' && i + 1 < regex.length) {
      i++;
      tokens.push({ type: 'char', value: regex[i] });
    } else {
      tokens.push({ type: 'char', value: c });
    }
    i++;
  }
  return tokens;
}

// Insert explicit concatenation operators
function insertConcat(tokens: Token[]): Token[] {
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);
    if (i + 1 < tokens.length) {
      const curr = tokens[i];
      const next = tokens[i + 1];
      const currCanEnd =
        curr.type === 'char' ||
        curr.type === 'rparen' ||
        curr.type === 'star' ||
        curr.type === 'plus' ||
        curr.type === 'question';
      const nextCanStart =
        next.type === 'char' || next.type === 'lparen';
      if (currCanEnd && nextCanStart) {
        result.push({ type: 'char', value: '·' }); // use as concat marker, will be handled in parser
      }
    }
  }
  return result;
}

// Recursive descent parser
// Grammar:
// expr -> term ('|' term)*
// term -> factor factor*
// factor -> base ('*' | '+' | '?')*
// base -> char | '(' expr ')'

class Parser {
  tokens: Token[];
  pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  consume(): Token {
    return this.tokens[this.pos++];
  }

  parse(): SyntaxTreeNode {
    const node = this.expr();
    return node;
  }

  expr(): SyntaxTreeNode {
    let node = this.term();
    while (this.peek()?.type === 'union') {
      this.consume(); // eat '|'
      const right = this.term();
      const unionNode: SyntaxTreeNode = {
        id: newId(),
        type: 'union',
        symbol: '|',
        left: node,
        right: right,
        nullable: false,
        firstpos: new Set(),
        lastpos: new Set(),
      };
      node = unionNode;
    }
    return node;
  }

  term(): SyntaxTreeNode {
    let node = this.factor();
    while (
      this.peek() !== null &&
      this.peek()!.type !== 'union' &&
      this.peek()!.type !== 'rparen'
    ) {
      const right = this.factor();
      const concatNode: SyntaxTreeNode = {
        id: newId(),
        type: 'concat',
        symbol: '·',
        left: node,
        right: right,
        nullable: false,
        firstpos: new Set(),
        lastpos: new Set(),
      };
      node = concatNode;
    }
    return node;
  }

  factor(): SyntaxTreeNode {
    let node = this.base();
    while (
      this.peek()?.type === 'star' ||
      this.peek()?.type === 'plus' ||
      this.peek()?.type === 'question'
    ) {
      const op = this.consume();
      if (op.type === 'star') {
        node = {
          id: newId(),
          type: 'star',
          symbol: '*',
          child: node,
          nullable: false,
          firstpos: new Set(),
          lastpos: new Set(),
        };
      } else if (op.type === 'plus') {
        // a+ = a·a*
        const starNode: SyntaxTreeNode = {
          id: newId(),
          type: 'star',
          symbol: '*',
          child: deepClone(node),
          nullable: false,
          firstpos: new Set(),
          lastpos: new Set(),
        };
        node = {
          id: newId(),
          type: 'concat',
          symbol: '·',
          left: node,
          right: starNode,
          nullable: false,
          firstpos: new Set(),
          lastpos: new Set(),
        };
      } else if (op.type === 'question') {
        // a? = a|ε  — we model ε as a nullable empty node
        // Simpler: make a union with an epsilon leaf
        const epsilonNode: SyntaxTreeNode = {
          id: newId(),
          type: 'leaf',
          symbol: 'ε',
          nullable: true,
          firstpos: new Set(),
          lastpos: new Set(),
        };
        node = {
          id: newId(),
          type: 'union',
          symbol: '|',
          left: node,
          right: epsilonNode,
          nullable: false,
          firstpos: new Set(),
          lastpos: new Set(),
        };
      }
    }
    return node;
  }

  base(): SyntaxTreeNode {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');
    if (tok.type === 'lparen') {
      this.consume();
      const node = this.expr();
      if (this.peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
      this.consume();
      return node;
    }
    if (tok.type === 'char') {
      this.consume();
      if (tok.value === '·') {
        // This shouldn't appear as base, but handle gracefully
        throw new Error('Unexpected concatenation operator');
      }
      const leaf: SyntaxTreeNode = {
        id: newId(),
        type: 'leaf',
        symbol: tok.value,
        position: tok.value === 'ε' ? undefined : ++positionCounter,
        nullable: tok.value === 'ε',
        firstpos: new Set(),
        lastpos: new Set(),
      };
      if (leaf.position !== undefined) {
        leaf.firstpos.add(leaf.position);
        leaf.lastpos.add(leaf.position);
      }
      return leaf;
    }
    throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
  }
}

function deepClone(node: SyntaxTreeNode): SyntaxTreeNode {
  positionCounter; // positions will be reassigned
  const clone: SyntaxTreeNode = {
    id: newId(),
    type: node.type,
    symbol: node.symbol,
    nullable: false,
    firstpos: new Set(),
    lastpos: new Set(),
  };
  if (node.type === 'leaf' && node.symbol !== 'ε') {
    clone.position = ++positionCounter;
    clone.firstpos.add(clone.position);
    clone.lastpos.add(clone.position);
  }
  if (node.left) clone.left = deepClone(node.left);
  if (node.right) clone.right = deepClone(node.right);
  if (node.child) clone.child = deepClone(node.child);
  return clone;
}

export function getPositionSymbolMap(node: SyntaxTreeNode): Map<number, string> {
  const map = new Map<number, string>();
  function traverse(n: SyntaxTreeNode) {
    if (n.type === 'leaf' && n.position !== undefined) {
      map.set(n.position, n.symbol || '');
    }
    if (n.left) traverse(n.left);
    if (n.right) traverse(n.right);
    if (n.child) traverse(n.child);
  }
  traverse(node);
  return map;
}

export function augmentRegex(regex: string): string {
  return `(${regex})#`;
}

export function buildSyntaxTree(regex: string): SyntaxTreeNode {
  positionCounter = 0;
  nodeIdCounter = 0;
  const augmented = augmentRegex(regex);
  const tokens = tokenize(augmented);
  // No need for insertConcat since parser handles implicit concat
  const parser = new Parser(tokens);
  const tree = parser.parse();
  return tree;
}

export function validateRegex(regex: string): { valid: boolean; error?: string } {
  if (!regex || regex.trim() === '') return { valid: false, error: 'Expression cannot be empty' };
  try {
    positionCounter = 0;
    nodeIdCounter = 0;
    const augmented = augmentRegex(regex);
    const tokens = tokenize(augmented);
    const parser = new Parser(tokens);
    parser.parse();
    // Reset counters
    positionCounter = 0;
    nodeIdCounter = 0;
    return { valid: true };
  } catch (e: any) {
    positionCounter = 0;
    nodeIdCounter = 0;
    return { valid: false, error: e.message };
  }
}
