import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileImage, FileText, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RegexInput from '@/components/RegexInput';
import StepControls from '@/components/StepControls';
import SyntaxTreeView from '@/components/SyntaxTreeView';
import FollowposTable from '@/components/FollowposTable';
import TransitionTable from '@/components/TransitionTable';
import DFAGraph from '@/components/DFAGraph';
import RuleExplanation from '@/components/RuleExplanation';
import { buildSyntaxTree, SyntaxTreeNode, augmentRegex } from '@/algorithms/syntaxTreeBuilder';
import { computeAll } from '@/algorithms/computeProperties';
import { buildDFA, DFAResult } from '@/algorithms/dfaBuilder';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { exportFullSolutionPDF } from '@/utils/exportFullPDF';

export default function Index() {
  const [regex, setRegex] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [tree, setTree] = useState<SyntaxTreeNode | null>(null);
  const [followpos, setFollowpos] = useState<Map<number, Set<number>> | null>(null);
  const [dfa, setDfa] = useState<DFAResult | null>(null);
  const dfaGraphRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleSubmit = useCallback((input: string) => {
    // Reset everything first to clear stale data
    setCurrentStep(1);
    setTree(null);
    setFollowpos(null);
    setDfa(null);

    // Build new data
    const t = buildSyntaxTree(input);
    const { followpos: fp } = computeAll(t);
    const d = buildDFA(t, fp);
    
    // Use setTimeout to ensure state is cleared before setting new data
    setTimeout(() => {
      setRegex(input);
      setTree(t);
      setFollowpos(fp);
      setDfa(d);
    }, 0);
  }, []);

  const handleReset = useCallback(() => {
    setRegex('');
    setTree(null);
    setFollowpos(null);
    setDfa(null);
    setCurrentStep(1);
  }, []);

  const maxStep = regex ? 7 : 0;

  const exportPNG = async () => {
    if (!dfaGraphRef.current) return;
    try {
      const dataUrl = await toPng(dfaGraphRef.current, { backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = 'dfa-diagram.png';
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const exportPDF = () => {
    if (!dfa) return;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('DFA Transition Table', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Regex: ${regex}`, 14, 30);
    doc.text(`Augmented: ${augmentRegex(regex)}`, 14, 36);
    let y = 48;
    doc.setFont('helvetica', 'bold');
    doc.text('State Definitions:', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    dfa.states.forEach(s => {
      const posStr = `{${[...s.positions].sort((a, b) => a - b).join(',')}}`;
      doc.text(`${s.name} = ${posStr}${s.isAccepting ? ' (accepting)' : ''}${s.name === dfa.startState ? ' (start)' : ''}`, 18, y);
      y += 6;
    });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Transitions:', 14, y);
    y += 8;
    const cols = ['State', ...dfa.alphabet];
    const colW = 30;
    cols.forEach((c, i) => { doc.text(c, 18 + i * colW, y); });
    y += 6;
    doc.setFont('helvetica', 'normal');
    dfa.states.forEach(state => {
      const row = [
        `${state.isAccepting ? '*' : ''}${state.name}${state.name === dfa.startState ? ' →' : ''}`,
        ...dfa.alphabet.map(a => {
          const t = dfa.transitions.find(tr => tr.from === state.name && tr.symbol === a);
          return t ? t.to : '—';
        }),
      ];
      row.forEach((cell, i) => { doc.text(cell, 18 + i * colW, y); });
      y += 6;
    });
    doc.save('dfa-transition-table.pdf');
  };

  const exportFullPDF = async () => {
    if (!dfa || !tree || !followpos) return;
    setExporting(true);
    try {
      await exportFullSolutionPDF(
        {
          augmentRef: null,
          treeRef: treeRef.current,
          followposRef: null,
          dfaGraphRef: dfaGraphRef.current,
          transitionRef: null,
          ruleRefs: null,
        },
        { regex, tree, followpos, dfa }
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">RE → DFA Visualizer</h1>
              <p className="text-[11px] text-muted-foreground">Direct DFA Construction via Syntax Tree Method</p>
            </div>
          </div>
          {dfa && currentStep >= 7 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportPNG} className="gap-1.5 text-xs">
                <FileImage className="w-3.5 h-3.5" /> PNG
              </Button>
              <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> Table PDF
              </Button>
              <Button size="sm" onClick={exportFullPDF} disabled={exporting} className="gap-1.5 text-xs" style={{ background: 'var(--gradient-hero)' }}>
                <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Full Solution PDF'}
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-3 space-y-4">
            <RegexInput onSubmit={handleSubmit} onReset={handleReset} currentRegex={regex} />
            <StepControls
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              maxStep={maxStep}
              hasRegex={!!regex}
            />
          </div>

          {/* Center Panel */}
          <div className="lg:col-span-6 space-y-4">
            <AnimatePresence mode="wait">
              {!regex && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="panel-card flex flex-col items-center justify-center py-20 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'var(--gradient-hero)' }}
                  >
                    <Zap className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Enter a Regular Expression</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Input a regex like <code className="font-mono bg-muted px-1.5 py-0.5 rounded">(a|b)*abb</code> and
                    watch the step-by-step conversion to a DFA using the syntax tree method.
                  </p>
                </motion.div>
              )}

              {regex && currentStep >= 1 && (
                <motion.div
                  key="augment"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="panel-card"
                >
                  <div className="panel-header">Step 1: Augmented Expression</div>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Original</p>
                        <code className="font-mono text-sm font-semibold bg-muted px-3 py-1.5 rounded-lg">{regex}</code>
                      </div>
                      <span className="text-muted-foreground text-lg">→</span>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Augmented</p>
                        <code className="font-mono text-sm font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                          ({regex})#
                        </code>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {regex && tree && currentStep >= 2 && (
                <motion.div key="tree" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="panel-card mb-1">
                    <div className="panel-header">
                      Step 2: Syntax Tree
                      {currentStep >= 3 && ' + Properties'}
                    </div>
                  </div>
                  <div ref={treeRef}>
                    <SyntaxTreeView
                      root={tree}
                      showNullable={currentStep >= 3}
                      showFirstpos={currentStep >= 4}
                      showLastpos={currentStep >= 5}
                    />
                  </div>
                </motion.div>
              )}

              {regex && followpos && currentStep >= 6 && (
                <FollowposTable followpos={followpos} root={tree!} />
              )}

              {regex && dfa && currentStep >= 7 && (
                <>
                  <DFAGraph dfa={dfa} graphRef={dfaGraphRef as React.RefObject<HTMLDivElement>} />
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-3 space-y-4">
            {regex && <RuleExplanation step={currentStep} />}

            {regex && dfa && currentStep >= 7 && (
              <TransitionTable dfa={dfa} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
