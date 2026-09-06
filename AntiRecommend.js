// --- STATE MANAGEMENT AND VARIABLES SETUP ---
let loadedMovieData = null;
let hasAvailableStream = false;

// --- ELEMENTS REFERENCE ---
const textUserInput = document.getElementById('text-user-input');
const processingDetailsLog = document.getElementById('processing-details');
const selectBirthYear = document.getElementById('select-birth-year');
const charCounter = document.getElementById('char-counter');
const btnTrigger = document.getElementById('btn-trigger');
const btnToggleLog = document.getElementById('btn-toggle-log');
const btnReRecommend = document.getElementById('btn-re-recommend');
const btnShareX = document.getElementById('btn-share-x');

// VIEWS
const viewInput = document.getElementById('view-input');
const viewProcessing = document.getElementById('view-processing');
const viewResult = document.getElementById('view-result');

// RESULT CARDS
const resPoster = document.getElementById('res-poster');
const resMeta = document.getElementById('res-meta');
const resTitle = document.getElementById('res-title');
const resOriginalTitle = document.getElementById('res-original-title');
const resAiOverview = document.getElementById('res-ai-overview');
const resImpossibleAdvice = document.getElementById('res-impossible-advice');

  // 1ページ目の対象サブスク一覧（表示名と判定用キーワード）
  const serviceList = [
    { name: "Amazon Prime Video", label: "アマプラ",keys: ["amazon", "prime",'amazon prime video', 'amazon prime video with ads', 'amazon video'] },
    { name: "Netflix", label: "ネトフリ",keys: ["netflix"]  },
    { name: "U-NEXT", label: "ユーネク",keys: ["u-next", "unext"] },
    { name: "Disney+", label: "ディズニー+",keys: ["disney", 'disney plus', 'disney+'] },
    { name: "Apple TV+", label: "Apple TV",keys: ["apple", "apple tv","appletv",'apple tv plus', 'apple tv+'] },
    { name: "Hulu", label: "Hulu", keys: ["hulu"] },
    { name: "dアニメストア", label: "dアニメストア", keys: ["d anime", "danime","d anime store",'danime store', 'dアニメストア']},
    { name: "ABEMAプレミアム", label: "ABEMA", keys: ['abema', 'abema premium'] },
    { name: "WOWOWオンデマンド", label: "WOWOW", keys: ["wowow",'wowow on demand']  },
    { name: "FODプレミアム", label: "FOD", keys: ["fod", 'fod premium'] },
    { name: "TELASA", label: "TELASA",keys: ["telasa"] },
    { name: "Lemino", label: "Lemino", keys: ["lemino"]},
    { name: "Rakuten TV", label: "Rakuten",keys: ["rakuten","rakutentv","rakuten tv"] },
    { name: "クランクイン！ビデオ", label: "Crank-in", keys: ["crank-in","crank","crankin"] },
    { name: "Google Play",  label: "Google Play", keys: ["google play","google","googleplay"]  },
    { name: "YouTube Movies",  label: "YouTube Movies",keys: ["youtube movies","youtube","youtubemovies"]  },
    { name: "DMM TV",label: "DMM", keys: ["dmm tv","dmm","dmmtv"]},
    { name: "ビデオマーケット", label: "ビデオマーケット", keys: ["video market","videomarket"]},
    { name: "アニメタイムズ", label: "アニメタイムズ",  keys: ["anime times","animetimes"] },
    { name: "スターチャンネルEX", label: "Star Channel",  keys: ["star channel","starchannel","star channel ex"] },
    { name: "MUBI", label: "MUBI", keys: ["mubi"]}
  ];

// --- 選択状態を保持する Set （関数の外で定義） ---
const selectedSubscList = new Set();
const selectedTheaterList = new Set();

// アコーディオン開閉ロジック
function toggleAccordion(id) {
  const panel = document.getElementById(id);
  if (panel) {
    panel.classList.toggle('hidden');
  }
}

// Logger
function addLog(phaseName, message, type = "info") {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  let colorClass = "text-neutral-500";
  if (type === "success") colorClass = "text-emerald-400 font-bold";
  if (type === "error") colorClass = "text-rose-500 font-bold";
  if (type === "warning") colorClass = "text-amber-500 font-bold";

  const logLine = document.createElement('div');
  logLine.className = "border-b border-neutral-900 pb-1 last:border-0 last:pb-0";
  logLine.innerHTML = `
    <span class="text-neutral-700 font-mono">[${timeStr}]</span>
    <span class="font-bold uppercase ${colorClass}">[${phaseName}]</span>
    <span class="text-neutral-400">${message}</span>
  `;
  processingDetailsLog.appendChild(logLine);
  processingDetailsLog.scrollTop = processingDetailsLog.scrollHeight;
}

// 逆推薦エンジンの実行
async function startReverseEngine() {
if (btnTrigger.disabled) return;
// 多重送信防止
  btnTrigger.disabled = true;
  textUserInput.blur();

  const textVal = textUserInput.value.trim();
  const birthYear = selectBirthYear ? selectBirthYear.value : '';
  const selectedTheaters = Array.from(selectedTheaterList);

let excludedTitles = [];
  try {
    const rawExcluded = localStorage.getItem('UNWATCHABLE_EXCLUDED_TITLES');
    const parsed = rawExcluded ? JSON.parse(rawExcluded) : [];
    excludedTitles = Array.isArray(parsed) ? parsed : []; // 🛡️ 配列であることを保証
  } catch (e) {
    console.warn("localStorage の読み込みに失敗しました:", e);
  }

  const payload = {
    userPreference: textVal,
    selectedSubscs: Array.from(selectedSubscList),
    birthYear: birthYear,
    selectedTheaters: selectedTheaters,
    excludedTitles: excludedTitles
  };

// 画面の切り替え
  viewInput.classList.add('hidden');
  viewProcessing.classList.remove('hidden');
  processingDetailsLog.innerHTML = '';

  //送信前の確定ログ
  addLog("DISPATCH", "推論エンジンへ解析リクエストを送信中...", "info");

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `サーバーエラー: ${res.status}`);
    }

    loadedMovieData = await res.json();

    // サーバーログの展開
    if (Array.isArray(loadedMovieData.logs)) {
      loadedMovieData.logs.forEach(l => {
        addLog(l.phase, l.msg, l.type);
      });
    }
    addLog("COMPLETE", "逆レコメンド映画の確定に成功しました", "success");

    // 映画タイトルを除外リストに追加して保存
    if (loadedMovieData && loadedMovieData.title) {
      if (!excludedTitles.includes(loadedMovieData.title)) {
        excludedTitles.push(loadedMovieData.title);
      }
      try {
        localStorage.setItem('UNWATCHABLE_EXCLUDED_TITLES', JSON.stringify(excludedTitles));
      } catch (e) {
        console.warn("localStorage の保存に失敗しました:", e);
      }
    }

    renderResultScreen();

  } catch (err) {
    addLog("CRITICAL ERROR", err.message, "error");
    alert("エラーが発生しました: " + err.message);
    viewProcessing.classList.add('hidden');
    viewInput.classList.remove('hidden');
    updateGoButtonState();
  }
}

// Render results
function renderResultScreen() {
  if (!loadedMovieData) return;

  //初期代入（データがない場合は直接ダミーをセット）
  const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23171717'/%3E%3Ctext x='50%25' y='50%25' fill='%23737373' font-family='monospace' font-size='20' text-anchor='middle' dominant-baseline='middle'%3ENO IMAGE%3C/text%3E%3C/svg%3E";
  resPoster.src = loadedMovieData.poster_path || fallbackSvg;
  resPoster.onerror = () => {
  resPoster.onerror = null; // ハンドラーの解除 🛡️
    resPoster.src = fallbackSvg;
  };

  // loadedMovieData.year が存在すれば「〇〇年公開」、なければ「公開年不明」
  const releaseYearText = loadedMovieData.year ? `${loadedMovieData.year}年公開` : '公開年不明';

  // 画面にセット
  resMeta.innerText = `${loadedMovieData.genre_name} • ${releaseYearText}`;
  resTitle.innerText = loadedMovieData.title;
  resOriginalTitle.innerText = `原題: ${loadedMovieData.original_title}`;
  resAiOverview.innerText = loadedMovieData.ai_overview;
  resImpossibleAdvice.innerText = loadedMovieData.impossible_advice;

  const tmdbLinkElement = document.getElementById('res-tmdb-link');
  if (loadedMovieData.id) {
    tmdbLinkElement.href = `https://www.themoviedb.org/movie/${loadedMovieData.id}`;
    tmdbLinkElement.classList.remove('hidden');
  } else {
    tmdbLinkElement.classList.add('hidden');
  }

  viewProcessing.classList.add('hidden');
  viewResult.classList.remove('hidden');

  //サブスクグリッドの取得と初期化
  const subscGrid = document.getElementById('result-subsc-grid');
  const txtSummary = document.getElementById('txt-stream-summary');
  subscGrid.innerHTML = '';

  //TMDBから取得したプロバイダー名の一覧を平坦化
  const activeProviders = [];
  if (loadedMovieData.jpData) {
    const jp = loadedMovieData.jpData;
    const allProviders = [
      ...(jp.flatrate || []),
      ...(jp.rent || []),
      ...(jp.buy || [])
    ];
    allProviders.forEach(p => {
      if (p.provider_name) activeProviders.push(p.provider_name.toLowerCase());
    });
  }

  hasAvailableStream = false;

  //ボタンを動的に生成して追加
  serviceList.forEach(service => {
    const isAvailable = service.keys.some(k => 
      activeProviders.some(p => p.includes(k.toLowerCase()))
    );
    const btn = document.createElement('div');
    const displayName = service.label || service.name;
    
    if (isAvailable) {
      hasAvailableStream = true;
      btn.className = "px-2.5 py-1 rounded-md border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 font-bold text-[11px] text-center shadow-sm";
      btn.textContent = `${displayName} ○`;
    } else {
      btn.className = "px-2.5 py-1 rounded-md border border-neutral-800 bg-neutral-950 text-[11px] text-neutral-500 text-center line-through";
      btn.textContent = displayName;
    }
    
    subscGrid.appendChild(btn);
  });

  //サマリー表示の更新
  if (hasAvailableStream) {
    txtSummary.innerText = "※一部配信あり(TMDB調べ)";
    txtSummary.className = "text-[10px] font-mono text-amber-400";
  } else {
    txtSummary.innerText = "※鑑賞不能(TMDB調べ)";
    txtSummary.className = "text-[10px] font-mono text-emerald-400";
  }
}

// ボタン活性化判定ロジック
function updateGoButtonState() {
  const isTextFilled = textUserInput.value.trim().length > 0;
  const isSubscSelected = selectedSubscList.size > 0;
  btnTrigger.disabled = !(isTextFilled && isSubscSelected);
}
// --- イベントリスナーの登録 ---

// 1. 逆検索実行
btnTrigger.addEventListener('click', startReverseEngine);

// 2. ショートカット送信 (Ctrl/Cmd + Enter)
textUserInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !btnTrigger.disabled) {
    e.preventDefault();
    startReverseEngine();
  }
});

// 3. 文字数カウンターと入力監視
textUserInput.addEventListener('input', () => {
  const currentLength = textUserInput.value.length;
  charCounter.innerText = `${currentLength}/140文字`;

  if (currentLength >= 140) {
    charCounter.className = "text-xs font-mono text-amber-400 font-bold";
  } else {
    charCounter.className = "text-xs font-mono text-neutral-500";
  }
  updateGoButtonState();
});

if (selectBirthYear) {
  selectBirthYear.addEventListener('change', updateGoButtonState);
}

// 4. 動作ログのアコーディオン切り替え
if (btnToggleLog) {
  btnToggleLog.addEventListener('click', () => {
    toggleAccordion('processing-details');
  });
}

// 5. やり直し処理
btnReRecommend.addEventListener('click', () => {
  viewResult.classList.add('hidden');
  viewInput.classList.remove('hidden');
  charCounter.innerText = "0/140文字";
  charCounter.className = "text-xs font-mono text-neutral-500";
  textUserInput.value = '';
// ↓ メモリ内の保持データも明示的に初期化しておくと状態管理が完全にクリーンになります
  loadedMovieData = null;
  hasAvailableStream = false;
  if (selectBirthYear) selectBirthYear.value = '';

  const theaterDetails = document.querySelector('details');
  if (theaterDetails) theaterDetails.open = false;

  selectedSubscList.clear();
  selectedTheaterList.clear();
  document.querySelectorAll('.sub-btn, .theater-btn').forEach(btn => {
    btn.classList.remove('border-white', 'text-white', 'bg-neutral-800', 'font-bold');
    btn.classList.add('border-neutral-800', 'text-neutral-400', 'bg-neutral-950');
  });

  updateGoButtonState();
});

// 6. X (Twitter) シェア
btnShareX.addEventListener('click', () => {
  if (!loadedMovieData) return;

  const yearText = loadedMovieData.year ? `(${loadedMovieData.year}年)` : '(公開年不明)';
  let shareText = '';
  if (hasAvailableStream) {
    shareText = `「${loadedMovieData.title}」${yearText}という、日本国内で観る手段がちょっとだけある映画を逆レコメンドされました。\n#絶対に見られない映画`;
  } else {
    shareText = `「${loadedMovieData.title}」${yearText}という、日本国内で観る手段が全くない映画を逆レコメンドされました。\n#絶対に見られない映画`;
  }
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`;
  window.open(shareUrl, '_blank');
});

// 7. サブスク選択ボタンの切り替え
document.querySelectorAll('.sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const serviceName = btn.getAttribute('data-service');
    if (selectedSubscList.has(serviceName)) {
      selectedSubscList.delete(serviceName);
      btn.classList.remove('border-white', 'text-white', 'bg-neutral-800', 'font-bold');
      btn.classList.add('border-neutral-800', 'text-neutral-400', 'bg-neutral-950');
    } else {
      selectedSubscList.add(serviceName);
      btn.classList.remove('border-neutral-800', 'text-neutral-400', 'bg-neutral-950');
      btn.classList.add('border-white', 'text-white', 'bg-neutral-800', 'font-bold');
    }
    updateGoButtonState();
  });
});

// 8. 映画館選択ボタンの切り替え
document.querySelectorAll('.theater-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theaterName = btn.getAttribute('data-theater');
    if (selectedTheaterList.has(theaterName)) {
      selectedTheaterList.delete(theaterName);
      btn.classList.remove('border-white', 'text-white', 'bg-neutral-800', 'font-bold');
      btn.classList.add('border-neutral-800', 'text-neutral-400', 'bg-neutral-950');
    } else {
      selectedTheaterList.add(theaterName);
      btn.classList.remove('border-neutral-800', 'text-neutral-400', 'bg-neutral-950');
      btn.classList.add('border-white', 'text-white', 'bg-neutral-800', 'font-bold');
    }
    updateGoButtonState();
  });
});