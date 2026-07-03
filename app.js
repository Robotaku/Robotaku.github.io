function renderLogin() {
  const msg = authErrorMessage();
  const isFileProtocol = window.location.protocol === 'file:';
  const currentOrigin = isFileProtocol ? '(file://のため取得不可)' : window.location.origin;

  const errorBlock = msg ? `
    <div style="background:#fcebeb; border:1px solid var(--red); border-radius:8px; padding:14px 16px; margin-bottom:22px; text-align:left; font-size:12.5px; line-height:1.7; color:var(--ink);">
      <b>⚠ ログインできません</b><br>
      ${msg}
      ${!isFileProtocol && authError !== 'CLIENT_ID_MISSING' ? `<br><span style="color:var(--ink-soft);">Google Cloud Consoleの「承認済みの JavaScript 生成元」に <code>${currentOrigin}</code> が登録されているかもご確認ください。</span>` : ''}
    </div>` : '';

  return `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:var(--paper);">
      <div class="card" style="padding:40px; text-align:center; max-width:440px; width:100%;">
        <h1 style="font-size:24px; color:var(--navy-800); margin-bottom:8px;">TOEIC 600 Trainer</h1>
        <p style="color:var(--ink-soft); margin-bottom:24px;">学習データをGoogle Driveに安全に保存し、複数の端末で進捗を共有できます。</p>
        ${errorBlock}
        <button class="btn btn-amber btn-wide" onclick="handleLogin()" style="font-size:16px; padding:12px;" ${isFileProtocol || authError==='CLIENT_ID_MISSING' ? 'disabled' : ''}>
          Googleアカウントでログイン
        </button>
        ${isFileProtocol ? `<p style="margin-top:14px; font-size:11.5px; color:var(--ink-soft);">現在: <code>${window.location.href}</code></p>` : ''}
      </div>
    </div>
  `;
}// ===== Google Drive & Auth Config =====
// ★★★ ここにGoogle Cloud Consoleで発行した「実際の」クライアントIDを貼り付けてください ★★★
// 取得手順は同梱の README_GOOGLE_SETUP.md を参照してください
const GOOGLE_CLIENT_ID = '677120184684-2mfqpccae3ogipbquc65ge99tpign9i1.apps.googleusercontent.com';//使ってみたい方はこの部分を自身で出力したIDに書き換えてください
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'toeic600_progress_v1.json';

let tokenClient;
let accessToken = null;
let driveFileId = null;
let authError = null; // ログイン画面にエラー内容を表示するための状態

// クライアントIDがまだプレースホルダーのままかどうかを判定
function isClientIdConfigured(){
  return !!GOOGLE_CLIENT_ID
    && GOOGLE_CLIENT_ID.indexOf('YOUR_GOOGLE_CLIENT_ID_HERE') === -1
    && /\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID);
}

// エラーコードを日本語の説明文に変換
const AUTH_ERROR_MESSAGES = {
  FILE_PROTOCOL: 'このページが file:// で直接開かれています。Googleログインはこの方式では動作しません。ローカルサーバー経由（例: http://localhost:8000）で開き直してください。',
  CLIENT_ID_MISSING: 'Google Client IDが未設定（プレースホルダーのまま）です。app.js内のGOOGLE_CLIENT_IDに、Google Cloud Consoleで発行した実際のクライアントIDを貼り付けてください。',
  SCRIPT_LOAD_FAILED: 'Googleの認証スクリプト（accounts.google.com）を読み込めませんでした。ネットワーク接続や広告ブロッカーの設定を確認してください。',
  INIT_FAILED: '認証の初期化に失敗しました。クライアントIDの形式が正しいか確認してください。',
  REQUEST_FAILED: 'ログイン処理の開始に失敗しました。ページを再読み込みしてもう一度お試しください。',
  popup_closed: 'ログイン用のポップアップが閉じられました。もう一度お試しください。',
  popup_failed_to_open: 'ポップアップがブラウザにブロックされました。ポップアップブロックを解除してから再度お試しください。',
  access_denied: 'Googleアカウントへのアクセスが許可されませんでした。',
  invalid_client: 'クライアントIDが無効です（Google Cloud Consoleに登録されていないか、削除されています）。GOOGLE_CLIENT_IDの値を確認してください。',
  idpiframe_initialization_failed: '初期化に失敗しました。ブラウザのサードパーティCookie設定をご確認ください。',
};

function authErrorMessage(){
  if(!authError) return null;
  return AUTH_ERROR_MESSAGES[authError] || `予期しないエラーが発生しました（${authError}）。詳細はブラウザのコンソールをご確認ください。`;
}

// ===== State & Storage =====
function getDefaultState() {
  return {
    vocabLearned: {},      // id -> true
    vocabCorrectCount: {}, // id -> count
    grammarDone: {},       // id -> 'correct'|'wrong'
    listeningDone: {},     // id -> 'correct'|'wrong'
    readingDone: {},       // passageId -> {correct, total}
    sessionLog: [],        // {date, type, correct, total}
    estScore: 350
  };
}

let state = null; // ログイン成功後にDriveから読み込む

// 連続でAPIを叩きすぎないための遅延保存（デバウンス）
let saveTimeout = null;
function saveState(){
  if (!accessToken || !state) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(syncStateToDrive, 1500); // 1.5秒後にDriveへ保存
}

// Drive APIを利用した実際の保存処理
async function syncStateToDrive() {
  try {
    // ファイルが未作成の場合はまずメタデータを作成
    if (!driveFileId) {
      const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
      });
      if (!metaRes.ok) throw new Error(`Drive API error (create): ${metaRes.status}`);
      const meta = await metaRes.json();
      driveFileId = meta.id;
    }

    // 内容のアップロード (更新)
    const putRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state)
    });
    if (!putRes.ok) throw new Error(`Drive API error (update): ${putRes.status}`);
    console.log("クラウドに進行状況を保存しました");
  } catch(e) {
    console.error("保存エラー:", e);
  }
}

// ===== Authentication & Initialization =====
function initGoogleAuth() {
  // file:// で開かれている場合、GISは動作しないため早期に警告を出す
  if (window.location.protocol === 'file:') {
    authError = 'FILE_PROTOCOL';
    render();
    return;
  }
  // クライアントIDが未設定なら、Googleスクリプトを読み込む前に案内を表示
  if (!isClientIdConfigured()) {
    authError = 'CLIENT_ID_MISSING';
    render();
    return;
  }

  // Google APIスクリプトの動的読み込み
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            accessToken = tokenResponse.access_token;
            authError = null;
            await loadStateFromDrive();
          }
        },
        error_callback: (err) => {
          // ユーザーがポップアップを閉じた／ブロックされた／クライアントIDが無効 等をここで捕捉
          console.error('Google認証エラー:', err);
          authError = (err && (err.type || err.message)) || 'UNKNOWN';
          render();
        }
      });
    } catch(e) {
      console.error('initTokenClient failed:', e);
      authError = 'INIT_FAILED';
    }
    render(); // ログイン画面を再描画（ボタンを有効化）
  };
  script.onerror = () => {
    authError = 'SCRIPT_LOAD_FAILED';
    render();
  };
  document.head.appendChild(script);
}

function handleLogin() {
  authError = null;
  if (!tokenClient) {
    authError = isClientIdConfigured() ? 'REQUEST_FAILED' : 'CLIENT_ID_MISSING';
    render();
    return;
  }
  try {
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  } catch(e) {
    console.error('requestAccessToken failed:', e);
    authError = 'REQUEST_FAILED';
    render();
  }
}

function handleLogout() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      accessToken = null;
      state = null;
      driveFileId = null;
      render();
    });
  }
}

async function loadStateFromDrive() {
  const app = document.getElementById('app');
  if (app) app.innerHTML = renderLoading();
  try {
    // appDataFolder（アプリ専用の隠しフォルダ）からファイルを検索
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!searchRes.ok) throw new Error(`Drive API error (search): ${searchRes.status}`);
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      driveFileId = searchData.files[0].id;
      // ファイルの中身をダウンロード
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!fileRes.ok) throw new Error(`Drive API error (download): ${fileRes.status}`);
      state = await fileRes.json();
    } else {
      // はじめての利用
      state = getDefaultState();
      await syncStateToDrive(); // 初期データをDriveに作成
    }
    currentPage = 'dashboard';
    render();
  } catch (e) {
    console.error(e);
    accessToken = null; // ログイン画面に戻す
    authError = 'REQUEST_FAILED';
    render();
  }
}

// ===== Router =====
let currentPage = 'login';
let quizSession = null;
function navigate(page){
  currentPage = page;
  render();
  window.scrollTo({top:0, behavior:'smooth'});
}

// ===== Score Estimation =====
function calcEstScore(){
  if(!state) return 250;
  const vocabTotal = VOCAB_DATA.length;
  const vocabKnown = Object.keys(state.vocabLearned).length;
  const vocabRate = vocabTotal ? vocabKnown / vocabTotal : 0;

  const gIds = Object.keys(state.grammarDone);
  const gCorrect = gIds.filter(id => state.grammarDone[id] === 'correct').length;
  const grammarRate = gIds.length ? gCorrect / gIds.length : 0;

  const lIds = Object.keys(state.listeningDone);
  const lCorrect = lIds.filter(id => state.listeningDone[id] === 'correct').length;
  const listenRate = lIds.length ? lCorrect / lIds.length : 0;

  const rPassages = Object.values(state.readingDone);
  let readTotal=0, readCorrect=0;
  rPassages.forEach(p=>{readTotal+=p.total; readCorrect+=p.correct;});
  const readRate = readTotal ? readCorrect/readTotal : 0;

  const activity = (vocabRate*0.3 + grammarRate*0.25 + listenRate*0.2 + readRate*0.25);
  const score = Math.round(250 + activity*650);
  return Math.min(900, Math.max(250, score));
}

function overallProgress(){
  if(!state) return {total:1, done:0, vocabTotal:1, vocabDone:0, grammarTotal:1, grammarDone:0, listenTotal:1, listenDone:0, readTotal:1, readDone:0};
  const vocabTotal = VOCAB_DATA.length;
  const vocabDone = Object.keys(state.vocabLearned).length;
  const grammarTotal = GRAMMAR_DATA.length;
  const grammarDone = Object.keys(state.grammarDone).length;
  const listenTotal = LISTENING_DATA.length;
  const listenDone = Object.keys(state.listeningDone).length;
  const readTotal = READING_DATA.length;
  const readDone = Object.keys(state.readingDone).length;
  const total = vocabTotal+grammarTotal+listenTotal+readTotal;
  const done = vocabDone+grammarDone+listenDone+readDone;
  return {vocabTotal,vocabDone,grammarTotal,grammarDone,listenTotal,listenDone,readTotal,readDone,total,done};
}

// ===== Main Render =====
function render(){
  const app = document.getElementById('app');

  // ログインしていない場合はログイン画面を表示
  if (!accessToken) {
    app.innerHTML = renderLogin();
    return;
  }
  // ログインしているがデータロード中の場合はローディングを表示
  if (!state) {
    app.innerHTML = renderLoading();
    return;
  }

  app.innerHTML = `
    ${renderTopbar()}
    ${renderNavTabs()}
    <div class="page ${currentPage==='dashboard'?'active':''}" id="page-dashboard">${currentPage==='dashboard'?renderDashboard():''}</div>
    <div class="page ${currentPage==='vocab'?'active':''}" id="page-vocab">${currentPage==='vocab'?renderVocabHome():''}</div>
    <div class="page ${currentPage==='grammar'?'active':''}" id="page-grammar">${currentPage==='grammar'?renderGrammarHome():''}</div>
    <div class="page ${currentPage==='listening'?'active':''}" id="page-listening">${currentPage==='listening'?renderListeningHome():''}</div>
    <div class="page ${currentPage==='reading'?'active':''}" id="page-reading">${currentPage==='reading'?renderReadingHome():''}</div>
    <div class="page ${currentPage==='quiz'?'active':''}" id="page-quiz">${currentPage==='quiz'?renderQuiz():''}</div>
  `;
  
  // Lucideアイコンの初期化を追加
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderLoading() {
  return `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; gap:16px;">
      <div class="loader" style="width:40px;height:40px;border:4px solid var(--line);border-top-color:var(--amber-500);border-radius:50%;animation:spin 1s linear infinite;"></div>
      <p style="color:var(--ink-soft); font-weight:600;">クラウドと同期中...</p>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
  </div>
  `;
}

function renderTopbar(){
  const score = calcEstScore();
  return `
  <div class="topbar">
    <div class="brand">
      <div class="brand-mark">600</div>
      <div class="brand-text">
        <h1>TOEIC 600 Trainer</h1>
        <p>SCORE BUILDER DASHBOARD</p>
    </div>
        </div>
    <div style="display:flex; align-items:center; gap:16px;">
      <div class="score-pill">
        <span class="num">${score}</span>
        <span class="label">推定スコア</span>
    </div>
      <button class="btn btn-outline btn-sm" onclick="handleLogout()">ログアウト</button>
  </div>
  </div>`;
}

function renderNavTabs(){
  const tabs = [
    {id:'dashboard', label:'ホーム', icon:'<i data-lucide="home"></i>'},
    {id:'vocab', label:'単語・語彙', icon:'<i data-lucide="book"></i>'},
    {id:'grammar', label:'文法', icon:'<i data-lucide="puzzle"></i>'},
    {id:'listening', label:'リスニング', icon:'<i data-lucide="headphones"></i>'},
    {id:'reading', label:'長文読解', icon:'<i data-lucide="newspaper"></i>'},
  ];
  return `<div class="nav-tabs">
    ${tabs.map(t=>`<button class="nav-tab ${currentPage===t.id?'active':''}" onclick="navigate('${t.id}')">${t.icon} ${t.label}</button>`).join('')}
  </div>`;
}

// ===== Dashboard =====
function renderDashboard(){
  const p = overallProgress();
  const score = calcEstScore();
  const pct = p.total ? Math.round((p.done/p.total)*100) : 0;

  const modules = [
    {key:'vocab', title:'単語・語彙', desc:`頻出ビジネス英単語${VOCAB_DATA.length}語を分野別に学習。フラッシュカード＋確認テスト。`, icon:'<i data-lucide="book"></i>', tint:'tint-blue', done:p.vocabDone, total:p.vocabTotal, page:'vocab'},
    {key:'grammar', title:'文法（Part5対策）', desc:`品詞・時制・前置詞など頻出文法${GRAMMAR_DATA.length}問。1問ずつ解説付き。`, icon:'<i data-lucide="puzzle"></i>', tint:'tint-coral', done:p.grammarDone, total:p.grammarTotal, page:'grammar'},
    {key:'listening', title:'リスニング', desc:`Part2・3形式の音声問題${LISTENING_DATA.length}問。音声合成で読み上げ、速度調整可能。`, icon:'<i data-lucide="headphones"></i>', tint:'tint-green', done:p.listenDone, total:p.listenTotal, page:'listening'},
    {key:'reading', title:'長文読解（Part7）', desc:`メール・広告・通知などのビジネス文書${READING_DATA.length}本。日本語訳付き。`, icon:'<i data-lucide="newspaper"></i>', tint:'tint-purple', done:p.readDone, total:p.readTotal, page:'reading'},
  ];

  const recentLog = state.sessionLog.slice(-5).reverse();
  return `
  <div class="section-head">
    <p class="eyebrow">DASHBOARD</p>
    <h2>学習の進捗状況</h2>
    <p>毎日少しずつでも続けることがスコアアップの近道です。各分野をバランスよく学習しましょう。</p>
  </div>

  <div class="grid grid-4" style="margin-bottom:24px;">
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-dot" style="background:var(--amber-500)"></span>推定スコア</div>
      <div class="stat-num">${score}</div>
      <div class="stat-sub">目標 600点まで ${Math.max(0,600-score)}点</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-dot" style="background:#0c447c"></span>全体進捗</div>
      <div class="stat-num">${pct}%</div>
      <div class="stat-sub">${p.done} / ${p.total} 完了</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-dot" style="background:#3b6d11"></span>習得単語</div>
      <div class="stat-num">${p.vocabDone}</div>
      <div class="stat-sub">/ ${p.vocabTotal} 語</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-dot" style="background:#993c1d"></span>学習セッション</div>
      <div class="stat-num">${state.sessionLog.length}</div>
      <div class="stat-sub">累計回数</div>
    </div>
  </div>

  <div class="section-head">
    <p class="eyebrow">MODULES</p>
    <h2>学習モジュール</h2>
  </div>
  <div class="grid grid-2">
    ${modules.map(m=>{
      const mpct = m.total ? Math.round((m.done/m.total)*100) : 0;
      return `
      <div class="card module-card" onclick="navigate('${m.page}')">
        <div class="module-icon ${m.tint}">${m.icon}</div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
        <div class="module-progress-bar"><div class="module-progress-fill" style="width:${mpct}%; background:var(--amber-500);"></div></div>
        <div class="module-foot"><span>${m.done} / ${m.total} 完了</span><span>${mpct}%</span></div>
      </div>`;
    }).join('')}
  </div>

  ${recentLog.length ? `
  <div class="section-head" style="margin-top:30px;">
    <p class="eyebrow">HISTORY</p>
    <h2>最近の学習履歴</h2>
  </div>
  <div class="card" style="padding:6px 0;">
    ${recentLog.map(l=>`
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; border-bottom:1px solid var(--line); font-size:13px;">
        <span style="color:var(--ink-soft);">${l.date}</span>
        <span style="font-weight:600;">${l.typeLabel}</span>
        <span style="font-family:'JetBrains Mono',monospace; color:${l.correct/l.total>=0.7?'var(--green)':'var(--ink-soft)'};">${l.correct} / ${l.total} 正解</span>
      </div>
    `).join('')}
  </div>` : ''}
  `;
}

// ===== Vocab Module =====
let vocabFilter = 'all';
let vocabFlashIndex = 0;
let vocabFlashFlipped = false;
let vocabFlashList = [];

const VOCAB_CATS = {
  all:'すべて', business:'ビジネス全般', office:'オフィス・事務', meeting:'会議',
  travel:'出張・旅行', retail:'店舗・小売', manufacturing:'製造・物流', adj:'形容詞・副詞', verb:'動詞',
  finance:'財務・会計', it:'IT・技術', hr:'人事・採用', event:'イベント・式典', dining:'飲食・レストラン', construction:'建設・不動産'
};
function renderVocabHome(){
  const cats = Object.keys(VOCAB_CATS);
  const filtered = vocabFilter==='all' ? VOCAB_DATA : VOCAB_DATA.filter(v=>v.cat===vocabFilter);
  const learnedInFilter = filtered.filter(v=>state.vocabLearned[v.id]).length;

  return `
  <div class="section-head">
    <p class="eyebrow">VOCABULARY</p>
    <h2>単語・語彙学習</h2>
    <p>TOEIC頻出のビジネス英単語です。フラッシュカードで覚えて、確認テストで定着させましょう。</p>
  </div>

  <div class="filter-row">
    ${cats.map(c=>`<button class="filter-pill ${vocabFilter===c?'active':''}" onclick="setVocabFilter('${c}')">${VOCAB_CATS[c]}</button>`).join('')}
  </div>

  <div class="grid grid-2" style="margin-bottom:24px;">
    <div class="card" style="padding:20px;">
      <h3 style="margin:0 0 6px; font-size:15px; display:flex; align-items:center; gap:6px;"><i data-lucide="library" class="icon-sm"></i> フラッシュカードで学習</h3>
      <p style="margin:0 0 14px; font-size:13px; color:var(--ink-soft);">${filtered.length}語中 ${learnedInFilter}語 習得済み。カードをめくって意味を確認します。</p>
      <button class="btn btn-wide" onclick="startFlashcards('${vocabFilter}')">学習を始める</button>
    </div>
    <div class="card" style="padding:20px;">
      <h3 style="margin:0 0 6px; font-size:15px; display:flex; align-items:center; gap:6px;"><i data-lucide="edit-3" class="icon-sm"></i> 確認テスト</h3>
      <p style="margin:0 0 14px; font-size:13px; color:var(--ink-soft);">意味を選択する4択クイズで定着度をチェックします（全${filtered.length}問）。</p>
      <button class="btn btn-amber btn-wide" onclick="startVocabQuiz('${vocabFilter}')" ${filtered.length<4?'disabled':''}>テストを始める</button>
    </div>
  </div>

  <div class="section-head">
    <p class="eyebrow">WORD LIST</p>
    <h2>単語一覧（${filtered.length}語）</h2>
  </div>
  <div class="vocab-grid">
    ${filtered.map(v=>`
      <div class="card vocab-mini">
        <div>
          <span class="vm-word">${v.word}</span>
          <span class="vm-pos">${v.pos}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="vm-mean">${v.mean}</span>
          ${state.vocabLearned[v.id] ? '<span style="color:var(--green); font-size:14px;"><i data-lucide="check" class="icon-sm"></i></span>' : ''}
        </div>
      </div>
    `).join('')}
  </div>
  `;
}

function setVocabFilter(c){
  vocabFilter = c;
  render();
}

function startFlashcards(cat){
  vocabFlashList = cat==='all' ? [...VOCAB_DATA] : VOCAB_DATA.filter(v=>v.cat===cat);
  vocabFlashIndex = 0;
  vocabFlashFlipped = false;
  quizSession = {mode:'flashcard'};
  navigate('quiz');
}

function renderFlashcard(){
  const v = vocabFlashList[vocabFlashIndex];
  const pct = Math.round(((vocabFlashIndex)/vocabFlashList.length)*100);
  return `
  <div class="quiz-wrap">
    <a class="back-link" onclick="navigate('vocab')">← 単語学習に戻る</a>
    <div class="quiz-progress">
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%;"></div></div>
      <div class="quiz-progress-text">${vocabFlashIndex+1} / ${vocabFlashList.length}</div>
    </div>
    <div class="card quiz-card" style="text-align:center; min-height:280px; display:flex; flex-direction:column; justify-content:center; cursor:pointer;" onclick="flipFlashcard()">
      <span class="quiz-tag">${VOCAB_CATS[v.cat]||v.cat}</span>
      <div class="vocab-word">${v.word}</div>
      <div class="vocab-pos">${v.pos}</div>
      ${vocabFlashFlipped ? `
        <div style="font-size:22px; font-weight:700; color:var(--navy-800); margin:14px 0 16px;">${v.mean}</div>
        <div style="font-size:13.5px; color:var(--ink-soft); line-height:1.7; padding:0 10px;">
          <div>${v.ex}</div>
          <div style="margin-top:4px; color:var(--ink-soft);">${v.exJa}</div>
        </div>
      ` : `<div style="font-size:12.5px; color:var(--ink-soft); margin-top:20px;">タップして意味を表示</div>`}
    </div>
    <div class="quiz-footer">
      <button class="btn btn-outline btn-sm" onclick="prevFlashcard()" ${vocabFlashIndex===0?'style="visibility:hidden;"':''}>← 前へ</button>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-outline btn-sm" onclick="nextFlashcard(false)">わからない</button>
        <button class="btn btn-amber btn-sm" onclick="nextFlashcard(true)">覚えた <i data-lucide="check" class="icon-sm"></i></button>
      </div>
    </div>
  </div>
  `;
}

function flipFlashcard(){
  vocabFlashFlipped = !vocabFlashFlipped;
  render();
}

function prevFlashcard(){
  if(vocabFlashIndex > 0){
    vocabFlashIndex--;
    vocabFlashFlipped = false;
    render();
  }
}

function nextFlashcard(known){
  const v = vocabFlashList[vocabFlashIndex];
  if(known){
    state.vocabLearned[v.id] = true;
    saveState();
  }
  if(vocabFlashIndex < vocabFlashList.length-1){
    vocabFlashIndex++;
    vocabFlashFlipped = false;
    render();
  }else{
    navigate('vocab');
  }
}

// ===== Vocab Quiz (4-choice) =====
function startVocabQuiz(cat){
  const pool = cat==='all' ? [...VOCAB_DATA] : VOCAB_DATA.filter(v=>v.cat===cat);
  const shuffled = shuffle([...pool]);
  const questions = shuffled.map(v=>{
    const wrongPool = pool.filter(x=>x.id!==v.id);
    const wrongs = shuffle([...wrongPool]).slice(0,3).map(x=>x.mean);
    const choices = shuffle([v.mean, ...wrongs]);
    return {
      type:'vocab',
      id: v.id,
      question: v.word,
      sub: v.pos,
      choices,
      ans: choices.indexOf(v.mean),
      exp: `${v.word}（${v.pos}） = ${v.mean}\n例文: ${v.ex}\n訳: ${v.exJa}`
    };
  });
  quizSession = {mode:'quiz', type:'vocab', questions, index:0, correct:0, answered:false, selected:null};
  navigate('quiz');
}

// ===== Grammar Module =====
let grammarCatFilter = 'all';

function renderGrammarHome(){
  const cats = ['all', ...new Set(GRAMMAR_DATA.map(g=>g.cat))];
  const filtered = grammarCatFilter==='all' ? GRAMMAR_DATA : GRAMMAR_DATA.filter(g=>g.cat===grammarCatFilter);
  const doneInFilter = filtered.filter(g=>state.grammarDone[g.id]).length;
  const correctInFilter = filtered.filter(g=>state.grammarDone[g.id]==='correct').length;

  return `
  <div class="section-head">
    <p class="eyebrow">GRAMMAR — PART 5</p>
    <h2>文法問題</h2>
    <p>短文穴埋め形式（Part5）でよく出る文法項目を分野別に練習します。1問ごとに解説が表示されます。</p>
  </div>

  <div class="filter-row">
    ${cats.map(c=>`<button class="filter-pill ${grammarCatFilter===c?'active':''}" onclick="setGrammarFilter('${c}')">${c==='all'?'すべて':c}</button>`).join('')}
  </div>

  <div class="card" style="padding:22px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
    <div>
      <h3 style="margin:0 0 6px; font-size:15px;">${grammarCatFilter==='all'?'全分野':grammarCatFilter} — ${filtered.length}問</h3>
      <p style="margin:0; font-size:13px; color:var(--ink-soft);">解答済み ${doneInFilter}問（正解 ${correctInFilter}問）</p>
    </div>
    <button class="btn btn-amber" onclick="startGrammarQuiz('${grammarCatFilter}')">この分野で開始</button>
  </div>

  <div class="grid grid-3">
    ${cats.filter(c=>c!=='all').map(c=>{
      const items = GRAMMAR_DATA.filter(g=>g.cat===c);
      const done = items.filter(g=>state.grammarDone[g.id]).length;
      const pct = Math.round((done/items.length)*100);
      return `
      <div class="card module-card" onclick="startGrammarQuiz('${c}')">
        <div class="module-icon tint-coral"><i data-lucide="puzzle"></i></div>
        <h3>${c}</h3>
        <p>${items.length}問収録</p>
        <div class="module-progress-bar"><div class="module-progress-fill" style="width:${pct}%; background:var(--amber-500);"></div></div>
        <div class="module-foot"><span>${done} / ${items.length}</span><span>${pct}%</span></div>
      </div>`;
    }).join('')}
  </div>
  `;
}

function setGrammarFilter(c){
  grammarCatFilter = c;
  render();
}

function startGrammarQuiz(cat){
  const pool = cat==='all' ? [...GRAMMAR_DATA] : GRAMMAR_DATA.filter(g=>g.cat===cat);
  const questions = shuffle([...pool]).map(g=>({
    type:'grammar', id:g.id, question:g.q, choices:g.choices, ans:g.ans, exp:g.exp
  }));
  quizSession = {mode:'quiz', type:'grammar', questions, index:0, correct:0, answered:false, selected:null};
  navigate('quiz');
}

// ===== Listening Module =====
let listenSpeed = 0.85;
let currentAudioEl = null; // 高品質TTS再生中のAudioオブジェクト
let ttsPlaying = false;

// Vercelにデプロイしたプロキシ関数のベースURL。
// デプロイ後に発行される実際のURLに書き換えてください（例: https://your-project.vercel.app）。
// 空文字のままの場合は、ブラウザ標準の音声合成（Web Speech API）のみが使われます。
const API_PROXY_BASE = '';

function isProxyConfigured(){
  return !!API_PROXY_BASE;
}

function renderListeningHome(){
  const p2 = LISTENING_DATA.filter(l=>l.part===2);
  const p3 = LISTENING_DATA.filter(l=>l.part===3);
  const doneP2 = p2.filter(l=>state.listeningDone[l.id]).length;
  const doneP3 = p3.filter(l=>state.listeningDone[l.id]).length;
  const synthOk = ('speechSynthesis' in window);

  return `
  <div class="section-head">
    <p class="eyebrow">LISTENING — PART 2 / 3</p>
    <h2>リスニング問題</h2>
    <p>${isProxyConfigured() ? '高品質な音声合成APIで読み上げます。' : '音声合成（読み上げ）機能を使って出題します。'}再生速度の調整や繰り返し再生が可能です。スクリプト（台本）も確認できます。</p>
  </div>

  ${!synthOk && !isProxyConfigured() ? `<div class="card" style="padding:16px; margin-bottom:20px; border-left:3px solid var(--red);"><b>このブラウザは音声合成に対応していない可能性があります。</b> Chrome等の最新ブラウザでの利用を推奨します。</div>` : ''}

  <div class="grid grid-2">
    <div class="card module-card" onclick="startListeningQuiz(2)">
      <div class="module-icon tint-green"><i data-lucide="headphones"></i></div>
      <h3>Part 2 形式（応答問題）</h3>
      <p>質問を聞いて、最も適切な応答を3択から選びます。全${p2.length}問。</p>
      <div class="module-progress-bar"><div class="module-progress-fill" style="width:${Math.round(doneP2/p2.length*100)}%; background:var(--amber-500);"></div></div>
      <div class="module-foot"><span>${doneP2} / ${p2.length}</span><span>${Math.round(doneP2/p2.length*100)}%</span></div>
    </div>
    <div class="card module-card" onclick="startListeningQuiz(3)">
      <div class="module-icon tint-green"><i data-lucide="message-square"></i></div>
      <h3>Part 3 形式（会話問題）</h3>
      <p>短い会話を聞いて、内容に関する設問に答えます。全${p3.length}問。</p>
      <div class="module-progress-bar"><div class="module-progress-fill" style="width:${Math.round(doneP3/p3.length*100)}%; background:var(--amber-500);"></div></div>
      <div class="module-foot"><span>${doneP3} / ${p3.length}</span><span>${Math.round(doneP3/p3.length*100)}%</span></div>
    </div>
  </div>
  `;
}

function startListeningQuiz(part){
  const pool = LISTENING_DATA.filter(l=>l.part===part);
  const questions = pool.map(l=>{
    if(part===2){
      return {type:'listening', id:l.id, audio:l.audio, question:'音声を聞いて最も適切な応答を選んでください。', choices:l.choices, ans:l.ans, exp:l.exp, transcript:l.audio};
    }else{
      return {type:'listening', id:l.id, audio:l.audio, question:l.q, choices:l.choices, ans:l.ans, exp:l.exp, transcript:l.audio};
    }
  });
  quizSession = {mode:'quiz', type:'listening', questions, index:0, correct:0, answered:false, selected:null};
  navigate('quiz');
}

// メインの読み上げ関数。
// 1) Vercelプロキシ（API_PROXY_BASE）が設定されていれば、まずそちらの高品質TTSを試す
// 2) 未設定、またはプロキシ呼び出しが失敗した場合は、ブラウザ標準のWeb Speech APIにフォールバック
async function speakText(text, rate){
  if(ttsPlaying) return; // 二重再生防止
  const effectiveRate = rate || listenSpeed;

  if(isProxyConfigured()){
    const ok = await speakViaProxy(text, effectiveRate);
    if(ok) return;
    console.warn('Vercelプロキシ経由のTTSに失敗したため、ブラウザ標準の読み上げにフォールバックします。');
  }
  speakViaBrowser(text, effectiveRate);
}

async function speakViaProxy(text, rate){
  ttsPlaying = true;
  updatePlayButtonState();
  try{
    const res = await fetch(`${API_PROXY_BASE}/api/tts`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({text, rate})
    });
    if(!res.ok){
      console.error('TTSプロキシ呼び出し失敗:', res.status, await res.text().catch(()=>'')); 
      return false;
    }
    const data = await res.json();
    if(!data.audioContent) return false;

    if(currentAudioEl){ currentAudioEl.pause(); currentAudioEl = null; }
    currentAudioEl = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
    await new Promise((resolve,reject)=>{
      currentAudioEl.onended = resolve;
      currentAudioEl.onerror = reject;
      currentAudioEl.play().catch(reject);
    });
    return true;
  }catch(e){
    console.error('speakViaProxy error:', e);
    return false;
  }finally{
    ttsPlaying = false;
    updatePlayButtonState();
  }
}

function speakViaBrowser(text, rate){
  if(!('speechSynthesis' in window)){
    console.warn('このブラウザはWeb Speech APIに対応していません。');
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = rate;
  ttsPlaying = true;
  updatePlayButtonState();
  utter.onend = () => { ttsPlaying = false; updatePlayButtonState(); };
  utter.onerror = () => { ttsPlaying = false; updatePlayButtonState(); };
  window.speechSynthesis.speak(utter);
}

function updatePlayButtonState(){
  const btn = document.getElementById('play-btn');
  if(btn) btn.classList.toggle('playing', ttsPlaying);
}

function setListenSpeed(s){
  listenSpeed = s;
  render();
}

function toggleTranscript(){
  const box = document.getElementById('transcript-box');
  if(box) box.classList.toggle('show');
}

// ===== Reading Module =====
function renderReadingHome(){
  return `
  <div class="section-head">
    <p class="eyebrow">READING — PART 7</p>
    <h2>長文読解</h2>
    <p>メール、広告、社内通知、新聞記事などビジネスでよく登場する文書形式です。日本語訳を見ながら内容を理解し、設問に答えましょう。</p>
  </div>

  <div class="grid grid-2">
    ${READING_DATA.map(r=>{
      const done = state.readingDone[r.id];
      return `
      <div class="card module-card" onclick="startReadingQuiz(${r.id})">
        <div class="module-icon tint-purple"><i data-lucide="newspaper"></i></div>
        <h3>${r.title}</h3>
        <p>${r.questions.length}問の設問付き。${done ? `前回 ${done.correct}/${done.total} 正解` : '未挑戦'}</p>
        <div class="module-foot"><span>${r.type.toUpperCase()}</span><span>${done ? '✓ 完了' : '挑戦する →'}</span></div>
      </div>`;
    }).join('')}
  </div>
  `;
}

function startReadingQuiz(passageId){
  const r = READING_DATA.find(x=>x.id===passageId);
  const questions = r.questions.map((q,i)=>({
    type:'reading', id:`${r.id}-${i}`, question:q.q, choices:q.choices, ans:q.ans, exp:q.exp
  }));
  quizSession = {mode:'quiz', type:'reading', questions, index:0, correct:0, answered:false, selected:null, passage:r, showJa:false};
  navigate('quiz');
}

// ===== Quiz Common Renderer =====
function renderQuiz(){
  if(!quizSession) return `<div class="empty-note">セッションがありません。</div>`;
  if(quizSession.mode==='flashcard') return renderFlashcard();
  if(quizSession.mode==='result') return renderQuizResult();
  const {type, questions, index} = quizSession;
  const q = questions[index];
  const pct = Math.round((index/questions.length)*100);

  const typeLabel = {vocab:'単語テスト', grammar:'文法問題', listening:'リスニング', reading:'長文読解'}[type];
  const backPage = {vocab:'vocab', grammar:'grammar', listening:'listening', reading:'reading'}[type];

  let bodyHtml = '';

  if(type==='vocab'){
    bodyHtml = `
      <span class="quiz-tag">${typeLabel}</span>
      <div class="vocab-word">${q.question}</div>
      <div class="vocab-pos">${q.sub}</div>
      <div style="margin-top:14px;">${renderChoices(q)}</div>
    `;
  } else if(type==='grammar'){
    bodyHtml = `
      <span class="quiz-tag">${typeLabel}</span>
      <div class="quiz-question">${q.question}</div>
      ${renderChoices(q)}
    `;
  } else if(type==='listening'){
    bodyHtml = `
      <span class="quiz-tag">${typeLabel}</span>
      <div class="quiz-question">${q.question}</div>
      <div class="audio-control">
        <button class="play-btn" id="play-btn" onclick="speakText(\`${q.audio.replace(/`/g,"'")}\`)"><i data-lucide="play"></i></button>
      </div>
      <div class="speed-controls">
        ${[0.7,0.85,1.0].map(s=>`<button class="speed-btn ${listenSpeed===s?'active':''}" onclick="setListenSpeed(${s})">${s}x</button>`).join('')}
      </div>
      <div class="transcript-toggle" onclick="toggleTranscript()">スクリプト（台本）を表示 / 非表示</div>
      <div class="transcript-box" id="transcript-box">${q.transcript}</div>
      <div style="margin-top:18px;">${renderChoices(q)}</div>
    `;
  } else if(type==='reading'){
    const r = quizSession.passage;
    const isFirstQ = index===0 || questions[index-1].id.split('-')[0] !== q.id.split('-')[0];
    bodyHtml = `
      <span class="quiz-tag">${typeLabel} — ${r.title}</span>
      ${isFirstQ || true ? `
      <span class="passage-type-tag">${r.type}</span>
      <div class="passage-box" id="passage-en">${r.passage}</div>
      <div class="ja-toggle" onclick="toggleJa()">日本語訳を表示 / 非表示</div>
      <div class="passage-box" id="passage-ja" style="display:none;">${r.passageJa}</div>
      ` : ''}
      <div class="quiz-question" style="margin-top:18px;">設問 ${(index%r.questions.length)+1}: ${q.question}</div>
      ${renderChoices(q)}
    `;
  }

  return `
  <div class="quiz-wrap">
    <a class="back-link" onclick="exitQuiz('${backPage}')">← 戻る</a>
    <div class="quiz-progress">
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%;"></div></div>
      <div class="quiz-progress-text">${index+1} / ${questions.length}</div>
    </div>
    <div class="card quiz-card">
      ${bodyHtml}
      ${quizSession.answered ? `
        <div class="explain-box"><b>解説：</b><br>${q.exp.replace(/\n/g,'<br>')}</div>
        <div class="quiz-footer">
          <span></span>
          <button class="btn btn-amber" onclick="nextQuizQuestion()">${index<questions.length-1?'次の問題へ →':'結果を見る →'}</button>
        </div>
      ` : ''}
    </div>
  </div>
  `;
}

function renderChoices(q){
  const letters = ['A','B','C','D'];
  return `<div class="choice-list">
    ${q.choices.map((c,i)=>{
      let cls = 'choice-btn';
      if(quizSession.answered){
        if(i===q.ans) cls += ' correct';
        else if(i===quizSession.selected) cls += ' wrong';
      }
      return `<button class="${cls}" ${quizSession.answered?'disabled':''} onclick="selectAnswer(${i})">
        <span class="choice-letter">${letters[i]}</span><span>${c}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function toggleJa(){
  const en = document.getElementById('passage-en');
  const ja = document.getElementById('passage-ja');
  if(ja.style.display==='none'){ja.style.display='block'; en.style.display='none';}
  else {ja.style.display='none'; en.style.display='block';}
}

function selectAnswer(i){
  if(quizSession.answered) return;
  const q = quizSession.questions[quizSession.index];
  quizSession.selected = i;
  quizSession.answered = true;
  const isCorrect = i===q.ans;
  if(isCorrect) quizSession.correct++;

  // persist per-type progress
  if(quizSession.type==='vocab'){
    if(isCorrect) state.vocabLearned[q.id]=true;
  } else if(quizSession.type==='grammar'){
    state.grammarDone[q.id] = isCorrect?'correct':'wrong';
  } else if(quizSession.type==='listening'){
    state.listeningDone[q.id] = isCorrect?'correct':'wrong';
  }
  saveState();
  render();
}

function nextQuizQuestion(){
  if(quizSession.index < quizSession.questions.length-1){
    quizSession.index++;
    quizSession.answered = false;
    quizSession.selected = null;
    render();
  }else{
    finishQuiz();
  }
}

function finishQuiz(){
  const {type, questions, correct, passage} = quizSession;
  if(type==='reading' && passage){
    state.readingDone[passage.id] = {correct, total:questions.length};
    saveState();
  }
  const typeLabel = {vocab:'単語テスト', grammar:'文法問題', listening:'リスニング', reading:'長文読解'}[type];
  state.sessionLog.push({
    date: new Date().toLocaleDateString('ja-JP'),
    type, typeLabel, correct, total: questions.length
  });
  saveState();
  quizSession.mode = 'result';
  render();
}

function renderQuizResult(){
  const {type, questions, correct} = quizSession;
  const total = questions.length;
  const pct = Math.round((correct/total)*100);
  const typeLabel = {vocab:'単語テスト', grammar:'文法問題', listening:'リスニング', reading:'長文読解'}[type];
  const backPage = {vocab:'vocab', grammar:'grammar', listening:'listening', reading:'reading'}[type];

  let msg = '';
  if(pct>=80) msg = '素晴らしい結果です！この調子で他の分野にも挑戦しましょう。';
  else if(pct>=50) msg = '良い感じです。間違えた問題は復習しておきましょう。';
  else msg = 'もう一度復習してから再挑戦してみましょう。基礎固めが大切です。';

  return `
  <div class="quiz-wrap">
    <div class="card result-wrap">
      <p class="eyebrow" style="text-align:center;">${typeLabel} — RESULT</p>
      <div class="result-score">${correct}<span> / ${total}</span></div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:14px; color:var(--amber-600); font-weight:700; margin-bottom:14px;">正答率 ${pct}%</div>
      <div class="result-msg">${msg}</div>
      <div class="result-actions">
        <button class="btn btn-outline" onclick="navigate('dashboard')">ホームへ</button>
        <button class="btn btn-outline" onclick="navigate('${backPage}')">${typeLabel}一覧へ</button>
        <button class="btn btn-amber" onclick="retryQuiz()">もう一度挑戦</button>
      </div>
    </div>
  </div>
  `;
}

function retryQuiz(){
  const {type} = quizSession;
  if(type==='vocab') startVocabQuiz(vocabFilter);
  else if(type==='grammar') startGrammarQuiz(grammarCatFilter);
  else if(type==='listening') startListeningQuiz(quizSession.questions[0] ? (LISTENING_DATA.find(l=>l.id===quizSession.questions[0].id)||{}).part || 2 : 2);
  else if(type==='reading') startReadingQuiz(quizSession.passage.id);
}

function exitQuiz(page){
  if(quizSession && quizSession.mode==='quiz' && !quizSession.answered && quizSession.index>0){
    // partial progress already saved per-question; just navigate
  }
  quizSession = null;
  navigate(page);
}

// ===== Utils =====
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// アプリの初期化エントリポイント
document.addEventListener('DOMContentLoaded', initGoogleAuth);

