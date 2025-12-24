import React from 'react';
import { Sparkles, X, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: string | null;
  isProcessing: boolean;
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ isOpen, onClose, result, isProcessing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI 書類チェック</h3>
              <p className="text-blue-100 text-sm">Gemini Pro 搭載</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="text-slate-600 font-medium animate-pulse">書類をスキャン中...</p>
              <p className="text-xs text-slate-400">要件適合性、必須項目のチェックを行っています</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border ${result?.includes('修正') ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex gap-3">
                  {result?.includes('修正') ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  )}
                  <div className="space-y-2">
                    <h4 className={`font-bold ${result?.includes('修正') ? 'text-amber-800' : 'text-green-800'}`}>
                      {result?.includes('修正') ? '要確認事項が見つかりました' : 'チェック完了'}
                    </h4>
                    <p className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed">
                      {result}
                    </p>
                  </div>
                </div>
              </div>

              {result?.includes('修正') && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    AIによる修正案
                  </h5>
                  <div className="text-sm text-slate-600 font-mono bg-white p-3 rounded border border-slate-200">
                    第3条（賃金）<br/>
                    ...基本給は、前年度実績と比較して<span className="bg-yellow-100 font-bold px-1 text-yellow-800">3%以上</span>昇給させるものとする。
                  </div>
                  <button 
                    onClick={onClose}
                    className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    修正案を適用して保存
                  </button>
                </div>
              )}
              
              {!result?.includes('修正') && (
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all hover:shadow-xl"
                >
                  確認完了
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};