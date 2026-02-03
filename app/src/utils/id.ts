export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // 旧環境向けフォールバック（要件上は最新ブラウザ想定だが、生成失敗は避ける）
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}
