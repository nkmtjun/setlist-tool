import { useNavigate } from 'react-router-dom';

import changelog from '../../CHANGELOG.md?raw';

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <section className="page">
      <div className="pageHeader">
        <h1>ヘルプ・使い方</h1>
      </div>

      <div className="cardList" style={{ gridTemplateColumns: 'minmax(300px, 1fr)' }}>
        <article className="card">
          <div className="cardTitle">セットリストの作成</div>
          <div className="cardMeta" style={{ marginBottom: '16px' }}>セットリストを自由に作成・編集できます</div>
          <div className="detailsBody">
            <p>トップページの「＋」ボタンから新しいセットリストを作成できます。</p>
            <p>曲の追加は、ライブラリから選択するか、直接入力することができます。</p>
            <p><strong>ドラッグ＆ドロップ</strong>のハンドル（左側のグリップアイコン）を使って、簡単に曲順を入れ替えることができます。</p>
            <p>本編とアンコールを分ける境界線もドラッグして移動可能です。</p>
          </div>
        </article>

        <article className="card">
          <div className="cardTitle">楽曲ライブラリ</div>
          <div className="cardMeta" style={{ marginBottom: '16px' }}>演奏する曲を一元管理</div>
          <div className="detailsBody">
            <p>よく演奏する曲をライブラリに登録しておくと、セットリスト作成時に呼び出しやすくなります。</p>
            <p>「楽曲ライブラリ」ページで曲の追加・編集・削除が可能です。</p>
            <p>セットリスト編集中に新しい曲を入力した場合も、自動的に候補としてライブラリに追加されることはありませんので、必要に応じてライブラリに追加してください。</p>
          </div>
        </article>

        <article className="card">
          <div className="cardTitle">共有・出力</div>
          <div className="cardMeta" style={{ marginBottom: '16px' }}>メンバーへの共有をスムーズに</div>
          <div className="detailsBody">
            <p>作成したセットリストは、テキスト形式または画像として出力できます。</p>
            <p>「出力 / 共有」ボタンから、クリップボードへのコピーや、画像としてのダウンロードが可能です。</p>
            <p>LINEやSNSでの共有に便利です。</p>
          </div>
        </article>

        <article className="card">
          <div className="cardTitle">更新履歴</div>
          <div className="detailsBody">
            <pre className="outputBox">{changelog}</pre>
          </div>
        </article>
         
        <article className="card">
          <div className="cardTitle">データの保存について</div>
          <div className="detailsBody">
            <p>作成したデータは、お使いのブラウザ内（IndexedDB）に保存されます。</p>
            <p>ブラウザのキャッシュクリア等を行うとデータが消える可能性がありますので、重要なデータはJSON形式でエクスポートしてバックアップを取ることをお勧めします。</p>
          </div>
        </article>
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')}>トップページへ戻る</button>
      </div>
    </section>
  );
}
