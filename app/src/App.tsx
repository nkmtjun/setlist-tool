import './App.css'

import { useEffect, useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import WelcomeDialog from './components/WelcomeDialog'
import HelpPage from './pages/HelpPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import SettingsPage from './pages/SettingsPage'
import SetlistEditPage from './pages/SetlistEditPage'
import SharePage from './pages/SharePage'

type Theme = 'light' | 'dark'

const themeStorageKey = 'setlist-theme'

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  const handleToggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <HashRouter>
      <div className="appShell">
        <header className="appHeader">
          <div className="appTitle">セットリスト作成支援ツール</div>
          <nav className="appNav">
            <Link to="/">セットリスト</Link>
            <Link to="/library">楽曲ライブラリ</Link>
            <Link to="/settings">設定</Link>
            <Link to="/help">ヘルプ</Link>
          </nav>
        </header>
        <main className="appMain">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/setlists/:setlistId" element={<SetlistEditPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route
              path="/settings"
              element={<SettingsPage theme={theme} onToggleTheme={handleToggleTheme} />}
            />
            <Route path="/share/:setlistId" element={<SharePage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <WelcomeDialog />
      </div>
    </HashRouter>
  )
}

export default App
