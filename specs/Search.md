# 검색

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (탐색 SR-6~9는 2026-07-07 구현 기준) |
| ID 프리픽스 | `SR` |
| 주요 코드 | `app/(tabs)/search.tsx`, `app/search/`, `app/browse/`, `app/brand-directory/`, `app/not-login-search/`, `components/search/`, `components/search-page/`, `components/browse/`, `model/search/`, `model/browse/` |
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
| `/browse?category=&brand=&sort=` | 전체 | 카테고리·브랜드 목록 + 정렬 (SR-7) |
| `/brand-directory` | 전체 | 브랜드 디렉토리 인기순 (SR-8) |

## 3. 요구사항

### SR-1 검색 실행

**수용 기준**

- 입력 300ms 디바운스 후 Algolia `useless-gear-search` 인덱스를 검색한다([DataModel.md](DataModel.md) DM-10).
- 페이지 크기 100, 무한 스크롤(`onEndReached` 임계 0.1)로 다음 페이지를 누적 로드, `nbPages` 도달 시 중단.
- 키워드 클리어 버튼(X) 제공. 플레이스홀더는 하드코딩된 제안 키워드 9종 중 무작위 + 조사 처리.
- 검색 화면 포커스 복귀 시 현재 키워드로 즉시 재검색한다(보유 상태 동기화 목적).

### SR-2 검색 결과 표시와 보유 배지

**수용 기준**

- 결과 행: 이미지/제조사/이름/무게 + 우측 버튼. 제조사 표시는 **`companyKorean || company`** (브랜드 디렉토리·미리보기와 동일 규칙 — 니모/NEMO/nemo 혼재 방지).
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

> **참고(코드 실태)**: `/not-login-search`로 이동하는 네비게이션 호출이 현재 코드에 없다(탐색 탭은 로그인·비로그인 모두 네이티브 `SearchPageView`). 아래 탐색 기능(SR-6~9)도 네이티브로 구현하고, 비로그인은 `+`만 로그인 모달로 게이트한다(SR-3 패턴).

### SR-6 탐색 홈 (키워드 없음 상태)

키워드가 비어 있을 때 화면을 **둘러보기 홈**으로 구성한다. 인기 순위만 있던 기존 상태(SR-4)를 확장한다.

**수용 기준**

- 다음 섹션을 노출한다(순서는 UX 리뷰에서 조정 가능). 실제 구현 순서는 **카테고리별 탐색 → 브랜드별 탐색 → 신제품 → 인기 장비 순위**다:
  1. **인기 장비 순위** — 기존 SR-4 그대로 유지.
  2. **카테고리별 탐색** — 카테고리 진입(칩/그리드). 탭 → SR-7 목록(해당 카테고리).
  3. **브랜드별 탐색** — `브랜드 전체 보기` 진입 → SR-8 디렉토리. (상단에 인기 브랜드 일부 미리 노출 가능.)
  4. **신제품** — SR-9 최근 추가 캐러셀.
- 키워드 입력이 시작되면 기존 검색 결과(SR-1/2/3)로 전환한다.

### SR-7 카테고리·브랜드 장비 목록 + 정렬

**수용 기준**

- 진입: 카테고리 또는 브랜드 선택(둘 조합 가능). Algolia `useless-gear-search` 조회 — 카테고리는 `category`, 브랜드는 `companyKorean` **또는** `company` facet(OR — 두 값을 같은 facetFilters 내부 배열로 묶어 매칭)로 필터한다. `companyKorean`이 없는 영문 브랜드도 매칭되도록 하기 위함이다([DataModel.md](DataModel.md) DM-10).
- 무한 스크롤·페이지네이션은 SR-1 방식을 재사용한다.
- **정렬 옵션**: `무게순(가벼운순/무거운순)` · `최신순`(createDate desc) · `인기순`(보유수 count desc). Algolia 정렬 replica 사용([DataModel.md](DataModel.md) DM-10).
- 결과 행·보유 배지·`+` 창고추가/배낭담기는 SR-2/SR-3을 그대로 재사용한다. 비로그인 `+`는 로그인 모달.
- 빈 결과: `장비가 없습니다`.

### SR-8 브랜드 디렉토리

**수용 기준**

- `brand-rank`([DataModel.md](DataModel.md) DM-14)를 **`ownerCount desc`(실제 사용자 보유수 합계 = 인기순)**로 조회해 브랜드 목록을 표시한다. 각 항목에 브랜드명 + **제품 수**(보유 수는 정렬 키로만 쓰고 노출하지 않음).
- 항목 탭 → SR-7(해당 브랜드 목록, 기본 정렬 인기순).
- **브랜드명 검색 필터**: 디렉토리 상단 검색 입력으로 이미 로드된 목록을 로컬 필터한다(서버 재조회 없음). `companyKorean`·`company` 모두 대상, 대소문자 무시 부분 일치. 키워드 클리어(X) 제공. 필터 결과 없음: `브랜드가 없습니다`.
- (후순위) 가나다 인덱스.
- 빈/실패: 빈 배열, 에러 UI 없음(SR 엣지 케이스 정책).

### SR-9 신제품 (최근 추가)

**수용 기준**

- Algolia `createDate desc` replica로 최근 추가 상위 N개(기본 20)를 조회해 가로 캐러셀로 표시한다.
- 항목 탭 → 장비 상세. `전체 보기` → SR-7(최신순 전체 목록).
- `createDate`는 **카탈로그 추가 시각**이며 실제 출시일이 아니다([DataModel.md](DataModel.md) DM-3).

## 4. 데이터

- Algolia 계약·hit 필드: [DataModel.md](DataModel.md) DM-10. 순위: DM-6. 브랜드 집계: DM-14.
- 인기 검색어 API(Algolia Analytics top 10)는 `SearchStore.getTopSearches()`로 존재하며 세션 내 1회 캐시.
- **탐색(SR-6~9) 전제 — Algolia 인덱스 설정** (스크립트/대시보드, Algolia admin 키 필요): `attributesForFaceting`에 `category`·`companyKorean`·`company` 추가(filterOnly 가능 — 브랜드 OR 필터에 `company` 필요), 정렬 replica `weight asc/desc`·`createDate desc`·`count desc` 생성, 각 레코드에 `count`(gear-rank 보유수) 동기화(인기순 정렬용, 미보유는 0). 설정·동기화 스크립트는 [DataModel.md](DataModel.md) DM-10/DM-14 참조.

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
- [x] 탐색 홈: 카테고리 그리드·브랜드 미리보기(인기순)·신제품 캐러셀 노출 (iOS/Android 2026-07-07 확인)
- [x] 목록: 카테고리·브랜드 필터 + 4개 정렬 동작 (가벼운순 오름차순 실측 확인)
- [x] 브랜드 디렉토리: brand-rank 인기순·보유/제품 수 표시
- [x] 비로그인 목록 `+` → 로그인 모달 (Android 확인)

## 8. 미해결 질문

- `getTopSearches()`(인기 검색어)의 실제 노출 위치가 불분명 — 인기 "장비" 순위(SR-4)와 별개 기능인지 정리 필요.
- 검색 hit를 `Gear`로 변환할 때 `createDate: Date.now()`를 로컬 시각으로 채움 — 정렬(최근 추가순)에 영향 가능성.
