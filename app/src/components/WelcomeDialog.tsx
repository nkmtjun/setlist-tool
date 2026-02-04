import { useState } from "react";
import "./WelcomeDialog.css";

export default function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState(() => {
    return !localStorage.getItem("setlist-tool:hasSeenWelcome");
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("setlist-tool:hasSeenWelcome", "true");
    }
    // Fade out effect could be added here, but for now just close
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-dialog-overlay">
      <div
        className="welcome-dialog-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <h2 id="welcome-title" className="welcome-dialog-title">
          ようこそ！
        </h2>
        <div className="welcome-dialog-body">
          <p>セットリスト作成支援ツールへようこそ。</p>
          <p>
            このアプリでは、ライブやコンサートのセットリスト（曲順）を簡単に作成・管理することができます。
          </p>
          <ul>
            <li>
              <strong>ドラッグ＆ドロップ</strong>で直感的に曲順を並べ替え
            </li>
            <li>
              <strong>楽曲ライブラリ</strong>で持ち曲を一元管理
            </li>
            <li>
              <strong>シェア機能</strong>でメンバーに共有（テキスト・画像）
            </li>
          </ul>
          <p>まずは「楽曲ライブラリ」から曲を登録してみましょう！</p>
        </div>
        <div className="welcome-dialog-footer">
          <label className="welcome-dialog-checkbox">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            次回から表示しない
          </label>
          <button onClick={handleClose} autoFocus>
            始める
          </button>
        </div>
      </div>
    </div>
  );
}
