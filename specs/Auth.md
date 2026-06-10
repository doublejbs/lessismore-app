# 인증 / 계정 (로그인 · 약관 · 정보 탭 · 탈퇴 · 웹뷰)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `AU` |
| 주요 코드 | `model/firebase/Firebase.ts`, `components/login/`, `model/login/`, `app/terms-agreement/`, `app/(tabs)/info.tsx`, `app/info/delete/`, `components/webview/`, `model/webview/` |
| 관련 스펙 | [DataModel.md](DataModel.md), [AppLifecycle.md](AppLifecycle.md) |

## 1. 개요

Firebase Auth 기반 인증(Google/Apple/Email), 약관 동의 강제, 정보 탭(계정 관리), 회원 탈퇴,
그리고 웹(useless.my)과의 웹뷰 브릿지를 다룬다.

## 2. 화면 및 진입

- 로그인 UI는 별도 라우트가 아니라 **전역 모달**(`LogInView`)이다 — `LogInAlertManager.show()`로 어디서든 호출.
- `/terms-agreement` — 필수 약관 미동의 로그인 사용자가 강제 리다이렉트되는 화면.
- 정보 탭 `app/(tabs)/info.tsx` → 탈퇴는 `/info/delete`.

## 3. 요구사항

### AU-1 로그인 제공자

**수용 기준**

| 제공자 | iOS | Android | Web |
| --- | --- | --- | --- |
| Google | `GoogleSignin.signIn()` (네이티브 SDK) | 동일 | `signInWithPopup` (동적 import) |
| Apple | `expo-apple-authentication` | **미지원** — 로그인 모달에 버튼 자체가 렌더되지 않음 (`Firebase.logInWithApple`의 방어 에러 메시지는 UI로 도달 불가) | `signInWithPopup` |
| Email | `signInWithEmailAndPassword` | 동일 | 동일 |

- 로그인 모달: 기본 모드(Google/Apple 버튼 + 이메일 로그인 링크) ↔ 이메일 모드(이메일/비밀번호 입력). 오버레이 탭으로 닫으면 입력 상태 초기화.
- 이메일 로그인 실패: `이메일 또는 비밀번호가 올바르지 않습니다.`
- 로그인 취소(팝업/시트 닫기)는 조용히 무시한다(에러 UI 없음).
- Auth persistence: 네이티브는 `getReactNativePersistence(AsyncStorage)`, 웹은 `getAuth` 기본값.

### AU-2 신규 사용자 문서 생성

**수용 기준**

- 최초 로그인 시 `users/{uid}` 문서를 생성한다: `termsAgreed/privacyAgreed/marketingAgreed = false`, `createdAt`, `nickname = hiker{0~9999 난수}` ([DataModel.md](DataModel.md) DM-2).

### AU-3 약관 동의

**수용 기준**

- 항목: 필수 4(이용약관, 개인정보 처리방침, 개인정보 수집·이용, 만 14세 이상) + 선택 2(SMS 수신, 마케팅 활용).
- 동의 완료 판정은 필수 4종 모두 true (DM-2).
- 로그인 상태 + 미동의면 앱 어디서든 `/terms-agreement`로 `replace` 리다이렉트된다(`app/_layout.tsx` 가드).
- 동의 저장 시 6개 필드 + `agreedAt`을 기록하고 `/(tabs)`로 이동한다. 저장 실패 시 알럿 후 화면 유지.
- ⚠ **현 구현 불일치**: 화면의 제출 버튼 활성 조건은 필수 2종(이용약관+개인정보 처리방침)만 검사한다. 나머지 필수 2종을 빼고 제출하면 저장은 되지만 동의 판정(4종)에 걸려 가드가 다시 약관 화면으로 돌려보낸다 — 사용자가 루프에 갇힐 수 있음(미해결 질문 참조).

### AU-4 정보 탭

**수용 기준**

- 닉네임 표시(미로그인 시 `내 정보`), 닉네임 설정/수정 모달(`updateNickname`, trim 저장).
- 로그인 상태별 버튼: `로그아웃`(`firebase.logout()`) / `로그인`(로그인 모달).
- `서비스 문의` → 카카오 채널 `http://pf.kakao.com/_VJwSn` 외부 브라우저.
- `개인정보 처리방침` 아코디언(전문 인라인 표시).
- 푸터: `탈퇴하기`(로그인 시에만), 앱 버전(`Constants.expoConfig.version` — **cosmetic 값**, [AppLifecycle.md](AppLifecycle.md) 참고), 카피라이트.

### AU-5 회원 탈퇴

**수용 기준**

- `/info/delete`에서 삭제 데이터 안내(배낭/장비/개인 설정, 복구 불가) 후 확인 → 시스템 알럿 재확인.
- 본인 확인을 위해 **제공자별 재인증**을 수행한다: Google/Apple은 재로그인.
- ⚠ **Email 사용자는 현재 탈퇴 불가**: 탈퇴 화면은 모든 제공자에 `deleteUserAccount()`만 호출하는데 email 제공자는 여기서 예외가 발생한다. 비밀번호 재입력 UI가 없고 `deleteUserAccountWithEmail()`은 호출처 없는 데드 코드다(미해결 질문 참조).
- 재인증 성공 시: Firestore 사용자 데이터 삭제(AU-8 참조) → `deleteUser`(Auth 계정 삭제) → 로컬 상태 초기화 → (네이티브) `GoogleSignin.signOut()` 시도(실패 무시).
- 재인증 취소(`auth/popup-closed-by-user`, code `12501`): `재인증이 취소되었습니다. …` 알럿, 탈퇴 중단.
- 기타 실패: `회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.`
- 완료: `회원 탈퇴 완료` 알럿 후 `/`로 이동.

### AU-6 웹뷰 브릿지

**수용 기준**

- 웹 페이지에는 `window.NativeBridge`가 주입된다: `closeWebView` / `navigate(url)` / `updateData(data)` / `navigateToLogin` / `reportError` / `sendCustomMessage`.
- 네이티브 측 `WebViewManager`가 메시지를 처리한다: `CLOSE_WEBVIEW`→back, `NAVIGATE`→push, `UPDATE_DATA`→콜백, `NAVIGATE_TO_LOGIN`→`/log-in` push(미해결 질문 참조), `PAGE_LOADED`/`ERROR`→로그.
- 로그인 웹뷰(`WebViewWrapper`): 마운트 시 토큰 갱신(`refreshTokens`) 후 `?token={idToken}&accessToken={accessToken}` 쿼리로 로드. 토큰 준비 전에는 웹뷰를 렌더하지 않는다.
- 비로그인 웹뷰(`NotLogInWebViewWrapper`): 즉시 로드하고, 토큰이 있으면 `AUTH_TOKENS` 메시지를 JS로 주입한다.

### AU-7 로그인 상태 전파

**수용 기준**

- `onAuthStateChanged` 리스너 + MobX observable로 로그인 상태를 전파하고, 창고/배낭/검색은 reaction으로 자동 갱신한다.

### AU-8 탈퇴 시 데이터 삭제 범위 — ⚠ 현 구현 결함 의심

**현 동작 (as-built)**

- `deleteUserData()`는 `users/{uid}` 문서 삭제 + 최상위 `bags`/`gears`/`replies` 컬렉션을 **전체 스캔**해 `userId` 필드가 일치하는 문서를 배치 삭제한다.

**문제**

- 실제 스키마([DataModel.md](DataModel.md) DM-1)에는 `bags`/`gears`/`replies` 최상위 컬렉션이 없다. 실데이터는 `bag`(userId 필드 있음), `users/{uid}/gears`(서브컬렉션), `gear-comments`(authorId)에 있다.
- 따라서 현재 코드로는 **탈퇴해도 배낭(`bag`)·장비 서브컬렉션·댓글이 남는다** (`users/{uid}` 문서만 삭제됨. Firestore는 문서 삭제 시 서브컬렉션을 자동 삭제하지 않음).
- 안내 문구("모든 데이터가 삭제됩니다")와 실동작이 불일치 — 개인정보 처리 관점에서 수정 필요.

## 4. 데이터

- [DataModel.md](DataModel.md) DM-2 (`users/{uid}`).
- Firebase 프로젝트: `lessismore-7e070` (Auth/Firestore/Storage).

## 5. 플랫폼 분기

AU-1 표 참조. 추가로: 토큰 갱신은 네이티브 `GoogleSignin.getTokens()` / 웹 `user.getIdToken(true)`.

## 6. 엣지 케이스

- 로그인 모달 열림 중 취소 → 입력 초기화 후 닫힘.
- 탈퇴 중 Firestore 삭제 실패 → 콘솔 로그만 남기고 Auth 계정 삭제는 계속 진행.

## 7. 수동 검증 체크리스트

- [ ] Google/Email 로그인·로그아웃, iOS·웹에서 Apple 로그인 (Android에는 Apple 버튼 미노출 확인)
- [ ] 신규 계정 → 약관 화면 강제 진입 → 필수 4종 모두 체크 시 메인 진입
- [ ] 필수 2종만 체크하고 제출 → 현재는 약관 화면으로 되돌아오는 루프(알려진 결함) 재현 확인
- [ ] 약관 동의 후 재실행 → 리다이렉트 없음
- [ ] 닉네임 변경 → 댓글 작성자명에 반영
- [ ] 탈퇴(Google/Apple) → 재인증 취소 시 계정 유지, 완료 시 재로그인하면 신규 사용자로 생성
- [ ] 웹뷰 검색에서 닫기/내비게이션 브릿지 동작

## 8. 미해결 질문

- **AU-8 데이터 삭제 불일치** — 수정 방향(올바른 경로 삭제 vs Cloud Function) 결정 필요.
- **Email 사용자 탈퇴 불가**(AU-5) — 비밀번호 재인증 UI 추가 필요.
- **약관 제출 버튼 활성 조건 불일치**(AU-3) — 버튼 활성 조건을 필수 4종으로 확장해야 함.
- `NAVIGATE_TO_LOGIN`이 `/log-in` 라우트로 push하지만 `app/log-in` 라우트가 존재하지 않는다 → not-found로 떨어짐. 웹뷰 외에 `model/reply/Reply.ts`·`model/reply/ReplyDetail.ts`에서도 비로그인 시 `/log-in`을 push(총 6곳) — 로그인 모달 호출로 교체 검토.
- 이메일 **가입** 플로우 미구현 확정: `createUserWithEmailAndPassword` 래퍼는 호출처가 없다. 기존 이메일 계정만 로그인 가능 — 가입 경로 정책 필요.
