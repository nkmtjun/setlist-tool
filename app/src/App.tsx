import './App.css'

import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import WelcomeDialog from './components/WelcomeDialog'
import HelpPage from './pages/HelpPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import SetlistEditPage from './pages/SetlistEditPage'
import SharePage from './pages/SharePage'

function App() {
  return (
    <HashRouter>
      <div className="appShell">
        <header className="appHeader">
          <div className="appTitle">セットリスト作成支援ツール</div>
          <nav className="appNav">
            <Link to="/">セットリスト</Link>
            <Link to="/library">楽曲ライブラリ</Link>
            <Link to="/help">ヘルプ</Link>
          </nav>
        </header>
        <main className="appMain">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/setlists/:setlistId" element={<SetlistEditPage />} />
            <Route path="/library" element={<LibraryPage />} />
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
