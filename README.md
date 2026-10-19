# 화장실 수비대 (Toilet Defense)

몰려오는 세균·몬스터를 막아 **화장실(기지)**을 지키는 **모바일 세로형** 디펜스 게임입니다.
(기존 "급해! 화장실" 러너의 애셋을 재활용한 디펜스 개편판)

- 주인공은 기지 앞에서 **자동 발사**로 가장 가까운 적을 공격
- 화면을 **탭하면 💩폭탄** 투척 (범위 공격, 쿨다운)
- 적이 화장실에 닿으면 **기지 HP** 감소, 0이 되면 게임 오버
- **웨이브**가 진행될수록 적이 강해지고, **5웨이브마다 보스**(10웨이브마다 정화조 보스)
- 웨이브를 클리어하면 **멈추지 않고 바로 다음 웨이브**로 이어짐
  (상점은 타이틀과 **일시정지** 메뉴에서)
- 지갑이 둘: **🪙코인**은 그 판에서만 쓰는 무기 강화용(판이 끝나면 소멸),
  **💎보석**은 영구 강화·스킨·무기 해금용(죽어도 유지)
- 레벨업마다 **강화 카드 3장 중 1장** 선택 — 일반/희귀/전설 희귀도, 판당 무료 리롤 1회(5레벨마다 +1)
- **로컬 랭킹 TOP 10** · 일일 미션 · 세로 전체화면 PWA

## 실행

```bash
npm install
npm run dev
```

브라우저에서 표시된 주소를 열어 플레이합니다.

## 빌드

```bash
npm run build
```

`verify:balance`(웨이브 밸런스) · `verify:runtime`(디펜스 배선) · `verify:release`(버전·앱 이름·권한·광고 설정)를
통과해야 진행되고, 끝나면 `sync:www` 가 `dist/index.html` 을 Capacitor webDir 인 `www/game.html` 로 옮깁니다.
`www/index.html` 은 OTA 로더라 덮어쓰지 않습니다.

## 출시 빌드 (실광고)

```bash
npm run build:release
```

`VITE_REAL_ADS=1` 로 빌드해 AdMob **실유닛**을 켭니다. 그 외 모든 빌드는 테스트 광고로 고정되므로,
개발 중 실광고를 눌러 계정이 정지될 일이 없습니다. 전면 광고단위 ID(`ADMOB_INTER_ID`)가 비어 있으면
`verify:release` 가 빌드를 막습니다.

## APK

```bash
npm run android:apk
```

`build` → `cap sync android` → `verify:native-assets`(APK 안의 웹 자산이 방금 빌드와 같은지 확인) 순으로 돕니다.

## 스토어 스크린샷

```bash
npm run shot:store
```

현재 `www/game.html` 을 헤드리스 Edge로 띄워 `store-assets/shot1~6.png` (540×960)를 다시 찍습니다.
빌드 뒤에 실행해야 최신 화면이 담깁니다.

## 버전

`package.json` 의 `version` 이 유일한 출처입니다. 인게임 표시는 vite `define` 으로 주입되고,
`android/app/build.gradle` 의 `versionName` 과 일치하는지는 `verify:release` 가 확인합니다.
