'use client'

import { useState } from 'react'
import { WorkflowStep, WorkflowAction } from '@/types/subsidy'

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  currentStepIndex: number
  onActionClick?: (stepId: string, actionId: string) => void
  onStepComplete?: (stepId: string) => void
}

export default function WorkflowProgress({ 
  steps, 
  currentStepIndex, 
  onActionClick,
  onStepComplete 
}: WorkflowProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set([steps[currentStepIndex]?.id]))

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const getStepIcon = (step: WorkflowStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </div>
      )
    } else if (step.status === 'in_progress') {
      return (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      )
    } else if (step.status === 'skipped') {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
        </div>
      )
    } else {
      return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          index <= currentStepIndex ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100 border-2 border-gray-300'
        }`}>
          <span className={`text-sm font-medium ${
            index <= currentStepIndex ? 'text-blue-600' : 'text-gray-500'
          }`}>
            {index + 1}
          </span>
        </div>
      )
    }
  }

  const getStepLineColor = (index: number) => {
    if (index < currentStepIndex || steps[index].status === 'completed') {
      return 'bg-green-500'
    } else if (index === currentStepIndex) {
      return 'bg-blue-500'
    } else {
      return 'bg-gray-300'
    }
  }

  const isStepAccessible = (step: WorkflowStep, index: number) => {
    // 必須ステップで前提条件がある場合はチェック
    if (step.dependencies) {
      return step.dependencies.every(depId => {
        const depStep = steps.find(s => s.id === depId)
        return depStep && depStep.status === 'completed'
      })
    }
    // デフォルトで現在のステップまでは実行可能
    return index <= currentStepIndex
  }

  const handleActionClick = (stepId: string, actionId: string) => {
    if (onActionClick) {
      onActionClick(stepId, actionId)
    }
  }

  const getActionButtonStyle = (action: WorkflowAction) => {
    if (action.isCompleted) {
      return 'bg-green-600 text-white hover:bg-green-700'
    } else {
      return 'bg-blue-600 text-white hover:bg-blue-700'
    }
  }

  const getActionButtonText = (action: WorkflowAction) => {
    if (action.isCompleted) {
      return '✓ ' + action.label
    } else {
      return action.label
    }
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isExpanded = expandedSteps.has(step.id)
        const isAccessible = isStepAccessible(step, index)
        const isActive = index === currentStepIndex

        return (
          <div key={step.id} className={`relative ${!isAccessible ? 'opacity-50' : ''}`}>
            {/* 連結線 */}
            {index < steps.length - 1 && (
              <div className={`absolute left-4 top-12 w-0.5 h-16 ${getStepLineColor(index)}`}></div>
            )}

            {/* ステップカード */}
            <div className={`bg-white rounded-xl shadow-md border-2 transition-all ${
              isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            }`}>
              {/* ステップヘッダー */}
              <div
                className={`flex items-center p-4 cursor-pointer ${
                  isAccessible ? 'hover:bg-gray-50' : ''
                }`}
                onClick={() => isAccessible && toggleStepExpansion(step.id)}
              >
                {getStepIcon(step, index)}
                
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        isAccessible ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                        {step.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <p className={`text-sm ${
                        isAccessible ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {step.estimatedDuration}
                      </span>
                      {isAccessible && (
                        <svg
                          className={`w-5 h-5 text-gray-400 transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 展開されたコンテンツ */}
              {isExpanded && isAccessible && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {/* 必要書類 */}
                  {step.documents && step.documents.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">必要書類</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {step.documents.map((doc, docIndex) => (
                          <div key={docIndex} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {doc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 前提条件 */}
                  {step.dependencies && step.dependencies.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">前提条件</h4>
                      <div className="space-y-1">
                        {step.dependencies.map((depId) => {
                          const depStep = steps.find(s => s.id === depId)
                          const isCompleted = depStep?.status === 'completed'
                          return (
                            <div key={depId} className="flex items-center text-sm">
                              <svg className={`w-4 h-4 mr-2 ${
                                isCompleted ? 'text-green-500' : 'text-gray-400'
                              }`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d={
                                  isCompleted
                                    ? "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    : "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                } clipRule="evenodd"/>
                              </svg>
                              <span className={isCompleted ? 'text-gray-700' : 'text-gray-500'}>
                                {depStep?.title}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* アクション */}
                  {step.actions && step.actions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">実行可能なアクション</h4>
                      <div className="space-y-2">
                        {step.actions.map((action) => (
                          <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{action.label}</div>
                              {action.description && (
                                <div className="text-sm text-gray-600">{action.description}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleActionClick(step.id, action.id)}
                              disabled={action.isCompleted}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                getActionButtonStyle(action)
                              } disabled:opacity-70`}
                            >
                              {getActionButtonText(action)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ステップ完了ボタン */}
                  {step.status !== 'completed' && step.status !== 'skipped' && onStepComplete && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => onStepComplete(step.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        このステップを完了にする
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}