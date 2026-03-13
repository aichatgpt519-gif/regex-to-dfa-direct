import { SyntaxTreeNode, getPositionSymbolMap } from './syntaxTreeBuilder';

export interface DFAState {
  name: string;
  positions: Set<number>;
  isAccepting: boolean;
}

export interface DFATransition {
  from: string;
  to: string;
  symbol: string;
}

export interface DFAResult {
  states: DFAState[];
  transitions: DFATransition[];
  alphabet: string[];
  startState: string;
  acceptingStates: string[];
}

function setToKey(s: Set<number>): string {
  return [...s].sort((a, b) => a - b).join(',');
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function buildDFA(
  root: SyntaxTreeNode,
  followpos: Map<number, Set<number>>
): DFAResult {
  const posSymMap = getPositionSymbolMap(root);

  // Find the position of #
  let endPos = -1;
  for (const [pos, sym] of posSymMap) {
    if (sym === '#') {
      endPos = pos;
      break;
    }
  }

  // Get alphabet (exclude #)
  const alphabetSet = new Set<string>();
  for (const [, sym] of posSymMap) {
    if (sym !== '#' && sym !== 'ε') alphabetSet.add(sym);
  }
  const alphabet = [...alphabetSet].sort();

  const states: DFAState[] = [];
  const transitions: DFATransition[] = [];
  const unmarked: DFAState[] = [];
  const stateMap = new Map<string, DFAState>();

  let stateCounter = 0;
  const stateName = () => String.fromCharCode(65 + stateCounter++); // A, B, C...

  // Initial state = firstpos(root)
  const initPositions = new Set(root.firstpos);
  const initName = stateName();
  const initState: DFAState = {
    name: initName,
    positions: initPositions,
    isAccepting: initPositions.has(endPos),
  };
  states.push(initState);
  unmarked.push(initState);
  stateMap.set(setToKey(initPositions), initState);

  while (unmarked.length > 0) {
    const S = unmarked.pop()!;

    for (const a of alphabet) {
      // U = union of followpos(p) for all p in S.positions where symbol(p) = a
      const U = new Set<number>();
      for (const p of S.positions) {
        if (posSymMap.get(p) === a) {
          const fp = followpos.get(p);
          if (fp) fp.forEach(v => U.add(v));
        }
      }

      if (U.size === 0) continue;

      const key = setToKey(U);
      let target = stateMap.get(key);

      if (!target) {
        const name = stateName();
        target = {
          name,
          positions: U,
          isAccepting: U.has(endPos),
        };
        states.push(target);
        unmarked.push(target);
        stateMap.set(key, target);
      }

      transitions.push({ from: S.name, to: target.name, symbol: a });
    }
  }

  return {
    states,
    transitions,
    alphabet,
    startState: initName,
    acceptingStates: states.filter(s => s.isAccepting).map(s => s.name),
  };
}
