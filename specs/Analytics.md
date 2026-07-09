# 클릭 로그 지표 (Firebase Analytics)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-07-03 코드 기준) |
| ID 프리픽스 | `AN` |
| 주요 코드 | `model/analytics/`, `app/_layout.tsx`, 각 CTA 컴포넌트 |
| 관련 스펙 | [AppLifecycle.md](AppLifecycle.md), [Bag.md](Bag.md), [BagDetail.md](BagDetail.md), [Warehouse.md](Warehouse.md), [Search.md](Search.md) |

## 1. 개요

주요 CTA 클릭과 화면 조회를 Firebase Analytics(GA4)로 수집해 기능 사용 지표를 확인한다.
백엔드는 이미 설치·연결된 `@react-native-firebase/analytics`를 사용한다 (추가 의존성 없음).

## 2. 화면 및 진입

- 전역 매니저: `AnalyticsManager` — `app.getAnalyticsManager()`로 접근 (기존 매니저 패턴).
- 화면 조회: `app/_layout.tsx`에서 라우트 변경을 감지해 자동 수집.
- 클릭: 각 CTA 핸들러에서 매니저 호출.

## 3. 요구사항

### AN-1 AnalyticsManager

**수용 기준**

- `logClick(element, params?)` — GA4 이벤트 `click_{element}`를 전송한다. 공통 파라미터 `screen`(현재 화면)을 포함한다.
- `logScreenView(screenName)` — GA4 표준 `logScreenView`를 전송한다.
- **웹에서는 모든 메서드가 no-op** — 호출부는 플랫폼을 신경 쓰지 않는다. RNFirebase 모듈은 네이티브에서만 로드한다(웹 번들에 포함 금지).
- 전송 실패는 앱 동작에 영향을 주지 않는다 (fire-and-forget, 알럿/토스트 금지).
- 이벤트·파라미터에 개인 식별 정보(이메일, 닉네임 등)를 넣지 않는다. `setUserId`는 사용하지 않는다.

### AN-2 화면 조회 자동 수집

**수용 기준**

- 라우트 변경 시마다 `logScreenView`를 1회 전송한다.
- 화면 이름은 동적 세그먼트를 정규화한 라우트 패턴을 쓴다 (예: `/bag/abc123` → `bag/[id]`) — 문서 ID가 지표에 노출되지 않는다.
- 같은 화면 연속 중복 전송은 하지 않는다.

### AN-3 CTA 클릭 이벤트

**수용 기준** — 아래 이벤트를 각 CTA 핸들러 시작부에서 전송한다. 이벤트 추가·변경은 이 표를 갱신한 뒤 구현한다.

**배낭 탭 / 상세 / 편집** ([Bag.md](Bag.md), [BagDetail.md](BagDetail.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_bag_add` | 배낭 탭 `배낭 추가` 버튼 | — |
| `click_bag_create_confirm` | 생성 모달 확인 (성공 시) | — |
| `click_bag_copy` | 복사 진입 (목록 행 아이콘 / 추가 바텀시트 / 상세 헤더) | `source`: `list` \| `add_sheet` \| `detail` |
| `click_bag_copy_confirm` | 복사 모달 확정 (성공 시) | `source`: 위와 동일 |
| `click_bag_delete` | 목록 행 삭제 → 다이얼로그에서 `삭제` 확정 | — |
| `click_bag_item` | 배낭 행 클릭 (상세 진입) | — |
| `click_bag_share` | 상세 공유 버튼 (BD-7) | — |
| `click_bag_info_edit` | 상세 이름·날짜 행 클릭 (수정 모달, BD-1) | — |
| `click_bag_chart_toggle` | [폐기] 상세 무게 차트 접이식이 요약 영역 상시 표시로 대체(BD-3 재설계)되어 더 이상 발생하지 않음 | `expanded`: boolean |
| `click_bag_edit` | 상세 `수정하기` 버튼 | — |
| `click_bag_edit_confirm` | 편집 화면 하단 `확인` 버튼 | — |
| `click_gear_toggle` | 편집 화면 장비 담기/빼기 토글 (BD-4) | `added`: boolean |
| `click_bag_useless` | 상세 `사용 여부 기록하고…` 행 | — |
| `click_useless_confirm` | 사용 여부 기록 완료 (BD-5) | — |
| `click_useless_select_all` | 사용 여부 전체 선택/해제 (BD-5) | `selected`: boolean |
| `click_bag_memo` | 상세 `메모 작성하기` 행 | — |
| `click_memo_confirm` | 메모 저장 (BD-6) | — |
| `click_memo_delete` | 메모 삭제 확정 (BD-6) | — |
| `click_readyshot` | 상세 `레디샷 만들기` 행 | — |

**패킹** ([Packing.md](Packing.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_packing_start` | 상세 패킹 CTA (PK-1) | `gear_count`: 장비 수, `d_day`: 출발까지 일수(지났으면 음수) |
| `click_packing_toggle` | 패킹 모드 행 토글 (PK-2) | `packed`: boolean |
| `click_packing_complete` | 전체 챙김 도달 (PK-5) | `gear_count`, `duration_seconds`: `packingStartedAt`→완료, `d_day` |
| `click_packing_exit` | 미완료 상태로 패킹 모드 이탈 (PK-4) | `progress_percent`: 0~100 정수 |

**창고 / 장비 상세 / 장비 편집** ([Warehouse.md](Warehouse.md), [GearDetail.md](GearDetail.md), [GearEdit.md](GearEdit.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_gear_add` | 창고 `장비 추가` 버튼 (WH-7) | — |
| `click_gear_item` | 장비 행 클릭 (장비 상세 진입) | `from`: `warehouse` \| `bag_detail` \| `search` |
| `click_warehouse_filter` | 창고 카테고리 필터 (WH-2) | `category`: 필터 값 |
| `click_warehouse_sort` | 창고 정렬 변경 (WH-3) | `order`: 정렬 값 |
| `click_gear_delete` | 장비 삭제 확정 (WH-5 / GE-5) | `from`: `warehouse` \| `edit` |
| `click_gear_edit` | 장비 상세 `수정하기` (WH-4) | — |
| `click_gear_save` | 장비 등록/편집 저장 (GE-3/GE-4) | `mode`: `create` \| `edit` |
| `click_gear_photo_change` | 장비 상세 `대표 사진 변경` (GD-4) | — |
| `click_gear_purchase` | 장비 상세 최저가 구입하기 (GD-5) | — |

**리뷰 / 검색 / 레디샷 / 인증·정보** ([Reply.md](Reply.md), [Search.md](Search.md), [ShareImage.md](ShareImage.md), [Auth.md](Auth.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_reply_submit` | 댓글/답글 등록 (RP-1/RP-2) | `depth`: `comment` \| `reply` |
| `click_reply_like` | 댓글 좋아요 토글 (RP-5) | `liked`: boolean |
| `search` (GA4 표준) | 검색 실행 (SR-1) | `search_term`: 검색어 |
| `click_search_add` | 검색 결과에서 창고/배낭에 장비 추가 (SR-3) | `target`: `warehouse` \| `bag` |
| `click_search_rank_item` | 인기 장비 순위 행 클릭 (SR-4) | — |
| `click_browse_category` | 탐색 홈 카테고리 칩/그리드 클릭 (SR-6/SR-7) | `category`: 카테고리 값 |
| `click_browse_brand_all` | 탐색 홈 `브랜드 전체 보기` 클릭 → 디렉토리 (SR-6/SR-8) | — |
| `click_browse_brand_preview` | 탐색 홈 인기 브랜드 미리보기 항목 클릭 → 브랜드 목록 (SR-6/SR-7) | — |
| `click_browse_new_all` | 탐색 홈 신제품 `전체 보기` 클릭 → 최신순 목록 (SR-6/SR-9) | — |
| `click_browse_new_item` | 탐색 홈 신제품 캐러셀 항목 클릭 → 장비 상세 (SR-9) | — |
| `click_brand_directory_item` | 브랜드 디렉토리 항목 클릭 → 브랜드 목록 (SR-8/SR-7) | — |
| `click_browse_sort` | 탐색 목록 정렬 변경 (SR-7) | `sort`: 정렬 값 |
| `click_feed_card` | 피드 카드 클릭 → 장비 상세 (FD-2) | — |
| `click_feed_add` | 피드 카드 담기/제거 토글 (FD-2) | `added`: boolean |
| `click_feed_coupang` | 피드 카드 쿠팡 최저가 링크 (FD-2) | — |
| `click_feed_brand` | 피드 상단 `브랜드` 진입 버튼 → 브랜드 시트 (FD-3) | — |
| `click_feed_sort` | 피드 상단 `정렬` 드롭다운 → 정렬 시트 (FD-3) | — |
| `click_feed_filter_apply` | 피드 필터 적용 — 카테고리 칩 즉시 적용, 브랜드 시트 `확인`, 정렬 시트 선택 (FD-3) | `category`: 카테고리 값 \| `all`, `brand_count`: 선택 브랜드 수, `sort`: 정렬 라벨(추천/인기순/최신순/가벼운순/무거운순) |
| `click_feed_filter_reset` | 피드 브랜드 시트 `초기화` (FD-3) | — |
| `click_feed_ranking` | 피드 하단 `인기 순위` 버튼 → 인기 순위 화면 (FD-3) | — |
| `click_feed_refresh` | 피드 pull-to-refresh (FD-4) | — |
| `click_readyshot_layout` | 레디샷 레이아웃 전환 (SI-2/SI-3) | `type`: `grid` \| `collage` |
| `click_readyshot_share` | 레디샷 캡처·공유 (SI-4) | — |
| `click_login` | 로그인 버튼 (AU-1) | `provider`: `google` \| `apple` \| `email` |
| `click_logout` | 정보 탭 로그아웃 확정 (AU-4) | — |
| `click_withdraw` | 회원 탈퇴 확정 (AU-5) | — |
| `click_info_contact` | 정보 탭 서비스 문의 링크 (AU-4, 카카오 채널) | — |

- 이벤트 이름은 snake_case, `click_` 접두(표준 `search` 제외), 40자 이내 (GA4 제한).
- 파라미터 값은 식별자가 아닌 열거형 문자열/불리언만 쓴다. `search_term`은 사용자 입력이지만 검색어 자체가 지표 대상이므로 허용 (개인정보 입력란 아님).

## 4. 데이터

- 수집처: Firebase 프로젝트 `lessismore-7e070`의 GA4 (GoogleService-Info.plist / google-services.json 기존 연결).
- Firestore에는 아무것도 쓰지 않는다 ([DataModel.md](DataModel.md) 변경 없음).

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 이벤트 전송 | RNFirebase | RNFirebase | **no-op** |
| 모듈 로드 | 정적 가능 | 정적 가능 | 웹 번들에서 RNFirebase 제외 (동적 require 분기) |

## 6. 엣지 케이스

- **비로그인**: 로그인 여부와 무관하게 수집한다 (개인 식별 정보 없음).
- **전송 실패/오프라인**: SDK 큐잉에 맡기고 앱은 무시한다.
- **개발 빌드**: `__DEV__`에서도 전송한다 (GA4 DebugView로 검증). 분리가 필요해지면 파라미터가 아닌 GA 데이터 스트림 차원에서 다룬다 — 미해결 질문 참조.

## 7. 수동 검증 체크리스트

- [ ] Android 에뮬레이터에서 `adb shell setprop debug.firebase.analytics.app com.doublejbs.useless` 후 GA4 DebugView에 이벤트 도착
- [ ] 배낭 복사 3개 진입점 각각 → `click_bag_copy`의 `source` 값이 구분됨
- [ ] 화면 이동 시 `screen_view`의 화면 이름이 `bag/[id]` 형태로 정규화됨
- [ ] 웹 빌드(`npm run web:export`)가 RNFirebase 때문에 깨지지 않고, 웹 런타임에서 클릭해도 에러 없음
- [ ] 이벤트 파라미터에 문서 ID·이메일 등 식별 정보가 없음

## 8. 미해결 질문

- 개발/프로덕션 트래픽 분리(디버그 트래픽 필터) 필요 여부 — 초기에는 미분리.
- 탭 전환(창고/탐색/배낭/정보)을 screen_view 외 별도 클릭 이벤트로도 볼지 — 초기에는 screen_view로 충분하다고 판단.
