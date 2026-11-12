# Play Console 반영 목록 — v1.2.0 (versionCode 21 예정)

작성 2026-11-12 · 기준 커밋 `f40765b`

---

## 1. 지금 상태

| 항목 | 상태 |
|---|---|
| Play 에 올라간 최신 | **versionCode 20 (v1.1.2)** |
| OTA 서빙 중 | `f40765b` — 언어팩 포함 **전부 반영됨** |
| AAB 대기 중 | 런처 **앱 이름 현지화**만 |

> **왜 OTA 로 다 되는데 AAB 를 또 올리나**
> 앱은 켤 때마다 `seungiljang.github.io/games/toilet.html` 을 받아 실행한다. 그래서 게임 안
> 내용은 스토어를 거치지 않고 바뀐다. 다만 **런처에 뜨는 앱 이름은 네이티브 리소스**라
> OTA 로 못 바꾼다. 영어·일본어 사용자에게 'Toilet Defenders' / 'トイレしゅびたい' 로 보이려면
> AAB 를 새 versionCode 로 올려야 한다.
>
> 또 OTA 를 못 받는 상황(첫 실행이 오프라인, 네트워크 차단)에서는 AAB 안에 들어 있는
> 폴백이 뜬다. 지금 AAB(vc20)의 폴백은 **옛 내용**이다. 그 점만으로도 한 번 올릴 값은 있다.

---

## 2. Console 에서 할 일

### 2-1. 등록정보 현지화 추가 ← **이번의 핵심**

`기본 설정 > 기본 스토어 등록정보` 에서 언어를 추가한다.

- [ ] **영어 (en-US)** 추가 — 아래 3절 문구
- [ ] **일본어 (ja-JP)** 추가 — 아래 3절 문구
- [ ] 한국어(ko-KR) 자세한 설명 교체 — 지금 것은 4칸·아이템 강화가 빠진 옛 내용

> 언어를 추가하면 그 언어의 **스크린샷·피처 그래픽도 따로** 올릴 수 있다. 없으면 기본
> 언어 것이 그대로 쓰인다. 게임 화면이 그 언어로 나오므로, 가능하면 언어별로 찍어 올린다
> (`npm run shot:store` 전에 설정에서 언어를 바꾸면 그 언어로 찍힌다).

### 2-2. 새 AAB 업로드

- [ ] `package.json` 버전 `1.1.2` → `1.2.0`
- [ ] `android/app/build.gradle` `versionName "1.2.0"`, `versionCode 21`
- [ ] `npm run android:sync` → `android/` 에서 AAB 빌드 (실광고본으로 나간다)
- [ ] `프로덕션 > 새 버전 만들기` 에 업로드
- [ ] 릴리스 노트 ko/en/ja 붙여넣기 (4절)

> `npm run verify:release` 가 versionName 과 `package.json` 이 어긋나면 막는다.
> `android:sync` 는 `build:release` 를 쓰므로 폴백도 실광고본으로 들어간다.

### 2-3. 스크린샷 갱신

- [ ] `npm run shot:store` 로 다시 촬영 — 지금 올라간 것은 **두 칸짜리 옛 화면**이다
      (4칸 액션바·아이템 강화·콤보 뱃지·기지 수리가 모두 빠져 있다)
- [ ] 폰 스크린샷 4장 교체: `shot1-title` · `shot4-combat` · `shot5-boss` · `shot6-jobs`

### 2-4. 확인만 하면 되는 것

- [ ] 개인정보처리방침 URL 이 **공개 주소**로 들어가 있는지 (예전에 로컬 파일이었다)
- [ ] 광고 포함 = 예 / 인앱결제 = 없음 — 변동 없음
- [ ] 콘텐츠 등급 전체이용가 — 변동 없음

---

## 3. 등록정보 문구 (복사용)

### 3-1. 앱 이름 (30자)

| 언어 | 문구 |
|---|---|
| ko-KR | `화장실 수비대` |
| en-US | `Toilet Defenders` |
| ja-JP | `トイレしゅびたい` |

### 3-2. 짧은 설명 (80자)

**ko-KR** (37자)
```
귀여운 아기 변기를 지켜라! 레벨업마다 무기를 골라 키우는 초간단 타워디펜스
```

**en-US** (71자)
```
Defend the cutest little toilet! One-hand wave defense you can pick up anytime
```

**ja-JP** (36자)
```
かわいいトイレを守れ！片手で遊べる超シンプルなウェーブディフェンス
```

### 3-3. 자세한 설명 (4000자)

**ko-KR**
```
🚽 몰려오는 적을 막아 귀여운 아기 변기를 지켜내는 초간단 타워 디펜스!

한 손으로 즐기는 캐주얼 웨이브 디펜스 게임이에요.
자동으로 발사되는 변기 수비대가 적을 막고, 위급할 땐 아이템을 써서 버텨내세요!

▶ 이렇게 즐겨요
· 자동 발사 — 복잡한 조작 없이 적이 알아서 처치돼요
· 네 칸의 아이템 — 물폭탄 · 총알비 · 번개 · 얼리기 · 물내리기 · 솔질
· 매판 다른 조합 — 아이템 3종이 랜덤으로 뽑히고, 웨이브를 넘길수록 칸이 열려요
· 무한 웨이브 — 갈수록 강해지는 적과 보스를 막아내세요

⚡ 레벨업마다 강화 카드 선택!
적을 처치해 레벨업할 때마다 강화 카드 3장 중 하나를 골라요.
· 🔥 화력 강화  · ⚡ 속사  · ➕ 멀티샷  · 🎯 관통탄
· 🔵 대구경탄  · 💥 폭발탄  · 🛡 방벽 보강  · 🪙 황금 손
매판 다른 조합으로 나만의 최강 변기 수비대를 완성하세요!

🪙 아이템도 키워요
판에서 모은 코인으로 아이템을 Lv.8까지 강화할 수 있어요.
무기를 키울지 아이템을 키울지, 그 저울질이 이 게임의 묘미!

🔧 기지 수리
위급할 땐 수리로 버텨요. 보스를 잡을 때마다 한 번씩 더 채워져요.

🎖 전직 시스템
전사 · 법사 · 궁수로 전직하고, 광전사 · 대마법사 · 명사수로 각성!

👑 후반엔 엘리트가
11웨이브부터 단단한 놈 · 빠른 놈 · 분열하는 놈이 섞여 나와요.
숫자만 늘어나는 게 아니라 상대하는 방법이 달라집니다.

🏆 그 외
· 매일 바뀌는 일일 미션 + 출석 보상
· 다양한 수비대 스킨 & 무기 상점
· 한국어 · English · 日本語 지원
· 최고 점수 랭킹 도전

지금 바로 아기 변기를 지켜주세요! 🚽💦
```

**en-US**
```
🚽 Hold off the mess and defend the cutest little toilet!

A casual wave-defense game you can play with one hand.
Your toilet guard fires on its own — when things get rough, reach for an item.

▶ How to play
· Auto-fire — no fiddly controls, your guard handles it
· Four item slots — Bomb, Rain, Bolt, Freeze, Flush, Brush
· A different hand every run — three items are drawn at random, and slots open as you survive
· Endless waves — tougher enemies and bosses the deeper you go

⚡ Pick a power-up every level
Every time you level up, choose one of three cards.
· 🔥 Firepower  · ⚡ Rapid Fire  · ➕ Multishot  · 🎯 Piercing
· 🔵 Big Caliber  · 💥 Explosive  · 🛡 Reinforce  · 🪙 Golden Touch
Build a different toilet guard every single run!

🪙 Level up your items too
Spend the coins you earn in a run to push items to Lv.8.
Weapons or items? That trade-off is the heart of the game.

🔧 Base repair
When you're on the ropes, patch the base up. Every boss you beat gives you one more.

🎖 Jobs and awakenings
Become a Warrior, Mage or Archer — then awaken into Berserker, Archmage or Sniper!

👑 Elites in the late game
From wave 11, tougher, faster and splitting variants join the rush.
It isn't just bigger numbers — you have to fight them differently.

🏆 And more
· Daily missions that change every day, plus check-in rewards
· Guard skins and a weapon shop
· English · 한국어 · 日本語
· Chase your best score

Go keep that little toilet safe! 🚽💦
```

**ja-JP**
```
🚽 おしよせる てきを ふせいで、かわいいトイレを守りぬこう！

片手で遊べるカジュアルなウェーブディフェンスです。
トイレしゅびたいはオートで撃ちます。ピンチのときはアイテムでしのぎましょう！

▶ あそびかた
· オート射撃 — むずかしい操作はいりません
· 4つのアイテム枠 — 水ばくだん・たまの雨・かみなり・こおらせ・ながす・ブラシ
· 毎回ちがう組み合わせ — アイテム3種がランダムで選ばれ、進むほど枠が開きます
· 無限ウェーブ — 奥へ行くほど てきもボスも手強く

⚡ レベルアップごとに強化カード
てきをたおしてレベルが上がるたび、3枚から1枚を選びます。
· 🔥 火力アップ  · ⚡ そくしゃ  · ➕ マルチショット  · 🎯 かんつう弾
· 🔵 たいこうけい弾  · 💥 ばくはつ弾  · 🛡 ぼうへき強化  · 🪙 おうごんの手
毎回ちがう組み合わせで、じぶんだけの しゅびたいを！

🪙 アイテムも育つ
その回で集めたコインでアイテムをLv.8まで強化できます。
ぶきを育てるか、アイテムを育てるか — その迷いがこのゲームの味です。

🔧 基地しゅうり
ピンチのときは しゅうりでしのぐ。ボスをたおすたび1回ぶん増えます。

🎖 てんしょくシステム
せんし・まほう使い・きゅうしへ。さらに きょうせんし・だいまほう使い・めいしゅへ かくせい！

👑 後半はエリートが
ウェーブ11から、かたいヤツ・はやいヤツ・分裂するヤツが混ざります。
数が増えるだけでなく、戦いかたが変わります。

🏆 そのほか
· 毎日かわるミッションとログインボーナス
· しゅびたいのスキンと ぶきロッカー
· 日本語 · 한국어 · English
· ハイスコアに挑戦

さあ、小さなトイレを守ってあげて！ 🚽💦
```

---

## 4. 릴리스 노트 (500자)

**ko-KR**
```
v1.2.0
[새로워진 점]
- 🌏 한국어 · English · 日本語 지원 (기기 언어에 맞춰 자동, 설정에서 변경 가능)
- 액션 칸이 4개로! 물폭탄 + 특수 아이템 3종이 매판 랜덤으로 배치돼요
- 아이템을 🪙로 Lv.8까지 강화할 수 있어요
- 새 아이템 2종 — 🌀 물내리기(적을 밀어냄) · 🧹 솔질(기지 둘레 공격)
- 🔧 기지 수리 — 회복을 횟수제로 분리, 보스를 잡으면 한 번씩 더
- 👑 11웨이브부터 엘리트 변종 등장 (단단한 놈·빠른 놈·분열하는 놈)

[개선]
- 연속 처치 표시를 단계별 뱃지로 — 어두운 배경에서도 또렷하게
- 아이템 칸이 웨이브를 넘길 때마다 하나씩 열려요
- 후반 난이도 조정 — 11웨이브 이후가 너무 쉬웠던 문제 개선
```

**en-US**
```
v1.2.0
[New]
- 🌏 English, 한국어, 日本語 — auto by device, changeable in Settings
- Four item slots: a bomb plus three specials, shuffled each run
- Level items to Lv.8 with coins you earn
- New: 🌀 Flush pushes enemies back, 🧹 Brush hits near the base
- 🔧 Base repair is a limited charge; each boss grants one
- 👑 Elites from wave 11 — tanky, swift, splitting

[Improved]
- Combo counter is now a tiered badge
- Item slots unlock one at a time
- Late game tuned — waves past 11 were too easy
```

**ja-JP**
```
v1.2.0
[あたらしく]
- 🌏 日本語・한국어・English に対応（端末の言語に合わせて自動／設定で変更可）
- アイテム枠が4つに！水ばくだん＋特殊3種が毎回ランダムで並びます
- 集めたコインでアイテムをLv.8まで強化できます
- 新アイテム2種 — 🌀 ながす（てきを押し戻す）・🧹 ブラシ（基地の周りを攻撃）
- 🔧 基地しゅうり — 回復を回数制に、ボスをたおすたび1回ぶん増えます
- 👑 ウェーブ11からエリート（かたい・はやい・分裂）が登場

[かいぜん]
- れんぞく処理の表示を段階バッジに。暗い背景でもはっきり
- アイテム枠はウェーブを進めるごとに1つずつ開きます
- 後半の難易度を調整 — ウェーブ11以降がやさしすぎた点を改善
```

---

## 5. 주의사항

- **스크린샷 규격** — 540×960, 24비트 PNG(알파 없음), 9:16. Play 요구사항을 만족한다.
- **광고** — `ADS_ENABLED=false` 로 꺼져 있다(AdMob 정지 기간 ~2026-12-02). `ad-mode:real` 은
  심어둔 유닛 ID 가 실유닛이라는 뜻이고 실제로 호출되지는 않는다. 정지가 풀리면 소스의
  이 스위치를 켜고 OTA 를 다시 내보내면 된다 — AAB 재업로드는 필요 없다.
- **앱 이름 기본값이 영어다.** 한국어 기기는 `values-ko/` 를 쓰므로 '화장실 수비대' 그대로다.
  영어권 기기에서 'Toilet Defenders' 로 바뀌는 것이 이번 변경의 의도다.
- **Play Console 의 앱 이름은 별개다.** 등록정보 언어별로 Console 에서 따로 입력해야 한다
  (`values/strings.xml` 은 런처 이름만 바꾼다).
