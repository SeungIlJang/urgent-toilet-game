# 급해! 화장실 Android 자동 멈춤 핫픽스 보고

- 작업 시각: 2026-08-13 15:12 KST
- 인계 대상: 17시 검증 작업
- 빌드: `0.5.4` / `versionCode 9`
- APK: `urgent-toilet-game-v0.5.4-vc9-pause-hotfix-debug.apk`
- APK SHA-256: `7b5c618a327980084f4dc3bb6f8c781c821c8557d0bf1429efbfaa67a27cb4d7`

## 원인과 수정

- 시작 직후 Android WebView가 발생시키는 지연 `visibilitychange`/`document.hidden` 이벤트가 `pauseGame()`을 호출하던 자동 일시정지 경로를 제거했다.
- Phaser 설정 `disableVisibilityChange: true`를 유지하고, blur/pauseOnBlur, scene pause, timeScale 변경 경로가 없음을 회귀 검사한다.
- 물리 정지는 수동 일시정지 버튼 및 정상 게임 종료에만 남겼다.
- 서비스워커 등록을 전 플랫폼에서 제거하고 기존 네이티브 등록/Cache Storage를 시작 시 정리한다. `sw.js` 자체도 빌드와 APK에서 제외했다.
- `window.__URGENT_DIAGNOSTICS__`에 실행 시작 시각, 2/10/30/75초의 state/physics/distance 판정, JS error/unhandled rejection을 기록한다.

## 자동 검증 결과

- `npm run build`: PASS
- 시작, 첫 점프, 더블탭 대시, 재시작 입력 상태 검사: PASS
- 장애물 충돌 및 재시작 wiring 검사: PASS
- 2/10/30/75초 `state=playing`, `physicsPaused=false`, 거리 증가 시뮬레이션: PASS
- `npx cap sync android`: PASS
- 최신 번들: `index-l6D2JLPa.js`
- dist/Android assets/APK 내부 번들 SHA-256: `3387d166e8fa471f1c550595aa731d1593b4e8bc9a8a6ad9aab2ecc6a485ca3a`
- Android assets 및 APK 내부 `sw.js` 없음: PASS
- Java 21.0.11 `clean assembleDebug --no-daemon`: PASS
- APK 서명: apksigner 검증 PASS (v1=true, v2=true, Android Debug 인증서)

## 17시 실기기 확인 항목

새 설치 또는 기존 버전 위에 업데이트한 뒤 시작, 2초 이상 진행, 첫 점프, 더블탭 대시, 충돌, 수동 일시정지/재개, 재시작을 확인한다. 가능하면 Chrome WebView 원격 콘솔에서 `window.__URGENT_DIAGNOSTICS__`를 열어 2/10/30/75초 체크포인트 네 개가 모두 `pass: true`이고 `errors`가 비어 있는지 확인한다.
