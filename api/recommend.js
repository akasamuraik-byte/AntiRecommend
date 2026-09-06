// --- 定数・マスタデータ ---
const serviceList = [
  { name: 'Netflix', keys: ['netflix'] },
  { name: 'Amazon Prime Video', keys: ["amazon", "prime",'amazon prime video', 'amazon prime video with ads', 'amazon video'] },
  { name: 'U-NEXT', keys: ["u-next", "unext"] },
  { name: 'Disney+', keys: ["disney", 'disney plus', 'disney+'] },
  { name: 'Hulu', keys: ['hulu'] },
  { name: 'Lemino', keys: ['lemino'] },
  { name: 'dアニメストア', keys: ["d anime", "danime","d anime store",'danime store', 'dアニメストア'] },
  { name: 'Apple TV+', keys: ["apple", "apple tv","appletv",'apple tv plus', 'apple tv+'] },
  { name: 'ABEMAプレミアム', keys: ['abema', 'abema premium'] },
  { name: 'WOWOWオンデマンド', keys: ["wowow",'wowow on demand'] },
  { name: 'FODプレミアム', keys: ['fod', 'fod premium'] },
  { name: 'TELASA', keys: ['telasa'] },
  { name: "Rakuten TV", keys: ["rakuten","rakutentv","rakuten tv"] },
  { name: "クランクイン！ビデオ", keys: ["crank-in","crank","crankin"] },
  { name: "Google Play", keys: ["google play","google","googleplay"]  },
  { name: "YouTube Movies", keys: ["youtube movies","youtube","youtubemovies"]  },
  { name: "DMM TV", keys: ["dmm tv","dmm","dmmtv"]},
  { name: "ビデオマーケット", keys: ["video market","videomarket"]},
  { name: "アニメタイムズ", keys: ["anime times","animetimes"] },
  { name: "スターチャンネルEX", keys: ["star channel","starchannel","star channel ex"] },
  { name: "MUBI", keys: ["mubi"]}
];

     
  function getInverseThemes(currentYear) {
    return {
      action_sf: [
        { genreId: 36, genreName: "歴史劇", startYear: 1900, endYear: currentYear - 2, vibeTag: "激動の歴史と人間の葛藤" },
        { genreId: 99, genreName: "ドキュメンタリー", startYear: 1900, endYear: currentYear - 2, vibeTag: "剥き出しの現実" },
        { genreId: 10402, genreName: "音楽/オペラ", startYear: 1900, endYear: currentYear - 2, vibeTag: "静寂と旋律の対話" }
      ],
      romance_drama: [
        { genreId: 27, genreName: "カルトホラー", startYear: 1900, endYear: currentYear - 2, vibeTag: "不条理な恐怖と狂気" },
        { genreId: 878, genreName: "ハードSF", startYear: 1900, endYear: currentYear - 2, vibeTag: "冷徹な論理と虚無" },
        { genreId: 28, genreName: "バイオレンスアクション", startYear: 1900, endYear: currentYear - 2, vibeTag: "肉体と硝煙の衝突" }
      ],
      horror_thriller: [
        { genreId: 10751, genreName: "ファミリー/ハートフル", startYear: 1900, endYear: currentYear - 2, vibeTag: "無垢なる温もり" },
        { genreId: 35, genreName: "ナンセンスコメディ", startYear: 1900, endYear: currentYear - 2, vibeTag: "脱力と不条理な笑い" },
        { genreId: 10749, genreName: "純愛ロマンス", startYear: 1900, endYear: currentYear - 2, vibeTag: "甘美で純粋な情熱" }
      ],
      anime_pop: [
        { genreId: 18, genreName: "重厚な人間ドラマ", startYear: 1900, endYear: currentYear - 2, vibeTag: "モノクロームの人生讃歌" },
        { genreId: 99, genreName: "社会派ドキュメンタリー", startYear: 1900, endYear: currentYear - 2, vibeTag: "直視すべき世界の輪郭" },
        { genreId: 9648, genreName: "ミステリー", startYear: 1900, endYear: currentYear - 2, vibeTag: "煙草と影の心理戦" }
      ]
    };
  }

// 見放題契約の判定
function hasSubscribedFlatrate(jpData, selectedSubscList, serviceList) {
  if (!jpData || !Array.isArray(jpData.flatrate)) return false;
  const selectedSubscSet = new Set(selectedSubscList);

  for (const provider of jpData.flatrate) {
    const pName = provider.provider_name.toLowerCase();
    const matchedService = serviceList.find(s => s.keys.some(k => pName.includes(k.toLowerCase())));
    if (matchedService && selectedSubscSet.has(matchedService.name)) {
      return true;
    }
  }
  return false;
}

// AIのJSONレスポンスを安全にパース
function safeParseAiJson(rawText) {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("応答内に有効な JSON オブジェクトが見つかりませんでした。");
  }
  return JSON.parse(jsonMatch[0].trim());
}

// Fisher-Yates による公平なシャッフル
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- メインハンドラー ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {  
      userPreference = '',
      selectedSubscs = [], 
      birthYear = '', 
      selectedTheaters = [], 
      excludedTitles = [] 
    } = req.body || {};

    // 型安全のためのフォールバック処理
    const prefText = typeof userPreference === 'string' ? userPreference : '';
    const safeSubscs = Array.isArray(selectedSubscs) ? selectedSubscs : [];
    const safeTheaters = Array.isArray(selectedTheaters) ? selectedTheaters : [];
    const safeExcludedTitles = Array.isArray(excludedTitles) ? excludedTitles : []; 

    const tmdbApiKey = process.env.TMDB_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const omdbApiKey = process.env.OMDB_API_KEY;
    const logs = [];
    const log = (phase, msg, type = "info") => logs.push({ phase, msg, type });

    // 必須キーの検証
    if (!tmdbApiKey || (!geminiApiKey && !groqApiKey)) {
      return res.status(500).json({ error: "サーバー側の必須APIキーが不足しています。" });
      }

    // 1. 対極ジャンルの推論
    const currentYear = new Date().getFullYear();
    const inverseThemes = getInverseThemes(currentYear);

    let deducedCategory = 'action_sf';
    if (prefText.includes('恋愛') || prefText.includes('ドラマ') || prefText.includes('エモ') || prefText.includes('泣き')) {
      deducedCategory = 'romance_drama';
      } else if (prefText.includes('ホラー') || prefText.includes('サスペンス') || prefText.includes('スリル') || prefText.includes('恐怖')) {
        deducedCategory = 'horror_thriller';
      } else if (prefText.includes('アニメ') || prefText.includes('ディズニー') || prefText.includes('ジブリ')) {
        deducedCategory = 'anime_pop';
      }

    const themeList = inverseThemes[deducedCategory] || inverseThemes['action_sf'];
    const selectedTheme = themeList[Math.floor(Math.random() * themeList.length)];

    const { genreId, genreName, startYear, endYear, vibeTag } = selectedTheme;
    log("VECTOR", `嗜好カテゴリ「${deducedCategory}」の逆位相テーマ「${selectedTheme.genreName} (${vibeTag})」を抽出`);

    // 2. TMDB Discover API 呼び出し
    const randomPage = Math.floor(Math.random() * 5) + 1;
    const baseUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&with_genres=${genreId}&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31&sort_by=popularity.desc&language=ja-JP&include_adult=false&vote_count.gte=20`;
      
    let discoverRes = await fetch(`${baseUrl}&page=${randomPage}`);
    if (!discoverRes.ok) throw new Error("TMDB Discover API へのアクセスに失敗しました。");
    let discoverData = await discoverRes.json();
      
    //結果が0件で、かつ1ページ目以外を叩いていた場合は page=1 で再試行
    if ((!discoverData.results || discoverData.results.length === 0) && randomPage !== 1) {
      discoverRes = await fetch(`${baseUrl}&page=1`);
      if (discoverRes.ok) {
        discoverData = await discoverRes.json();
      }
    }

    //それでも見つからない場合に初めてエラー
    if (!discoverData.results || discoverData.results.length === 0) {
      throw new Error("候補となる映画が見つかりませんでした。");
    }

    log("TMDB", `Discover API より候補作品を取得完了`);

    // 3. スコアリングと最適な1本の選定
    const availableMovies = discoverData.results.filter(movie => !safeExcludedTitles.includes(movie.title));
    // 未鑑賞の映画があればそれを使い、全滅していれば元データにフォールバック
    const pool = availableMovies.length > 0 ? availableMovies : discoverData.results;
    // プールからシャッフルして先頭5件を取り出す
    const candidates = shuffleArray([...pool]).slice(0, 5);
    
    // 候補作品のスコアリングを同時に並行処理 (Promise.all)
    const scoredCandidates = await Promise.all(
      candidates.map(async (movie) => {
        let jpData = null;
        try {
          const providerUrl = `https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${tmdbApiKey}`;
          const pRes = await fetch(providerUrl);
          if (pRes.ok) {
            const pData = await pRes.json();
            jpData = pData?.results?.JP || null;
          } else {
            console.warn(`TMDB providers fetch failed for movie ${movie.id}: HTTP ${pRes.status}`);
          }
        } catch (err) {
          console.warn(`TMDB providers network/parse error for movie ${movie.id}:`, err.message);
        }

    // アクセス度スコアの算出
    let accessScore = 0;
    if (hasSubscribedFlatrate(jpData, safeSubscs, serviceList)) {
      accessScore = 100;
    } else if( Array.isArray(jpData?.flatrate) && jpData.flatrate.length > 0) {
      accessScore = 40;
    } else if( Array.isArray(jpData?.rent) && jpData.rent.length > 0){
      accessScore = 20;
    } else if (Array.isArray(jpData?.buy) && jpData.buy.length > 0) {
      accessScore = 10;
    }

    // 年代スコア
    const rawYearStr = movie.release_date ? movie.release_date.substring(0, 4) : '';
    const parsedYear = parseInt(rawYearStr, 10);
    const movieYear = isNaN(parsedYear) ? 2000 : parsedYear;
    const parsedBirthYear = parseInt(birthYear, 10);
    const targetEra = Number.isInteger(parsedBirthYear) ? parsedBirthYear : 1995;
    const eraScore = Math.min(Math.abs(movieYear - targetEra), 100);
    const watchabilityScore = accessScore * 0.7 + (100 - eraScore) * 0.3;
    // 映画、配信データ、スコアをセットにして返す
    return { movie, jpData, watchabilityScore };
      })
    );

    // スコアが小さい順に並び替え
    scoredCandidates.sort((a, b) => a.watchabilityScore - b.watchabilityScore);
      
    // 先頭の1件（最小スコア）を抽出
    const bestChoice = scoredCandidates[0];
    const bestMovie = bestChoice?.movie || candidates[0];
    const bestJpData = bestChoice?.jpData || null;

    log("FILTER", `候補 ${candidates.length}件の配信状況・鑑賞困難度スコアを算出完了`);
    log("TARGET", `最小スコア作品「${bestMovie.title}」(${bestMovie.release_date?.substring(0,4)}) を選定`, "warning");

    // 4. あらすじ補完 (OMDb)
    const trimmedOverview = bestMovie.overview?.trim() || "";
    let finalOverview = trimmedOverview || "あらすじ情報なし";
    
    if (omdbApiKey && !trimmedOverview) {
     try {
        const extUrl = `https://api.themoviedb.org/3/movie/${bestMovie.id}/external_ids?api_key=${tmdbApiKey}`;
        const extRes = await fetch(extUrl);
        if (extRes.ok) {
          const extData = await extRes.json();
          if (extData.imdb_id) {
            const omdbUrl = `https://www.omdbapi.com/?i=${extData.imdb_id}&plot=full&apikey=${omdbApiKey}`;
            const omdbRes = await fetch(omdbUrl);
            if (omdbRes.ok) {
              // 1. まずはテキストとして安全に全量を受け取る
              const rawText = await omdbRes.text();
              try {
                // 2. パースを試みる
                const omdbData = JSON.parse(rawText);
                const trimmedPlot = omdbData.Plot?.trim();
                if (trimmedPlot && trimmedPlot !== "N/A") {
                  finalOverview = trimmedPlot;
                }
              }catch (parseErr) {
                //パース失敗時もクラッシュさせず、何が届いていたかをデバッグ用に残す
                console.warn(`OMDbのレスポンス解析に失敗 (${bestMovie.title}):`, parseErr.message, "受信データ抜粋:", rawText.slice(0, 150));
              }
            }
          }
        }
      }catch (err) {
      console.warn(`${bestMovie.title} のあらすじ取得失敗 (ID: ${bestMovie.id}):`, err);
    }
  }

    //AI によるレビュー・不条理アドバイス生成のための変数整理
    const title = bestMovie.title;
    const year = bestMovie.release_date ? bestMovie.release_date.substring(0, 4) : "年代不明";
    const theaterNames = safeTheaters.length > 0 ? safeTheaters.join('、') : '近所の映画館';

    //配信状況（見放題あり / レンタルのみ / 配信なし）を判定して指示を分岐
    const hasFlatrate = hasSubscribedFlatrate(bestJpData, safeSubscs, serviceList);
    const hasAnyRentOrBuy = (bestJpData?.rent?.length > 0) || (bestJpData?.buy?.length > 0);

    let adviceInstruction = "";
    let streamStatusText = "";

    if (hasFlatrate) {
      streamStatusText = "契約中サブスクに見放題あり";
      adviceInstruction = `見放題があることを喜び、興味がないジャンルでも関係ないことをユーモラスに語りつつ、`;
    } else if (bestJpData?.flatrate?.length > 0) {
      streamStatusText = "未契約サブスクでのみ見放題あり";
      adviceInstruction = `見放題で観るためには、わざわざこの1本のために未契約のサブスクに新規加入する面倒さをユーモラスに語りながら、`;
    } else if (hasAnyRentOrBuy) {
      streamStatusText = "都度課金（レンタル/購入）のみ可能";
      adviceInstruction = `サブスクに課金して観る屈辱や都度レンタル料金を払ってまで観る不条理をユーモラスに語って、`;
    } else {
      streamStatusText = "国内配信なし（完全鑑賞不能）";
      adviceInstruction = `全く、観ることが叶わないことを嘆きつつ、契約していないサブスクでの視聴を勧めず、物理メディアの捜索やユーザーがよく行く映画館（${theaterNames}）の支配人に上映リクエストの手紙を送る、自主上映会を企画するなど、`;
    }
    const flatrateText = Array.isArray(bestJpData?.flatrate) ? bestJpData.flatrate.map((p) => p.provider_name).join(', ') : 'なし';
    const rentText = Array.isArray(bestJpData?.rent) ? bestJpData.rent.map((p) => p.provider_name).join(', ') : 'なし';
    const buyText = Array.isArray(bestJpData?.buy) ? bestJpData.buy.map((p) => p.provider_name).join(', ') : 'なし';
    const subscribedText = safeSubscs?.length > 0 ? safeSubscs.join(', ') : 'なし';

    // 5. AI によるレビュー・不条理アドバイス生成
    const sysPrompt = "あなたはユーモラスな映画評論家です。ユーザーの好みと正反対の映画をおすすめし、必ず以下のJSON形式のみを出力してください。\n{\"review\": \"なぜこの映画があなたにとって最悪のチョイスなのかを解説する文章\", \"advice\": \"この映画を観るための不条理・困難な鑑賞アドバイス\"}";
    //契約していないサブスクを全リストから逆算
    const unselectedSubscs = serviceList
      .filter(s => !safeSubscs.includes(s.name))
      .map(s => s.name);

    const unselectedListText = unselectedSubscs.length > 0 
      ? `・契約していないサブスク: ${unselectedSubscs.slice(0, 6).join('、')} など`
      : "・全サブスク契約（未契約なし）";

    const unselectedAdvicePart = unselectedSubscs.length > 0 
      ? `ユーザーが契約していない「${unselectedSubscs.slice(0, 3).join('、')}」を考慮して、`
      : "すべて契約している場合を考慮して、";

    const userQuery = `
    映画『${title}』（${year}年公開）とあらすじ: ${finalOverview || "（公式あらすじなし）"}を頼りに、その映画の内容がユーザーにとって、関心が無いか、精一杯調べたうえでレビューを作成してください。
      
    【レビュー執筆の重要ルール】
    ・確証のあるあらすじや内容が確認できない場合、勝手に架空の物語（プロット）を捏造しないでください。
    ・内容が不明な場合は、「TMDB内の情報がゼロで、評論家として完全にお手上げであること」をコミカルに嘆きつつ、タイトルや公開年の文字面から面白おかしく語ってください。
    ・情報が無い場合、あらすじ情報が『なし』または空欄の場合は必ず『お手上げ』という単語を含めてください。
      
    【ユーザーの背景情報】
    ・好きな映画の傾向: ${prefText}
    ・生まれ年代: ${birthYear ? birthYear + '年代' : '指定なし'}
    ・よく行く映画館: ${theaterNames}
    ${unselectedListText}
    ・選定した逆位相テーマ: ${genreName}（${vibeTag}）
    ・国内配信ステータス: ${streamStatusText}
    ・見放題配信元: ${flatrateText}
    ・レンタル配信元: ${rentText}
    ・購入可能配信元: ${buyText}
    ・ユーザーが契約中のサブスク: ${subscribedText}
      
    上記の『国内配信ステータス』を踏まえて、
    ユーザーは「${prefText}」が好きで、${birthYear ? birthYear + '年代生まれ' : '映画好き'}であることに対し、「その映画とは真逆の価値観を提供する映画が必要なのだ」と愛着をもって推薦する理由と、
    また、${unselectedAdvicePart}${adviceInstruction}現実的な視聴アドバイスを執筆してください。
      
    必ず以下のJSONフォーマット（プレーンなJSONオブジェクト）のみで返答してください。マークダウンの囲みや、前後のテキスト、説明は絶対に省いてください。
    テキスト内でダブルクォーテーション " を絶対に使わず、『 』や「 」を使用すること。
    各項目（値）の内部で改行を行わず、1行の文字列として出力すること。
    前後に挨拶や解説などの余計な文章を一切含めないこと。
    アドバイス内で言及してよい配信サービス名は、『見放題配信元』、『レンタル配信元』、『購入可能配信元』、『ユーザーが契約中のサブスク』に記載されたサービス名のみです。第三者のプラットフォーム名は一切出してはならない(捏造禁止)。
    
    {
      "review": "TMDBを利用したレビュー（50字から100字程度、ユーモラスなコメディアン的な文体）",
      "advice": "どうしても観たい場合のアドバイスを、『見放題配信元』、『レンタル配信元』、『購入可能配信元』で指定した配信元を参考に、『ユーザーが契約中のサブスク』と比較して観れそうかレビュー（100字程度、ユーモラスなコメディアン的な文体）"
    }
    `;

    let parsedAiData = null;
      
    //まず Gemini を試す
    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${sysPrompt}\n\n${userQuery}` }] }]
          })
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) parsedAiData = safeParseAiJson(text);
        }
      } catch (e) {
        console.warn("Gemini 呼び出し失敗、Groq への切り替えを試みます:", e);
      }
    }
    
    //Gemini が未設定、または呼び出しに失敗した場合は Groq を試す
    if (!parsedAiData && groqApiKey) {
      try {
        const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
        const groqRes = await fetch(groqUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",            
            max_tokens: 300,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: userQuery }
            ]
          })
        });

        if (groqRes.ok) {
          const rawText = await groqRes.text();
          const qData = JSON.parse(rawText);
          const text = qData.choices?.[0]?.message?.content;
          if (text) parsedAiData = safeParseAiJson(text);
        }
      } catch (e) {
        console.warn("Groq 呼び出し失敗:", e);
      }
    }
    
    //両方とも失敗した場合のフォールバック
    if (!parsedAiData) {
      parsedAiData = {
        review: "レビューの生成に失敗しました。",
        advice: "自力で探して鑑賞してください。"
      };
    }

    log("AI", `レビュー & 不条理アドバイスの生成完了`, "success");
    //レスポンス返却
    const responseData = {
      id: bestMovie.id,
      title: bestMovie.title,
      original_title: bestMovie.original_title,
      year: bestMovie.release_date ? bestMovie.release_date.substring(0, 4) : "",
      theaterNames: safeTheaters.length > 0 ? safeTheaters.join('、') : '近所の映画館',
      genre_name: genreName,
      vibe_tag: vibeTag,
      poster_path: bestMovie.poster_path ? `https://image.tmdb.org/t/p/w500${bestMovie.poster_path}` : null,
      ai_overview: parsedAiData.review,
      impossible_advice: parsedAiData.advice,
      jpData: bestJpData,
      logs: logs
    };

    return res.status(200).json(responseData);

  } catch (e) {
    console.error("Serverless Function Error:", e);
    return res.status(500).json({ error: e.message });
  }
}

