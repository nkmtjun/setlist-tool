type SettingsPageProps = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function SettingsPage({ theme, onToggleTheme }: SettingsPageProps) {
  const isDark = theme === 'dark'
  return (
    <section className="page">
      <div className="pageHeader">
        <h1>設定</h1>
      </div>

      <div className="cardList" style={{ gridTemplateColumns: 'minmax(280px, 1fr)' }}>
        <article className="card">
          <div className="cardTitle">外観</div>
          <div className="cardMeta" style={{ marginBottom: '12px' }}>
            画面テーマを切り替えます。
          </div>
          <div className="detailsBody">
            <p className="muted" style={{ marginBottom: '12px' }}>
              現在のテーマ: {isDark ? 'ダーク' : 'ライト'}
            </p>
            <label className="themeToggleControl">
              <span className="themeToggleLabel">テーマを切り替える</span>
              <span className="themeToggleSwitch">
                <input
                  type="checkbox"
                  checked={isDark}
                  onChange={onToggleTheme}
                  aria-label={isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
                />
                <span className="themeToggleSlider" aria-hidden="true" />
              </span>
            </label>
          </div>
        </article>
      </div>
    </section>
  )
}
