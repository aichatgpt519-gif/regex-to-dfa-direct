import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { DFAResult } from '@/algorithms/dfaBuilder';
import { SyntaxTreeNode, getPositionSymbolMap, augmentRegex } from '@/algorithms/syntaxTreeBuilder';

interface ExportRefs {
  augmentRef: HTMLDivElement | null;
  treeRef: HTMLDivElement | null;
  followposRef: HTMLDivElement | null;
  dfaGraphRef: HTMLDivElement | null;
  transitionRef: HTMLDivElement | null;
  ruleRefs: HTMLDivElement | null;
}

interface ExportData {
  regex: string;
  tree: SyntaxTreeNode;
  followpos: Map<number, Set<number>>;
  dfa: DFAResult;
}

async function captureElement(el: HTMLElement): Promise<string | null> {
  try {
    return await toPng(el, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      style: { transform: 'none', opacity: '1' },
    });
  } catch {
    return null;
  }
}

function addImageToPdf(
  doc: jsPDF,
  imgData: string,
  y: number,
  pageWidth: number,
  maxHeight: number
): { newY: number; addedPage: boolean } {
  const img = new Image();
  img.src = imgData;

  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  // Estimate aspect ratio from the data URL image
  // We'll use a fixed scaling approach
  const imgWidth = usableWidth;
  const imgHeight = imgWidth * 0.5; // approximate, will be adjusted

  if (y + imgHeight > maxHeight) {
    doc.addPage();
    y = 20;
  }

  doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
  return { newY: y + imgHeight + 10, addedPage: false };
}

export async function exportFullSolutionPDF(refs: ExportRefs, data: ExportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  // Title page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('RE → DFA: Complete Solution', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Direct DFA Construction via Syntax Tree Method', pageWidth / 2, 40, { align: 'center' });

  doc.setDrawColor(100, 100, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, 48, pageWidth - margin, 48);

  let y = 58;

  // Regex info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Regular Expression:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.regex, margin + 48, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Augmented:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(augmentRegex(data.regex), margin + 48, y);
  y += 15;

  // ─── Step 1: Augmented Expression ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 180);
  doc.text('Step 1: Augmented Regular Expression', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`The regex is augmented by appending the end marker #:  ${data.regex}  →  (${data.regex})#`, margin, y);
  doc.text('The # symbol marks the accepting position in the DFA.', margin, y + 6);
  y += 18;

  // ─── Step 2: Syntax Tree (captured image) ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 180);
  doc.text('Step 2: Syntax Tree with Properties', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Leaf nodes have position numbers. Internal nodes: · (concat), | (union), * (star).', margin, y);
  doc.text('Properties shown: nullable, firstpos, lastpos computed bottom-up.', margin, y + 5);
  y += 14;

  if (refs.treeRef) {
    const treeImg = await captureElement(refs.treeRef);
    if (treeImg) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = treeImg;
      });
      const ratio = img.height / img.width;
      const imgW = usableWidth;
      const imgH = imgW * ratio;

      if (y + imgH > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      doc.addImage(treeImg, 'PNG', margin, y, imgW, Math.min(imgH, 140));
      y += Math.min(imgH, 140) + 10;
    }
  }

  // ─── Step 3-5: Nullable, Firstpos, Lastpos Rules ───
  if (y > pageHeight - 60) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 180);
  doc.text('Steps 3–5: Nullable, Firstpos, Lastpos Rules', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const rules = [
    'Nullable Rules:',
    '  • leaf(i) → false  (ε → true)',
    '  • c₁ | c₂ → nullable(c₁) OR nullable(c₂)',
    '  • c₁ · c₂ → nullable(c₁) AND nullable(c₂)',
    '  • c* → true',
    '',
    'Firstpos Rules:',
    '  • leaf(i) → {i}',
    '  • c₁ | c₂ → firstpos(c₁) ∪ firstpos(c₂)',
    '  • c₁ · c₂ → nullable(c₁) ? firstpos(c₁) ∪ firstpos(c₂) : firstpos(c₁)',
    '  • c* → firstpos(c)',
    '',
    'Lastpos Rules:',
    '  • leaf(i) → {i}',
    '  • c₁ | c₂ → lastpos(c₁) ∪ lastpos(c₂)',
    '  • c₁ · c₂ → nullable(c₂) ? lastpos(c₁) ∪ lastpos(c₂) : lastpos(c₂)',
    '  • c* → lastpos(c)',
  ];
  rules.forEach(line => {
    doc.text(line, margin + 4, y);
    y += 4.5;
  });
  y += 6;

  // ─── Step 6: Followpos Table ───
  if (y > pageHeight - 60) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 180);
  doc.text('Step 6: Followpos Table', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Rule 1 (Concat c₁·c₂): ∀i ∈ lastpos(c₁), add firstpos(c₂) to followpos(i)', margin + 4, y);
  y += 5;
  doc.text('Rule 2 (Star c*): ∀i ∈ lastpos(c), add firstpos(c) to followpos(i)', margin + 4, y);
  y += 10;

  // Draw followpos table
  const posSymMap = getPositionSymbolMap(data.tree);
  const positions = [...data.followpos.keys()].sort((a, b) => a - b);

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const colX = [margin + 4, margin + 30, margin + 60];
  doc.text('Position', colX[0], y);
  doc.text('Symbol', colX[1], y);
  doc.text('Followpos', colX[2], y);
  y += 2;
  doc.setDrawColor(150);
  doc.line(colX[0], y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  positions.forEach(pos => {
    const sym = posSymMap.get(pos) || '';
    const fp = data.followpos.get(pos) || new Set<number>();
    const fpStr = `{${[...fp].sort((a, b) => a - b).join(', ')}}`;
    doc.text(String(pos), colX[0] + 8, y);
    doc.text(sym, colX[1] + 4, y);
    doc.text(fpStr, colX[2], y);
    y += 5;
  });
  y += 8;

  // ─── Step 7: DFA Diagram (captured image) ───
  if (y > pageHeight - 40) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 180);
  doc.text('Step 7: DFA State Diagram', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  if (refs.dfaGraphRef) {
    const dfaImg = await captureElement(refs.dfaGraphRef);
    if (dfaImg) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = dfaImg;
      });
      const ratio = img.height / img.width;
      const imgW = usableWidth;
      const imgH = imgW * ratio;

      if (y + imgH > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      doc.addImage(dfaImg, 'PNG', margin, y, imgW, Math.min(imgH, 120));
      y += Math.min(imgH, 120) + 10;
    }
  }

  // ─── Transition Table ───
  if (y > pageHeight - 60) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 180);
  doc.text('DFA Transition Table', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // State definitions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('State Definitions:', margin + 4, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  data.dfa.states.forEach(s => {
    const posStr = `{${[...s.positions].sort((a, b) => a - b).join(', ')}}`;
    const flags = [];
    if (s.isAccepting) flags.push('accepting');
    if (s.name === data.dfa.startState) flags.push('start');
    const flagStr = flags.length ? `  (${flags.join(', ')})` : '';
    doc.text(`${s.name} = ${posStr}${flagStr}`, margin + 8, y);
    y += 5;
  });
  y += 6;

  // Transition table
  doc.setFont('helvetica', 'bold');
  const tColX = [margin + 4];
  const tColW = 25;
  doc.text('State', tColX[0], y);
  data.dfa.alphabet.forEach((a, i) => {
    doc.text(a, tColX[0] + 30 + i * tColW, y);
  });
  y += 2;
  doc.line(tColX[0], y, tColX[0] + 30 + data.dfa.alphabet.length * tColW, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  data.dfa.states.forEach(state => {
    const prefix = `${state.isAccepting ? '*' : ''}${state.name}${state.name === data.dfa.startState ? ' →' : ''}`;
    doc.text(prefix, tColX[0], y);
    data.dfa.alphabet.forEach((a, i) => {
      const t = data.dfa.transitions.find(tr => tr.from === state.name && tr.symbol === a);
      doc.text(t ? t.to : '—', tColX[0] + 30 + i * tColW, y);
    });
    y += 5;
  });

  // Footer
  y += 10;
  if (y > pageHeight - 20) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Generated by RE → DFA Visualizer', pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save(`dfa-solution-${data.regex.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
