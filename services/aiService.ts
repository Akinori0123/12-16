// This service simulates the Gemini API interaction for the demo purpose.
// In a real app, this would use the actual GoogleGenAI SDK.

export const simulateAIAnalysis = async (filename: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (filename.includes("error")) {
        resolve("【AI修正提案】\n第3条の「賃金規定」に関する記述が、最新の助成金要件（3%以上の昇給）を満たしていない可能性があります。\n\n提案: 昇給規定の条文を自動修正案に差し替えますか？");
      } else {
        resolve("【AI確認完了】\n書類の内容に問題は見当たりませんでした。\n必要な必須項目（会社名、代表者印、施行日）はすべて検出されました。");
      }
    }, 2000); // Simulate 2s network delay
  });
};

export const simulateFormGeneration = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 1500);
  });
};