import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { PhaseCard } from './components/PhaseCard';
import { TaskRow } from './components/TaskRow';
import { AIAnalysisModal } from './components/AIAnalysisModal';
import { SUBSIDY_PROGRAMS, DEMO_USER } from './constants';
import { TaskStatus, SubsidyProgram } from './types';
import { simulateAIAnalysis } from './services/aiService';
import { Bell, Search, Sparkles, ChevronDown, Briefcase } from 'lucide-react';

const App: React.FC = () => {
  // Manage state for all programs to persist progress when switching
  const [programs, setPrograms] = useState<SubsidyProgram[]>(SUBSIDY_PROGRAMS);
  const [activeProgramId, setActiveProgramId] = useState<string>(SUBSIDY_PROGRAMS[0].id);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalResult, setModalResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track which task is currently being acted upon to know which program to update
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const activeProgram = programs.find(p => p.id === activeProgramId) || programs[0];
  
  // In a real app, you might want to track active phase per program. 
  // For simplicity, we just select the first active phase of the current program.
  const activePhase = activeProgram.phases.find(p => p.isActive) || activeProgram.phases[0];

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveProgramId(e.target.value);
  };

  // Handle task actions (Upload or Form Input)
  const handleTaskAction = async (taskId: string) => {
    setActiveTaskId(taskId);
    
    // Update status to processing
    updateTaskStatus(activeProgramId, taskId, TaskStatus.AI_PROCESSING);
    
    // Open modal
    setIsModalOpen(true);
    setIsProcessing(true);
    setModalResult(null);

    // Simulate AI Work
    // Randomly decide if it's a success or "needs correction" based on task ID for demo variety
    const isErrorScenario = taskId.includes('task-1'); 
    const result = await simulateAIAnalysis(isErrorScenario ? "file_error.pdf" : "file_ok.pdf");

    setIsProcessing(false);
    setModalResult(result);

    // This update happens after modal interaction in a real flow, 
    // but here we prepare the state change for when the modal closes or action is confirmed
    const nextStatus = isErrorScenario ? TaskStatus.ACTION_REQUIRED : TaskStatus.COMPLETED;
    
    // Store the next status to be applied when closing (or just apply it now for the demo flow)
    updateTaskStatus(activeProgramId, taskId, nextStatus);
  };

  const updateTaskStatus = (programId: string, taskId: string, status: TaskStatus) => {
    setPrograms(prevPrograms => prevPrograms.map(program => {
      if (program.id !== programId) return program;
      
      return {
        ...program,
        phases: program.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === taskId ? { ...task, status } : task
          )
        }))
      };
    }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveTaskId(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
               <Briefcase className="w-4 h-4" />
               <span>申請プロジェクト選択</span>
            </div>
            <div className="relative group">
              <select 
                value={activeProgramId}
                onChange={handleProgramChange}
                className="appearance-none bg-transparent font-bold text-2xl text-slate-800 pr-8 cursor-pointer focus:outline-none hover:text-blue-700 transition-colors w-full md:w-auto"
              >
                {programs.map(prog => (
                  <option key={prog.id} value={prog.id}>{prog.name}</option>
                ))}
              </select>
              <ChevronDown className="w-6 h-6 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-blue-600 transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="書類を検索..." 
                className="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
               <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-700">{DEMO_USER.representative}</div>
                  <div className="text-xs text-slate-500">{DEMO_USER.companyName}</div>
               </div>
               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                 {DEMO_USER.representative.charAt(0)}
               </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
          
          {/* Program Description Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
               <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2 border border-blue-100">
                     {activeProgram.category}
                  </span>
                  <p className="text-slate-600 leading-relaxed max-w-3xl">
                     {activeProgram.description}
                  </p>
               </div>
               <div className="hidden sm:block">
                  <div className="text-right">
                     <span className="text-xs text-slate-400 font-medium">申請期限</span>
                     <div className="font-bold text-slate-800">2025年3月31日</div>
                  </div>
               </div>
            </div>
          </div>

          {/* Progress Overview */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeProgram.phases.map((phase, index) => (
              <PhaseCard key={phase.id} phase={phase} stepNumber={index + 1} />
            ))}
          </section>

          {/* Active Phase Content */}
          {activePhase ? (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
              <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">STEP {activeProgram.phases.findIndex(p => p.id === activePhase.id) + 1}</span>
                    <h2 className="text-xl font-bold text-slate-800">{activePhase.title}</h2>
                  </div>
                  <p className="text-slate-500">{activePhase.description}</p>
                </div>
                
                {/* AI Assistant Promo */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center gap-3 max-w-sm shrink-0">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-indigo-900">AIアシスタント待機中</p>
                    <p className="text-[10px] text-indigo-700">アップロードされた書類から自動で情報を抽出し、申請書を作成します。</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-4 bg-slate-50/50">
                {activePhase.tasks.length > 0 ? (
                   activePhase.tasks.map(task => (
                     <TaskRow 
                       key={task.id} 
                       task={task} 
                       onAction={handleTaskAction} 
                     />
                   ))
                ) : (
                   <div className="text-center py-12 text-slate-400">
                      <p>現在表示するタスクはありません。</p>
                   </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-4">
                <button className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  一時保存
                </button>
                <button className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                  次のステップへ進む
                </button>
              </div>
            </section>
          ) : (
             <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                フェーズが見つかりません。
             </div>
          )}

        </div>
      </main>

      <AIAnalysisModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        result={modalResult}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default App;