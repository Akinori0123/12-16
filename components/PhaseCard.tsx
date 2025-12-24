import React from 'react';
import { ProcessPhase } from '../types';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface PhaseCardProps {
  phase: ProcessPhase;
  stepNumber: number;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({ phase, stepNumber }) => {
  const isLocked = !phase.isActive && !phase.isCompleted;

  return (
    <div className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
      phase.isActive 
        ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100' 
        : isLocked 
          ? 'bg-slate-50 border-slate-200 opacity-60' 
          : 'bg-white border-green-200'
    }`}>
      <div className="flex-shrink-0 mt-1">
        {phase.isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : isLocked ? (
          <Lock className="w-6 h-6 text-slate-400" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
            {stepNumber}
          </div>
        )}
      </div>
      <div>
        <h3 className={`font-bold text-lg ${phase.isActive ? 'text-blue-900' : 'text-slate-700'}`}>
          {phase.title}
        </h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          {phase.description}
        </p>
      </div>
    </div>
  );
};