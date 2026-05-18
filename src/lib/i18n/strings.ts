import { Difficulty } from "@/data/Util";
import { LocalizedText, createText, Locale, getLocalizedText } from "./locales";

export const strings = {
  nav: {
    webcams: createText({ ko: "웹캠", en: "Webcams", ja: "ライブカメラ" }),
    slopes: createText({ ko: "슬로프", en: "Slopes", ja: "コース" }),
    resorts: createText({ ko: "리조트", en: "Resorts", ja: "リゾート" }),
  },
  themeToggle: {
    light: createText({ ko: "밝게", en: "Light", ja: "ライト" }),
    dark: createText({ ko: "어둡게", en: "Dark", ja: "ダーク" }),
  },
  language: {
    label: createText({ ko: "언어", en: "Language", ja: "言語" }),
  },
  player: {
    emptyTitle: createText({ ko: "선택된 영상이 없습니다", en: "No stream selected", ja: "選択された映像がありません" }),
    emptyBody: createText({
      ko: "목록에서 보고 싶은 카메라를 선택하세요.",
      en: "Choose a camera from the list.",
      ja: "リストから見たいカメラを選択してください。",
    }),
    capture: createText({ ko: "캡처", en: "Capture", ja: "キャプチャ" }),
    captureSaving: createText({ ko: "저장 중…", en: "Saving…", ja: "保存中…" }),
    captureError: createText({ ko: "캡처를 사용할 수 없습니다", en: "Capture unavailable", ja: "キャプチャを利用できません" }),
    loading: createText({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中..." }),
    vivaldiError: createText({
      ko: "비발디 웹캠을 불러오는 중 오류가 발생했습니다.",
      en: "Error loading the Vivaldi webcam.",
      ja: "Vivaldi カメラの読み込み中にエラーが発生しました。",
    }),
    mixedContentTitle: createText({
      ko: "이 스트림을 불러올 수 없습니다",
      en: "Couldn't load this stream",
      ja: "このストリームを読み込めません",
    }),
    mixedContentBody: createText({
      ko: "브라우저가 이 영상을 차단했습니다. 새 탭에서 직접 열어 보세요.",
      en: "Your browser blocked this stream. Open it directly in a new tab.",
      ja: "ブラウザがこのストリームをブロックしました。新しいタブで直接開いてください。",
    }),
    openExternally: createText({
      ko: "새 탭에서 열기",
      en: "Open in new tab",
      ja: "新しいタブで開く",
    }),
  },
  sidebar: {
    collapse: createText({ ko: "접기", en: "Collapse", ja: "折りたたむ" }),
    expand: createText({ ko: "보기", en: "Expand", ja: "表示" }),
    weather: createText({ ko: "날씨", en: "Weather", ja: "天気" }),
    pinWeatherToDashboard: createText({
      ko: "대시보드에 날씨 추가",
      en: "Pin weather to dashboard",
      ja: "天気をダッシュボードに追加",
    }),
    details: createText({ ko: "리조트 정보", en: "Resort details", ja: "リゾート情報" }),
    newTab: createText({ ko: "새 탭", en: "New tab", ja: "新しいタブ" }),
    externalTooltip: createText({
      ko: "이 카메라는 새 탭에서 열립니다.",
      en: "This camera opens in a new tab.",
      ja: "このカメラは新しいタブで開きます。",
    }),
    unavailable: createText({ ko: "준비중", en: "Unavailable", ja: "準備中" }),
    vivaldi: createText({ ko: "전용 플레이어", en: "Vivaldi player", ja: "ビバルディ専用プレーヤー" }),
    favorites: createText({ ko: "즐겨찾기", en: "Favorites", ja: "お気に入り" }),
    favoriteAdd: createText({ ko: "즐겨찾기에 추가", en: "Add to favorites", ja: "お気に入りに追加" }),
    favoriteRemove: createText({ ko: "즐겨찾기에서 제거", en: "Remove from favorites", ja: "お気に入りから削除" }),
    favoriteReorder: createText({ ko: "즐겨찾기 순서 변경", en: "Reorder favorites", ja: "お気に入りの並び替え" }),
    searchPlaceholder: createText({
      ko: "리조트 또는 웹캠 검색...",
      en: "Search resorts or webcams...",
      ja: "リゾートやカメラを検索...",
    }),
    addSelected: createText({ ko: "선택 항목 추가", en: "Add selected", ja: "選択を追加" }),
    addToGrid: createText({ ko: "그리드에 추가", en: "Add to grid", ja: "グリッドに追加" }),
    addedToGrid: createText({ ko: "추가됨", en: "Added", ja: "追加済み" }),
    removeFromGrid: createText({ ko: "그리드에서 제거", en: "Remove", ja: "削除" }),
    clearSelection: createText({ ko: "선택 해제", en: "Clear selection", ja: "選択解除" }),
    selectedCount: createText({ ko: "선택됨", en: "Selected", ja: "選択中" }),
    selectMode: createText({ ko: "선택", en: "Select", ja: "選択" }),
    selectDone: createText({ ko: "완료", en: "Done", ja: "完了" }),
  },
  analyticsConsent: {
    message: createText({
      ko: "이 사이트는 이용 행태를 파악하기 위해 Google Analytics를 사용하며, 최대 2년 동안 유지되는 1차 쿠키가 저장됩니다. 언제든지 동의를 변경할 수 있습니다.",
      en: "We use Google Analytics to understand how the site is used. This sets first-party cookies (up to 2 years), and you can change your choice at any time.",
      ja: "このサイトでは利用状況を把握するために Google Analytics を使用し、最長2年間保持されるファーストパーティ Cookie が保存されます。いつでも選択を変更できます。",
    }),
    allow: createText({ ko: "분석 허용", en: "Allow analytics", ja: "分析を許可" }),
    decline: createText({ ko: "거부", en: "Decline", ja: "拒否" }),
    close: createText({ ko: "닫기", en: "Close", ja: "閉じる" }),
    settings: createText({ ko: "개인정보 설정", en: "Privacy settings", ja: "プライバシー設定" }),
  },
  notices: {
    title: createText({ ko: "알림 및 출처", en: "Notices & Credits", ja: "お知らせ・クレジット" }),
    dataSources: createText({ ko: "데이터 출처", en: "Data sources", ja: "データ出典" }),
    credits: createText({ ko: "사용한 라이브러리", en: "Libraries & tools", ja: "使用ライブラリ" }),
    version: createText({ ko: "버전", en: "Version", ja: "バージョン" }),
    builtWithLove: createText({ ko: "함께 만들어갑니다", en: "Built for riders", ja: "ライダーのために作成" }),
    translationHeading: createText({ ko: "번역", en: "Translation", ja: "翻訳" }),
    translationNote: createText({
      ko: "영어와 일본어 번역은 ChatGPT의 도움을 받았습니다. 어색한 부분이 있다면 알려주세요.",
      en: "English and Japanese translations were assisted by ChatGPT. Please let me know if anything looks off.",
      ja: "英語と日本語の翻訳は ChatGPT の協力を受けています。違和感があれば教えてください。",
    }),
    feedback: createText({
      ko: "의견이나 제안은 GitHub Issues나 이메일로 보내주세요.",
      en: "Send suggestions via GitHub Issues or email.",
      ja: "提案やフィードバックは GitHub Issues かメールでお知らせください。",
    }),
    thirdPartyLicenses: createText({ ko: "서드파티 라이선스", en: "Third-party licenses", ja: "サードパーティ ライセンス" }),
    routingLicense: createText({
      ko: "spa-github-pages (MIT © Rafael Pedicini) — GitHub Pages SPA 라우팅에 사용합니다.",
      en: "spa-github-pages (MIT © Rafael Pedicini) — used for GitHub Pages SPA routing.",
      ja: "spa-github-pages (MIT © Rafael Pedicini) — GitHub Pages の SPA ルーティングに使用しています。",
    }),
    videoLicense: createText({
      ko: "Hls.js / video.js (Apache 2.0) — 영상 재생 보조 라이브러리입니다.",
      en: "Hls.js / video.js (Apache 2.0) — video playback helpers.",
      ja: "Hls.js / video.js (Apache 2.0) — 動画再生用ヘルパーです。",
    }),
    fullLicensePrefix: createText({ ko: "전체 라이선스 문서는", en: "See", ja: "詳細は" }),
    fullLicenseLink: createText({ ko: "THIRD_PARTY_NOTICES.md", en: "THIRD_PARTY_NOTICES.md", ja: "THIRD_PARTY_NOTICES.md" }),
    fullLicenseSuffix: createText({ ko: "에서 확인할 수 있습니다.", en: "for full license texts.", ja: "をご覧ください。" }),
  },
  slopes: {
    title: createText({ ko: "슬로프 정보", en: "Slope details", ja: "コース情報" }),
    description: createText({
      ko: "모든 슬로프 데이터는 각 리조트에서 제공한 공식 자료를 기준으로 정리했습니다.",
      en: "All slope details are organized directly from each resort’s official data.",
      ja: "すべてのコースデータは各リゾートの公式情報を基に整理しています。",
    }),
    filterDifficulty: createText({ ko: "난이도", en: "Difficulty", ja: "難易度" }),
    filterResort: createText({ ko: "리조트", en: "Resort", ja: "リゾート" }),
    allResorts: createText({ ko: "전체", en: "All resorts", ja: "すべてのリゾート" }),
  },
  slopeTable: {
    headers: {
      resort: createText({ ko: "리조트", en: "Resort", ja: "リゾート" }),
      name: createText({ ko: "이름", en: "Name", ja: "名前" }),
      difficulty: createText({ ko: "난이도", en: "Difficulty", ja: "難易度" }),
      length: createText({ ko: "길이 (m)", en: "Length (m)", ja: "長さ (m)" }),
      vertical: createText({ ko: "표고차 (m)", en: "Vertical (m)", ja: "標高差 (m)" }),
      avgGradient: createText({ ko: "평균 경사 (°)", en: "Avg slope (°)", ja: "平均斜度 (°)" }),
      width: createText({ ko: "폭 (m)", en: "Width (m)", ja: "幅 (m)" }),
      area: createText({ ko: "면적 (m²)", en: "Area (m²)", ja: "面積 (m²)" }),
      elevation: createText({ ko: "표고차 (m)", en: "Vertical (m)", ja: "標高差 (m)" }),
      minAngle: createText({ ko: "최소각도 (°)", en: "Min angle (°)", ja: "最小角度 (°)" }),
      avgAngle: createText({ ko: "평균각도 (°)", en: "Avg angle (°)", ja: "平均角度 (°)" }),
      maxAngle: createText({ ko: "최대각도 (°)", en: "Max angle (°)", ja: "最大角度 (°)" }),
    },
    filters: {
      none: createText({ ko: "선택 안함", en: "All", ja: "すべて" }),
      min: createText({ ko: "최소", en: "Min", ja: "最小" }),
      max: createText({ ko: "최대", en: "Max", ja: "最大" }),
      search: createText({ ko: "검색...", en: "Search...", ja: "検索..." }),
    },
  },
  seo: {
    webcamsTitle: createText({ ko: "실시간 웹캠", en: "Live Webcams", ja: "ライブカメラ" }),
    webcamsDescription: createText({
      ko: "한국 주요 스키장의 실시간 웹캠, 날씨, 리프트 정보를 한 화면에서 살펴보세요.",
      en: "Watch every major Korean ski resort in real time with curated webcams, weather links, and lift context.",
      ja: "韓国主要スキー場のライブカメラ・天気・リフト情報を1画面でチェックできます。",
    }),
    slopesTitle: createText({ ko: "슬로프 데이터 탐색", en: "Slope Data Explorer", ja: "コースデータ探索" }),
    slopesDescription: createText({
      ko: "길이, 경사, 난이도 지표를 정렬해 리조트별 슬로프 특성을 비교하고 계획을 세우세요.",
      en: "Sort angle, distance, and difficulty metrics to compare ski runs across resorts before you visit.",
      ja: "距離・斜度・難易度を並べ替えて、リゾート別に滑走路の特徴を比較できます。",
    }),
  },
  resortPage: {
    heading: createText({ ko: "리조트 개요", en: "Resort overview", ja: "リゾート概要" }),
    webcams: createText({ ko: "웹캠", en: "Live webcams", ja: "ライブカメラ" }),
    weather: createText({ ko: "실시간 날씨", en: "Weather", ja: "天気" }),
    slopes: createText({ ko: "슬로프", en: "Slope data", ja: "コースデータ" }),
    runs: createText({ ko: "코스", en: "runs", ja: "コース" }),
    officialSite: createText({ ko: "공식 홈페이지", en: "Official site", ja: "公式サイト" }),
    externalWebcam: createText({
      ko: "일부 카메라는 새 탭에서 열립니다.",
      en: "Some cameras open in a new tab.",
      ja: "一部のカメラは新しいタブで開きます。",
    }),
    listTitle: createText({ ko: "모든 리조트", en: "All resorts", ja: "すべてのリゾート" }),
    listDescription: createText({
      ko: "리조트를 선택해 날씨, 웹캠, 슬로프 정보를 한곳에서 확인하세요.",
      en: "Pick a resort to see live weather, webcams, and slope data in one place.",
      ja: "リゾートを選んで天気・ライブカメラ・コース情報をまとめて確認できます。",
    }),
    weatherLoading: createText({ ko: "날씨 정보를 불러오는 중…", en: "Loading weather…", ja: "天気を読み込み中…" }),
    weatherError: createText({ ko: "날씨 정보를 불러올 수 없습니다", en: "Weather data unavailable", ja: "天気情報を取得できません" }),
    refresh: createText({ ko: "새로고침", en: "Refresh", ja: "更新" }),
    forecastPrevPage: createText({ ko: "이전", en: "Previous", ja: "前へ" }),
    forecastNextPage: createText({ ko: "다음", en: "Next", ja: "次へ" }),
    forecastPageLabel: createText({ ko: "페이지", en: "Page", ja: "ページ" }),
    retry: createText({ ko: "다시 시도", en: "Retry", ja: "再試行" }),
    weatherUpdating: createText({
      ko: "날씨 데이터를 업데이트 중입니다. 잠시 후 다시 시도해 주세요.",
      en: "Weather data is still updating. Please try again shortly.",
      ja: "天気データを更新中です。少し時間をおいて再度お試しください。",
    }),
    currentConditions: createText({ ko: "현재 상태", en: "Current conditions", ja: "現在の状態" }),
    observedAt: createText({ ko: "업데이트", en: "Updated", ja: "更新" }),
    humidity: createText({ ko: "습도", en: "Humidity", ja: "湿度" }),
    wind: createText({ ko: "풍속", en: "Wind", ja: "風速" }),
    precip: createText({ ko: "강수", en: "Precip", ja: "降水" }),
    precipAmount: createText({ ko: "강수량", en: "Precip (mm)", ja: "降水量 (mm)" }),
    rain: createText({ ko: "비", en: "Rain", ja: "雨" }),
    snow: createText({ ko: "눈", en: "Snow", ja: "雪" }),
    date: createText({ ko: "날짜", en: "Date", ja: "日付" }),
    time: createText({ ko: "시간", en: "Time", ja: "時間" }),
    condition: createText({ ko: "상태", en: "Condition", ja: "状態" }),
    temperature: createText({ ko: "기온", en: "Temp", ja: "気温" }),
    precipChance: createText({ ko: "강수확률", en: "Precip (%)", ja: "降水確率" }),
    historyTrend: createText({ ko: "48시간 추세", en: "48h trend", ja: "48時間推移" }),
    historyPrecip: createText({ ko: "강수량", en: "Precip", ja: "降水量" }),
    maxTempLabel: createText({ ko: "최고기온", en: "Max temp", ja: "最高気温" }),
    minTempLabel: createText({ ko: "최저기온", en: "Min temp", ja: "最低気温" }),
    rainChance: createText({ ko: "강수 확률", en: "Rain chance", ja: "雨の確率" }),
    snowChance: createText({ ko: "강설 확률", en: "Snow chance", ja: "降雪の確率" }),
    periodAm: createText({ ko: "오전", en: "AM", ja: "午前" }),
    periodPm: createText({ ko: "오후", en: "PM", ja: "午後" }),
    fullWeather: createText({ ko: "상세 날씨", en: "Full weather", ja: "詳細天気" }),
    viewFullWeather: createText({ ko: "전체 날씨 보기", en: "View full weather", ja: "詳細を見る" }),
    backToResort: createText({ ko: "리조트로 돌아가기", en: "Back to resort", ja: "リゾートに戻る" }),
    weatherHeroDescription: createText({
      ko: "리조트 최근 날씨와 예보를 확인하세요.",
      en: "Check resort latest weather log and forecast.",
      ja: "リゾートの直近の天気と予報を確認してください。",
    }),
    weatherSectionNav: createText({ ko: "날씨 섹션", en: "Weather sections", ja: "天気セクション" }),
    officialForecastLink: createText({ ko: "기상청 상세예보", en: "Official KMA forecast", ja: "気象庁 詳細予報" }),
    past48h: createText({ ko: "지난 48시간", en: "Past 48h", ja: "過去48時間" }),
    historyMetrics: createText({ ko: "요약", en: "Summary", ja: "サマリー" }),
    recentObservations: createText({ ko: "최근 관측", en: "Recent observations", ja: "最近の観測" }),
    nearTermForecast: createText({ ko: "단기 예보", en: "Near-term forecast", ja: "短期予報" }),
    upcoming48Digest: createText({ ko: "48시간 예보 요약", en: "Upcoming 48h digest", ja: "今後48時間の概要" }),
    hourlyDetails: createText({ ko: "시간별 날씨 정보", en: "Hourly weather info", ja: "時間別の天気" }),
    extendedForecast: createText({ ko: "중기 전망", en: "Extended outlook", ja: "中期予報" }),
    dailyTrend: createText({ ko: "일별 최저·최고 추세", en: "Daily min/max trend", ja: "日別の最低/最高推移" }),
    past6h: createText({ ko: "지난 6시간", en: "Past 6h", ja: "過去6時間" }),
    next6h: createText({ ko: "6시간 예보", en: "Next 6h", ja: "今後6時間" }),
    precipitationTotal: createText({ ko: "강수 합계", en: "Precip total", ja: "降水合計" }),
    snowTotal: createText({ ko: "적설 합계", en: "Snow total", ja: "積雪合計" }),
    rainTotal: createText({ ko: "비 합계", en: "Rain total", ja: "雨量合計" }),
    maxWind: createText({ ko: "최대 풍속", en: "Max wind", ja: "最大風速" }),
    viewMoreHistory: createText({ ko: "관측 더 보기", en: "Show more observations", ja: "観測をもっと見る" }),
    allDay: createText({ ko: "하루 종일", en: "All day", ja: "終日" }),
    dayOffset: createText({ ko: "D+{offset}", en: "Day +{offset}", ja: "{offset}日後" }),
    temperatureTrend: createText({ ko: "기온 추세", en: "Temperature trend", ja: "気温推移" }),
    conditions: {
      clear: createText({ ko: "맑음", en: "Clear", ja: "快晴" }),
      cloudy: createText({ ko: "구름", en: "Cloudy", ja: "くもり" }),
      overcast: createText({ ko: "흐림", en: "Overcast", ja: "曇天" }),
      rain: createText({ ko: "비", en: "Rain", ja: "雨" }),
      snow: createText({ ko: "눈", en: "Snow", ja: "雪" }),
      mixed: createText({ ko: "비/눈", en: "Mixed", ja: "雨/雪" }),
      unknown: createText({ ko: "-", en: "—", ja: "—" }),
    },
    airQuality: {
      title: createText({ ko: "대기질", en: "Air quality", ja: "大気質" }),
      pm10: createText({ ko: "미세먼지", en: "Fine dust", ja: "PM10" }),
      pm25: createText({ ko: "초미세먼지", en: "Ultrafine dust", ja: "PM2.5" }),
      weekly: createText({ ko: "주간 전망", en: "Weekly outlook", ja: "週間見通し" }),
      good: createText({ ko: "좋음", en: "Good", ja: "良い" }),
      moderate: createText({ ko: "보통", en: "Moderate", ja: "並み" }),
      bad: createText({ ko: "나쁨", en: "Bad", ja: "悪い" }),
      veryBad: createText({ ko: "매우 나쁨", en: "Very bad", ja: "非常に悪い" }),
      updated: createText({ ko: "발표", en: "Issued", ja: "発表" }),
      forecastDate: createText({ ko: "예보일", en: "Forecast", ja: "予報日" }),
      noData: createText({ ko: "대기질 정보를 불러올 수 없습니다", en: "Air-quality data unavailable", ja: "大気質データを取得できません" }),
    },
  },
  attribution: {
    weather: createText({
      ko: "기상자료 제공: 기상청 / 공공데이터포털 (공공누리 제1유형)",
      en: "Weather data provided by KMA / Public Data Portal (KOGL Type 1)",
      ja: "気象データ提供: 気象庁 / 公共データポータル (KOGL Type 1)",
    }),
    linkLabel: createText({ ko: "공공누리 라이선스 안내", en: "KOGL License", ja: "KOGL ライセンス" }),
  },
  dashboardGrid: {
    emptyTitle: createText({ ko: "그리드가 비어 있습니다", en: "No cards in the grid", ja: "グリッドにカードがありません" }),
    emptyBody: createText({
      ko: "목록에서 웹캠, 날씨, 슬로프를 추가해 레이아웃을 시작하세요. 카드를 드래그해 순서를 바꾸고 확장으로 2x2 타일을 만들 수 있습니다.",
      en: "Add webcams, weather, or slopes from the list to start your layout. Drag cards to reorder and expand a tile to 2x2.",
      ja: "リストからカメラ・天気・コースを追加してレイアウトを始めてください。カードはドラッグで並べ替え、拡大で 2x2 タイルにできます。",
    }),
    dragToReorder: createText({ ko: "순서 변경", en: "Drag to reorder", ja: "並べ替え" }),
    moreOptions: createText({ ko: "더 보기", en: "More options", ja: "その他" }),
    shrinkTile: createText({ ko: "타일 축소", en: "Shrink tile", ja: "タイルを縮小" }),
    expandTile: createText({ ko: "타일 확장", en: "Expand tile", ja: "タイルを拡大" }),
    removeFromGrid: createText({ ko: "그리드에서 제거", en: "Remove from grid", ja: "グリッドから削除" }),
    resizeTile: createText({ ko: "타일 크기 조절", en: "Resize tile", ja: "タイルサイズを変更" }),
  },
  webcam: {
    multiView: createText({ ko: "멀티 뷰", en: "Multi-view", ja: "マルチビュー" }),
    clearAll: createText({ ko: "전체 비우기", en: "Clear all", ja: "すべてクリア" }),
  },
  weatherBadge: {
    unavailable: createText({ ko: "날씨 정보를 불러올 수 없습니다", en: "Weather unavailable", ja: "天気情報を取得できません" }),
  },
  widgets: {
    totalSlopes: createText({ ko: "총 슬로프", en: "Total slopes", ja: "総コース数" }),
    totalLength: createText({ ko: "총 길이", en: "Total length", ja: "総距離" }),
    unavailable: createText({ ko: "정보를 불러올 수 없습니다", en: "Unavailable", ja: "利用できません" }),
    moreCount: createText({ ko: "+{count}개 더", en: "+{count} more", ja: "あと {count} 件" }),
  },
};

export const difficultyLabels: Record<Difficulty, LocalizedText> = {
  [Difficulty.BEGINNER]: createText({ ko: "초급", en: "Beginner", ja: "初心者" }),
  [Difficulty.BE_IN]: createText({ ko: "초중급", en: "Lower intermediate", ja: "初中級" }),
  [Difficulty.INTERMEDIATE]: createText({ ko: "중급", en: "Intermediate", ja: "中級" }),
  [Difficulty.IN_AD]: createText({ ko: "중상급", en: "Upper intermediate", ja: "中上級" }),
  [Difficulty.ADVANCED]: createText({ ko: "상급", en: "Advanced", ja: "上級" }),
  [Difficulty.EXPERT]: createText({ ko: "최상급", en: "Expert", ja: "エキスパート" }),
  [Difficulty.PARK]: createText({ ko: "파크", en: "Park", ja: "パーク" }),
};

export function formatRangePlaceholder(label: LocalizedText, value: number | undefined, locale: Locale) {
  const base = getLocalizedText(label, locale);
  if (value === undefined) {
    return base;
  }
  return locale === "ko" ? `${base} (${value})` : `${base} (${value})`;
}

export function formatSearchPlaceholder(count: number, locale: Locale): string {
  if (locale === "ko") return `검색... (${count})`;
  if (locale === "ja") return `検索... (${count})`;
  return `Search... (${count})`;
}

export function formatResortPageTitle(resortName: string, locale: Locale): string {
  const suffix = getLocalizedText(strings.resortPage.heading, locale);
  return `${resortName} ${suffix}`.trim();
}

export function formatResortPageDescription(resortName: string, locale: Locale): string {
  if (locale === "ko") {
    return `${resortName}의 실시간 웹캠, 날씨, 슬로프 데이터를 한곳에서 확인하세요.`;
  }
  if (locale === "ja") {
    return `${resortName} のライブカメラ、天気、コースデータをまとめて確認できます。`;
  }
  return `See live weather, webcams, and slope data for ${resortName}.`;
}

export function formatTemplate(text: LocalizedText, locale: Locale, params: Record<string, string | number>): string {
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, getLocalizedText(text, locale));
}
