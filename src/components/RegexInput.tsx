import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateRegex } from '@/algorithms/syntaxTreeBuilder';

const PRESETS = [
  { label: '(a|b)*abb', value: '(a|b)*abb' },
  { label: 'a*b*a(a|b)*b*a', value: 'a*b*a(a|b)*b*a' },
  { label: '(a|b)*aab', value: '(a|b)*aab' },
];

interface RegexInputProps {
  onSubmit: (regex: string) => void;
  onReset: () => void;
  currentRegex: string;
}

export default function RegexInput({ onSubmit, onReset, currentRegex }: RegexInputProps) {
  const [input, setInput] = useState(currentRegex || '(a|b)*abb');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const result = validateRegex(input);
    if (!result.valid) {
      setError(result.error || 'Invalid expression');
      return;
    }
    setError(null);
    onSubmit(input);
  };

  const handlePreset = (value: string) => {
    setInput(value);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel-card"
    >
      <div className="panel-header flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Regular Expression
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Input Expression
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="flex-1 px-3 py-2 rounded-lg border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. (a|b)*abb"
            />
            <Button size="sm" onClick={handleSubmit} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Build
            </Button>
            <Button size="sm" variant="outline" onClick={onReset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive mt-1.5">{error}</p>
          )}
        </div>

        {currentRegex && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground mb-1">Augmented Expression</p>
            <p className="font-mono text-sm font-semibold">({currentRegex})#</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Example Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className="px-3 py-1.5 rounded-md border text-xs font-mono hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {p.label}
                <ChevronRight className="w-3 h-3 inline ml-1 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
