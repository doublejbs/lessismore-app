# 검색

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `SR` |
| 주요 코드 | `app/(tabs)/search.tsx`, `app/search/`, `app/not-login-search/`, `components/search/`, `components/search-page/`, `model/search/` |
| 관련 스펙 | [DataModel.md](DataModel.md), [GearDetail.md](GearDetail.md), [Bag.md](Bag.md), [Auth.md](Auth.md) |

## 1. 개요

장비 카탈로그 검색(Algolia)과 인기 장비 순위(`gear-rank`)를 제공하고,
검색 결과에서 바로 창고 추가·배낭 담기를 지원한다. 비로그인 사용자는 웹뷰 검색으로 우회한다.

## 2. 화면 및 진입

| 경로 | 대상 | 비고 |
| --- | --- | --- |
| 탭 `탐색` (`app/(tabs)/search.tsx`) | 로그인 사용자 | `SearchPageView` |
| `/search` | 로그인 사용자 | 동일 UI를 모달/스택으로 |
| `/not-login-search` | 비로그인 사용자 | 웹뷰로 `https://useless.my/search` 로드, iOS는 모달 프레젠테이션 |

## 3. 요구사항

### SR-1 검색 실행

**수용 기준**

- 입력 300ms 디바운스 후 Algolia `useless-gear-search` 인덱스를 검색한다([DataModel.md](DataModel.md) DM-10).
- 페이지 크기 100, 무한 스크롤(`onEndReached` 임계 0.1)로 다음 페이지를 누적 로드, `nbPages` 도달 시 중단.
- 키워드 클리어 버튼(X) 제공. 플레이스홀더는 하드코딩된 제안 키워드 9종 중 무작위 + 조사 처리.
- 검색 화면 포커스 복귀 시 현재 키워드로 즉시 재검색한다(보유 상태 동기화 목적).

### SR-2 검색 결과 표시와 보유 배지

**수용 기준**

- 결과 행: 이미지/제조사/이름/무게 + 우측 버튼.
- 내 창고에 있는 장비(`users/{uid}/gears`와 ID 매칭)는 체크 배지, 없으면 + 버튼을 표시한다.
- 비로그인 시 모든 결과가 미보유로 표시된다.
- 행 클릭 → `/gear-detail/{objectID}`.

### SR-3 결과에서 창고 추가 / 배낭 담기

**수용 기준**

- `+` 클릭(로그인 필수): 창고에 등록(`GearStore.register`, `isCustom: false`) 후 **배낭 담기 모달**이 열린다.
- 모달 옵션: `새 배낭`(오늘 날짜로 생성 후 담기) / 기존 배낭 목록(이미 담긴 배낭은 중복 체크로 구분).
- 체크 배지 클릭: `모든 배낭에서 장비가 제거됩니다` 경고 확인 후 창고에서 제거(`GearStore.remove`).
- 추가/제거 시 `gear-rank` count 증감([DataModel.md](DataModel.md) DM-6) 후 현재 검색을 재실행해 배지를 갱신한다.

### SR-4 인기 장비 순위 (키워드 없음 상태)

**수용 기준**

- 키워드가 비어 있으면 `인기 장비 순위`를 표시한다.
- 카테고리 탭 8개: 전체/텐트/침낭/배낭/매트/가구/랜턴/조리.
- `gear-rank`를 `count desc limit 10`으로 조회하고(카테고리 선택 시 `where('category'==…)`), 상위 3위는 강조 배지.
- 순위 행 클릭 → 장비 상세.

### SR-5 비로그인 검색

**수용 기준**

- 비로그인 진입은 `/not-login-search` 웹뷰(`https://useless.my/search`)로 처리한다.
- 보유 토큰이 있으면 웹뷰에 `AUTH_TOKENS` 메시지로 주입한다([Auth.md](Auth.md) 웹뷰 계약).
- 네이티브 검색 UI에서 비로그인 상태로 `+`를 누르면 로그인 모달을 띄운다.

## 4. 데이터

- Algolia 계약·hit 필드: [DataModel.md](DataModel.md) DM-10. 순위: DM-6.
- 인기 검색어 API(Algolia Analytics top 10)는 `SearchStore.getTopSearches()`로 존재하며 세션 내 1회 캐시.

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| `/not-login-search` 프레젠테이션 | 모달 | 기본 | — |
| 검색 화면 상단 패딩 | 없음 | `paddingTop: 16` | — |

## 6. 엣지 케이스

- **결과 없음**: `검색 결과가 없습니다`.
- **순위 비어 있음**: `아직 등록된 장비가 없습니다`.
- **API 실패**(Algolia/Analytics/gear-rank): 에러 로깅 후 빈 배열 — 사용자 대상 에러 UI 없음.
- **로그인 상태 변경**: reaction으로 재검색해 보유 배지 갱신.

## 7. 수동 검증 체크리스트

- [ ] 한글 키워드로 카탈로그 검색이 동작한다 (`nameKorean` 검색)
- [ ] 결과 100개 초과 키워드에서 무한 스크롤 누적
- [ ] `+` → 창고 등록 + 배낭 담기 모달 → 새 배낭/기존 배낭 각각 동작
- [ ] 체크 배지 → 제거 경고 → 창고·배낭 모두에서 제거
- [ ] 추가/제거가 인기 순위 count에 반영
- [ ] 비로그인: 웹뷰 검색 노출, 네이티브 `+`는 로그인 모달

## 8. 미해결 질문

- `getTopSearches()`(인기 검색어)의 실제 노출 위치가 불분명 — 인기 "장비" 순위(SR-4)와 별개 기능인지 정리 필요.
- 검색 hit를 `Gear`로 변환할 때 `createDate: Date.now()`를 로컬 시각으로 채움 — 정렬(최근 추가순)에 영향 가능성.
