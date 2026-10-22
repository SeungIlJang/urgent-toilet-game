# 화장실 수비대 — 캐릭터 이미지 프롬프트

현재 게임의 모든 그림은 코드로 그려집니다(`makeEnemyTextures()`, `makePoopTexture()`, `makeBaseTexture()`).
이 문서는 그걸 **실제 이미지로 교체**할 때 쓰는 프롬프트와 규격입니다.

이 게임의 정체성은 **귀여움**입니다. 아래 공통 스타일을 모든 캐릭터에 그대로 적용하세요.

---

## 0. 공통 스타일 (모든 프롬프트 앞에 붙일 것)

```
super cute kawaii mobile game sprite, chibi proportions with oversized head,
big glossy round eyes with white highlight dots, tiny simple smile,
soft pink blush circles on cheeks, thick rounded outlines, no sharp corners,
flat pastel colors with one soft gradient, soft cel shading,
bright friendly palette, centered single character, front-facing 3/4 view,
transparent background, no text, no shadow on the ground, no border frame,
clean vector game asset, 2D sprite for a casual mobile game
```

**귀여움 체크리스트** — 적도 무섭게 그리지 마세요. 이 게임의 적은 *장난꾸러기*입니다.

- 눈이 얼굴의 1/3 이상, 항상 하이라이트 점이 있을 것
- 볼터치 필수 (악당도)
- 이빨·발톱은 둥글고 짧게. 뾰족한 건 금지
- 화난 표정도 눈썹만 ∧ 모양, 입은 여전히 작고 둥글게
- 몸은 통통하게. 각진 실루엣 금지

---

## 1. 기술 규격 (꼭 지켜야 동작합니다)

| 항목 | 값 |
|---|---|
| 배경 | **투명 PNG** (그림자·테두리 굽지 말 것) |
| 일반 적 | **256 × 256** (현재 코드 128의 2배) |
| 보스 | **440 × 440** (현재 220의 2배) |
| 주인공 | **480 × 540** (현재 240×270의 2배) |
| 방향 | 화면 **아래쪽(플레이어)을 향해** 내려오는 느낌의 정면 |
| 여백 | 위쪽 15% 비워둘 것 — 체력바가 스프라이트 위 32px에 그려집니다 |

> **2배로 뽑는 이유**: 게임 캔버스는 540×960인데 실제 폰은 1080×1920입니다. 현재 크기로 그리면 흐려집니다.
> 2배로 받으면 적용할 때 코드의 `scale` 값을 절반으로 낮추면 됩니다.

### ⚠️ 주인공만 지켜야 하는 규칙

주인공 기본 스프라이트는 **스킨 색이 코드로 덧입혀집니다**(`setTint`). 민트·노을·황금 스킨이 전부 이 한 장을 색만 바꿔 씁니다.

→ **기본 주인공은 거의 흰색/아주 연한 회색으로** 그려주세요. 원색을 쓰면 스킨 색이 탁해집니다.
→ 반대로 **전직 3종(전사·법사·궁수)은 색을 입히지 않으므로** 마음껏 컬러로 그려도 됩니다.

### 피격 연출

맞으면 스프라이트 전체가 **순간 흰색으로 반짝입니다**. 실루엣이 또렷해야 이 연출이 살아납니다.

---

## 2. 주인공 — 아기 변기 (4장)

게임의 마스코트입니다. 가장 귀여워야 합니다.

### 2-1. 기본 (`poop.png`, 480×540, **흰색 위주**)

```
[공통 스타일] + a baby toilet character, tiny chubby white ceramic toilet with a round
lid that looks like a soft beret, big sparkling eyes, rosy cheeks, tiny happy open smile,
pale blue water in the bowl, short stubby base, innocent newborn expression,
almost entirely white and very light grey so it can be recolored, pastel blue accents only
```

### 2-2. 전사 (`poop_warrior.png`, 컬러 자유)

```
[공통 스타일] + the same baby toilet character wearing an oversized round steel helmet
with a red feather crest, tiny determined ∧-shaped eyebrows, still smiling,
chubby and heroic, warm orange glow accents
```

### 2-3. 법사 (`poop_mage.png`)

```
[공통 스타일] + the same baby toilet character wearing a floppy oversized purple wizard hat
with a golden star, sleepy half-closed happy eyes, tiny sparkles floating around,
soft violet magic glow
```

### 2-4. 궁수 (`poop_archer.png`)

```
[공통 스타일] + the same baby toilet character wearing a green headband with a long
feather sticking up, one eye winking, energetic cheerful expression, fresh green accents
```

---

## 3. 일반 적 15종 (각 256×256)

각 적의 **현재 동작**을 같이 적었습니다. 동작에 맞는 실루엣으로 그려야 어색하지 않습니다.

> **회전**: `회전 O`인 적은 게임에서 천천히 빙글빙글 돕니다 → **위아래 구분이 없는 둥근 형태**로 그리세요.
> `회전 X`는 똑바로 선 채 내려옵니다 → 위아래가 분명해도 됩니다.
> 모든 적은 숨쉬듯 크기가 ±6% 커졌다 작아집니다.

| # | 파일명 | 이름 | 체력/속도 | 동작 |
|---|---|---|---|---|
| 1 | `e_germ.png` | 세균 | 3 / 느림 | 회전 O, 직진 |
| 2 | `e_spore.png` | 포자 | 5 / 빠름 | 회전 O, 좌우로 빠르게 흔들림 |
| 3 | `e_fly.png` | 파리 | 4 / 매우 빠름 | 회전 X, 파르르 흔들림 |
| 4 | `e_paper.png` | 휴지뭉치 | 15 / 느림 | 회전 X, 직진 |
| 5 | `e_fart.png` | 방귀구름 | 6 / 느림 | 회전 X, 넓게 둥실 흔들림 |
| 6 | `e_slime.png` | 슬라임 | 9 / 느림 | 회전 O, **죽으면 둘로 분열** |
| 7 | `e_roach.png` | 바퀴벌레 | 20 / 아주 느림 | 회전 X, 직진 |
| 8 | `e_truck.png` | 정화조차 | 30 / 최저속 | 회전 X, 등장 시 경고 |
| 9 | `e_roll.png` | 두루마리 휴지 | 8 / 보통 | 회전 O, 직진 |
| 10 | `e_plunger.png` | 뚜러뻥 | 10 / 빠름 | 회전 X, 직진 |
| 11 | `e_sink.png` | 세면대 | 28 / 아주 느림 | 회전 X, 직진 |
| 12 | `e_soap.png` | 비누 | 5 / 빠름 | 회전 X, 미끄러지듯 흔들림 |
| 13 | `e_mosquito.png` | 모기 | 4 / 최고속 | 회전 X, 빠르게 흔들림 |
| 14 | `e_tissue_red.png` | 빨간 휴지 | 6 / 빠름 | 회전 X, 직진 |
| 15 | `e_tissue_blue.png` | 파란 휴지 | 16 / 느림 | 회전 X, 직진 |

### 프롬프트

**1. 세균** — `[공통] + a round lime-green germ ball with short soft rounded spikes all around, big curious eyes, tiny fang poking out of a small smile, mischievous but harmless, radially symmetric so it looks right at any rotation`

**2. 포자** — `[공통] + a small teal spiky spore, soft star-shaped body with rounded points, wide excited eyes, tiny open mouth, light and bouncy, radially symmetric`

**3. 파리** — `[공통] + a tiny chubby housefly, dark grey rounded body, huge ruby-red eyes taking up most of the face, translucent pastel wings mid-flap, silly happy expression, not scary at all`

**4. 휴지뭉치** — `[공통] + a crumpled ball of white tissue paper with a soft puffy cloud silhouette, sleepy half-closed eyes, tiny mouth, cozy and plump`

**5. 방귀구름** — `[공통] + a pale green gas cloud, soft bumpy cloud shape, squinting mischievous eyes, tiny cheeky grin, small sparkle puffs around the edges, embarrassed blush`

**6. 슬라임** — `[공통] + a purple jelly droplet, glossy translucent body with a bright highlight, big round innocent eyes, tiny wobbly smile, looks like it would split in two, radially symmetric`

**7. 바퀴벌레** — `[공통] + a round chubby brown beetle, glossy shell, short stubby rounded legs, tiny antennae with ball tips, big friendly eyes, looks like a cute bug toy not a pest`

**8. 정화조차** — `[공통] + a tiny cartoon septic tank truck, stubby rounded body, oversized round wheels, golden-brown tank with a yellow stripe, big headlight eyes, small smiling bumper mouth, toy-like proportions`

**9. 두루마리 휴지** — `[공통] + a roll of white toilet paper standing upright, soft rounded cylinder, a little paper tail unrolling at the bottom, big sweet eyes, tiny smile, radially symmetric`

**10. 뚜러뻥** — `[공통] + a cute red rubber plunger, glossy bell-shaped rubber cup, short wooden handle, big determined eyes on the rubber part, tiny confident smile`

**11. 세면대** — `[공통] + a tiny white porcelain sink with a curved chrome faucet, rounded basin, big calm eyes on the basin front, gentle smile, two pink blush marks, soft and heavy looking`

**12. 비누** — `[공통] + a mint-green bar of soap with rounded corners, glossy wet highlight, tiny bubbles floating around it, big slippery-looking eyes, cheerful tiny smile`

**13. 모기** — `[공통] + a tiny chubby mosquito, slim dark body, oversized translucent wings, big red eyes, a short blunt rounded snout (not sharp), mischievous tiny grin, looks speedy`

**14. 빨간 휴지** — `[공통] + a red tissue box with a tissue popping out of the top like a little hat, rounded box corners, big playful eyes, tiny open mouth, energetic`

**15. 파란 휴지** — `[공통] + a blue tissue box with a tissue popping out of the top, rounded sturdy box, big calm sleepy eyes, tiny smile, looks heavier and sturdier than the red one`

---

## 4. 보스 3종 (각 440×440)

보스는 **5웨이브마다** 나옵니다. 크고 당당하되 여전히 귀여워야 합니다. 보스는 회전하지 않습니다.

**소형 보스** (`e_boss.png`, WAVE 5)
```
[공통] + a pink-magenta germ boss, bigger rounder version of the small germ,
a tiny golden crown tilted on top, big confident eyes with ∧ eyebrows,
two small rounded fangs, puffed-up proud posture, boss aura sparkles
```

**대형 보스** (`e_bossbig.png`, WAVE 15·25…)
```
[공통] + a large purple germ overlord, thick soft spikes, a bigger golden crown,
glowing red round eyes with white highlights, two short rounded fangs,
chubby and imposing but still adorable, violet glow
```

**웅장한 정화조** (`e_boss_septic.png`, WAVE 10·20…)
```
[공통] + a giant cute septic tank truck boss, huge golden-brown tank body,
oversized round wheels, a big golden crown on top, glowing red round eyes,
two short rounded fangs, a tiny pink heart-shaped exhaust puff,
majestic and silly at the same time, king of the toilet monsters
```

---

## 5. 동작(애니메이션)에 대하여

**지금 게임은 스프라이트 1장만 쓰고, 움직임은 전부 코드가 만듭니다** — 상하 흔들림, 회전, 숨쉬기(±6%), 좌우 드리프트, 피격 시 흰색 플래시. 그래서 **정지 이미지 1장만 있어도 바로 적용됩니다.**

진짜 프레임 애니메이션까지 원하시면, 캐릭터당 아래처럼 **가로로 이어붙인 시트**로 받으세요.

| 대상 | 프레임 | 시트 크기 | 동작 설명 |
|---|---|---|---|
| 주인공 | 4 | 1024×540 | 숨쉬기 — 몸이 살짝 부풀었다 가라앉고 눈이 한 번 깜빡 |
| 걷는 적 (바퀴·세면대·휴지류) | 4 | 1024×256 | 뒤뚱뒤뚱 — 좌우로 기울며 위아래로 통통 |
| 나는 적 (파리·모기) | 2 | 512×256 | 날개 위/아래 |
| 떠다니는 적 (방귀·포자·슬라임) | 4 | 1024×256 | 말랑하게 늘었다 눌렸다 (squash & stretch) |
| 보스 | 4 | 1760×440 | 느리고 묵직한 호흡, 마지막 프레임에 눈 번쩍 |

프레임 공통 프롬프트 꼬리말:
```
, sprite sheet, N frames in a single horizontal row, evenly spaced,
identical character size and position in every frame, only the pose changes,
transparent background
```

---

## 6. 이미지를 넣을 폴더

### 권장: `src/assets/` (새로 만들기)

```
urgent-toilet-game/
└─ src/
   └─ assets/
      ├─ poop.png              poop_warrior.png  poop_mage.png  poop_archer.png
      ├─ e_germ.png            e_spore.png       e_fly.png      e_paper.png
      ├─ e_fart.png            e_slime.png       e_roach.png    e_truck.png
      ├─ e_roll.png            e_plunger.png     e_sink.png     e_soap.png
      ├─ e_mosquito.png        e_tissue_red.png  e_tissue_blue.png
      └─ e_boss.png            e_bossbig.png     e_boss_septic.png
```

**파일명은 위 표의 이름 그대로** 써주세요. 코드가 쓰는 텍스처 키와 같아서 교체가 수월합니다.

이 폴더에 두면 빌드가 이미지를 **단일 HTML 안에 통째로 넣어주기 때문에**, OTA 배포와 APK 양쪽에서 추가 설정 없이 바로 동작합니다.

### `public/assets/` 는 쓰지 마세요

지금 파이프라인은 `dist/index.html` 한 장만 `www/`로 옮깁니다(`scripts/sync-www.mjs`). `public/`에 넣은 이미지는 `www/`로 따라가지 않아서 **APK 안에서 404**가 납니다.
(실제로 거기엔 예전 러너 시절 PNG 3장(3.5MB)이 아무도 안 쓰는 채로 남아 있습니다.)

### ⚠️ 용량 주의

단일 HTML에 넣으면 이미지가 base64로 들어가 **원본보다 약 33% 커집니다.** 지금 `www/game.html`이 1.28MB인데, OTA 로더가 앱을 켤 때마다 이걸 통째로 내려받습니다(5초 타임아웃).

**이미지 22장 합계를 1.5MB 이하로** 맞춰주세요. 장당 평균 60KB 정도입니다.
PNG로 받은 뒤 TinyPNG 같은 걸로 한 번 압축하면 보통 절반 이하로 줄어듭니다.
이보다 커지면 파일을 분리해서 싣는 방식으로 파이프라인을 바꿔야 하니 미리 말씀해 주세요.

### 넣은 뒤에

이미지만 넣는다고 바뀌지는 않습니다. 코드가 아직 텍스처를 직접 그리고 있어서,
`preload()`에서 이미지를 불러오고 `makeEnemyTextures()` / `makePoopTexture()`를 끄는 작업이 필요합니다.
2배 크기로 받았다면 `scale` 값도 절반으로 낮춰야 합니다.
**이미지 준비되면 말씀해 주세요. 그 작업은 제가 하겠습니다.**
