#!/usr/bin/env node

/**
 * デモデータ削除スクリプト
 * 一般ユーザーのローカルストレージからデモデータを削除します
 */

console.log('🧹 デモデータクリア用JavaScriptコード');
console.log('ブラウザのコンソールで以下のコードを実行してください：');
console.log('');
console.log('// =================================');
console.log('// デモデータ全削除スクリプト');
console.log('// =================================');
console.log('');
console.log('(function() {');
console.log('  const keysToRemove = [');
console.log('    "demoUser",');
console.log('    "demoDocuments", ');
console.log('    "inProgressApplications",');
console.log('    "completedApplications",');
console.log('    "ai_prompt_templates",');
console.log('    "ai_prompt_settings"');
console.log('  ];');
console.log('');
console.log('  // 指定キーの削除');
console.log('  keysToRemove.forEach(key => {');
console.log('    if (localStorage.getItem(key)) {');
console.log('      localStorage.removeItem(key);');
console.log('      console.log("✅ 削除:", key);');
console.log('    }');
console.log('  });');
console.log('');
console.log('  // 動的キーの削除');
console.log('  Object.keys(localStorage).forEach(key => {');
console.log('    if (key.startsWith("applicationInfo_") || ');
console.log('        key.startsWith("workflow_") ||');
console.log('        key.startsWith("applicationDocuments_") ||');
console.log('        key.startsWith("demo-") ||');
console.log('        key.startsWith("userApplications_")) {');
console.log('      localStorage.removeItem(key);');
console.log('      console.log("✅ 削除:", key);');
console.log('    }');
console.log('  });');
console.log('');
console.log('  console.log("🎉 デモデータの削除が完了しました");');
console.log('  console.log("ページをリロードして変更を適用してください");');
console.log('})();');
console.log('');
console.log('// =================================');
console.log('');