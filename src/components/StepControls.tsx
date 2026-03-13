import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { id: 1, label: 'Augment Regex', short: 'Augment' },
  { id: 2, label: 'Syntax Tree', short: 'Tree' },
  { id: 3, label: 'Nullable', short: 'Nullable' },
  { id: 4, label: 'Firstpos', short: 'Firstpos' },
  { id: 5, label: 'Lastpos', short: 'Lastpos' },
  { id: 6, label: 'Followpos', short: 'Followpos' },
  { id: 7, label: 'DFA Construction', short: 'DFA' },
];

interface StepControlsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  maxStep: number;
  hasRegex: boolean;
}

export default function StepControls({ currentStep, onStepChange, maxStep, hasRegex }: StepControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="panel-card"
    >
      <div className="panel-header">Step-by-Step Mode</div>
      <div className="p-4 space-y-3">
        <div className="flex flex-col gap-1">
          {STEPS.map(step => (
            <button
              key={step.id}
              onClick={() => step.id <= maxStep && onStepChange(step.id)}
              disabled={step.id > maxStep || !hasRegex}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                currentStep === step.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : step.id <= maxStep && hasRegex
                  ? 'hover:bg-accent hover:text-accent-foreground'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span
                className={
                  currentStep === step.id ? 'step-badge' : 'step-badge-inactive'
                }
                style={currentStep === step.id ? { background: 'hsla(0,0%,100%,0.2)' } : {}}
              >
                {step.id}
              </span>
              {step.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => onStepChange(Math.max(1, currentStep - 1))}
            disabled={currentStep <= 1 || !hasRegex}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => onStepChange(Math.min(maxStep, currentStep + 1))}
            disabled={currentStep >= maxStep || !hasRegex}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full gap-1"
          onClick={() => onStepChange(maxStep)}
          disabled={!hasRegex}
        >
          <SkipForward className="w-3.5 h-3.5" /> Show All
        </Button>
      </div>
    </motion.div>
  );
}
