import React from 'react';
import { DocumentTask, TaskStatus } from '../types';
import { FileText, UploadCloud, CheckCircle2, Clock, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface TaskRowProps {
  task: DocumentTask;
  onAction: (taskId: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onAction }) => {
  const getStatusIcon = () => {
    switch (task.status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case TaskStatus.ACTION_REQUIRED:
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case TaskStatus.UPLOADING:
      case TaskStatus.AI_PROCESSING:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case TaskStatus.COMPLETED:
        return <span className="text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full text-xs font-medium">完了</span>;
      case TaskStatus.ACTION_REQUIRED:
        return <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-medium">要対応</span>;
      case TaskStatus.AI_PROCESSING:
        return <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" />AI解析中</span>;
      default:
        return <span className="text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs font-medium">未着手</span>;
    }
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
        <FileText className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="font-bold text-slate-800 truncate">{task.title}</h4>
          {task.required && <span className="text-[10px] font-bold text-red-500 border border-red-200 bg-red-50 px-1.5 rounded">必須</span>}
          {getStatusText()}
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{task.description}</p>
        {task.dueDate && (
          <p className="text-xs text-amber-600 mt-1 font-medium">期限: {task.dueDate}</p>
        )}
      </div>

      <div className="mt-4 sm:mt-0 w-full sm:w-auto">
        <button
          onClick={() => onAction(task.id)}
          disabled={task.status === TaskStatus.COMPLETED || task.status === TaskStatus.AI_PROCESSING}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all
            ${task.status === TaskStatus.COMPLETED 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-700 shadow-sm'
            }`}
        >
          {task.status === TaskStatus.COMPLETED ? (
            '確認済み'
          ) : (
            <>
              {task.fileType === 'pdf' ? <UploadCloud className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {task.fileType === 'pdf' ? 'アップロード' : '入力・作成'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};