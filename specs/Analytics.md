# 클릭 로그 지표 (Firebase Analytics)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-07-29 코드 기준 — AN-3 표를 구현과 전수 대조해 동기화) · AN-4~AN-6 `[제안]` (2026-10-08, GA4 90일 점검 대응, 2.0.1 OTA) |
| ID 프리픽스 | `AN` |
| 주요 코드 | `model/analytics/`, `app/_layout.tsx`, 각 CTA 컴포넌트 |
| 관련 스펙 | [AppLifecycle.md](AppLifecycle.md), [Bag.md](Bag.md), [BagDetail.md](BagDetail.md), [Warehouse.md](Warehouse.md), [Search.md](Search.md), [Community.md](Community.md) |

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
- **내부(개발자) 트래픽 제외**: 로그인/로그아웃 시 `identifyUser(uid)`가 내부 UID 허용목록(`model/analytics/InternalUsers.ts`)을 확인해 사용자 속성 `is_internal`(`'true'`/`'false'`)을 설정한다. 수집은 그대로 두고 GA4/Firebase 대시보드에서 `is_internal=true`를 필터·제외해 지표를 분석한다. 로그아웃·일반 계정은 `'false'`로 되돌린다(기기 재사용 시 오태깅 방지). 앱 시작 시 `App.initialize`가 현재 로그인 사용자로 1회 반영하고, 이후 로그인/로그아웃은 `Firebase`가 처리한다.

### AN-2 화면 조회 자동 수집

**수용 기준**

- 라우트 변경 시마다 `logScreenView`를 1회 전송한다.
- 화면 이름은 동적 세그먼트를 정규화한 라우트 패턴을 쓴다 (예: `/bag/abc123` → `bag/[id]`) — 문서 ID가 지표에 노출되지 않는다.
- 같은 화면 연속 중복 전송은 하지 않는다.
- **네이티브 자동 화면 보고와 공존한다** (2026-10-08 점검): GA4 화면 보고서의 `RNSScreen`·`RNSTabsScreenViewController`·`UIViewController`·`MainActivity`는 Firebase SDK의 자동 `screen_view`(네이티브 뷰 컨트롤러/액티비티 클래스명)다. 이 자동 보고는 네이티브 설정(iOS `Info.plist` `FirebaseAutomaticScreenReportingEnabled`, Android 매니페스트 `google_analytics_automatic_screen_reporting_enabled`, RNFirebase는 `firebase.json`의 `react-native.google_analytics_automatic_screen_reporting_enabled`)으로만 끌 수 있어 **JS(OTA)로는 못 끈다**. 그때까지 화면 지표는 수동 전송분만 보도록 GA4에서 `screen_class`/`firebase_screen`이 라우트 패턴(`bag/[id]` 등)인 행으로 필터한다. 다음 네이티브 빌드(2.0.2+)에서 자동 보고를 끈다 — 미해결 질문 참조.

### AN-3 CTA 클릭 이벤트

**수용 기준** — 아래 이벤트를 각 CTA 핸들러 시작부에서 전송한다. 이벤트 추가·변경은 이 표를 갱신한 뒤 구현한다.

> **표와 구현은 전수 대조로 맞춘다.** 2026-07-29 점검에서 표에만 있는 항목 5건(폐기된 탐색 홈 SR-6의 이벤트)과 구현에만 있는 항목 13건이 발견됐다. 기능을 지우거나 이벤트를 추가하면서 이 표를 함께 갱신하지 않아 생긴 드리프트다. 대조는 아래로 확인한다.
>
> ```bash
> grep -rhoE "logClick\('[a-z_]+'" --include="*.ts" --include="*.tsx" . | grep -v node_modules | sed -E "s/logClick\('([a-z_]+)'/click_\1/" | sort -u
> ```
>
> 이 목록과 표의 활성 항목(= `[폐기]`·`[기획]` 제외)이 정확히 일치해야 한다.

**배낭 탭 / 상세 / 편집** ([Bag.md](Bag.md), [BagDetail.md](BagDetail.md), [BagShare.md](BagShare.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_bag_add` | 배낭 탭 `여행 추가` 버튼 | — |
| `click_bag_create_confirm` | 생성 모달 확인 (성공 시) | — |
| `click_bag_copy` | 복사 진입 (목록 행 아이콘 / 추가 바텀시트 / 상세 헤더 / 다음 여행 알림 NT-7) | `source`: `list` \| `add_sheet` \| `detail` \| `notification` |
| `click_bag_copy_confirm` | 복사 모달 확정 (성공 시) | `source`: 위와 동일 |
| `click_bag_delete` | 목록 행 삭제 → 다이얼로그에서 `삭제` 확정 | — |
| `click_bag_item` | 배낭 행 클릭 (상세 진입) | — |
| `click_bag_sort` | 배낭 목록 정렬 변경 (BAG-6) | `order`: 정렬 값 |
| `click_bag_share` | 상세 공유 버튼 (BD-7) | — |
| `click_bag_info_edit` | 상세 이름·날짜 행 클릭 (수정 모달, BD-1) | — |
| `click_bag_chart_toggle` | [폐기] 상세 무게 차트 접이식이 요약 영역 상시 표시로 대체(BD-3 재설계)되어 더 이상 발생하지 않음 | `expanded`: boolean |
| `click_bag_edit` | 상세 하단 바 `장비 추가` 버튼(옛 라벨 `수정하기`, BD-9). 장비가 1개 이상인 배낭에서만 — 빈 배낭은 `click_bag_empty_add` | — |
| `click_bag_empty_add` | `[제안]` 빈 배낭(장비 0개) 상세 하단 바 주 액션 (BD-13). 이때 `click_bag_edit`는 보내지 않는다 — 2.0.1 OTA 이전과 비교할 때는 `click_bag_edit` + `click_bag_empty_add(source=warehouse)`를 합산 | `source`: `warehouse`(창고에서 담기 → 편집) \| `search`(창고 비어 있음 → 검색 모달) \| `template`(예약 — 기존 배낭에 템플릿 적용 흐름이 생기면) |
| `click_bag_edit_confirm` | 편집 화면 하단 `확인` 버튼 | — |
| `click_gear_toggle` | 편집 화면 장비 담기/빼기 토글 (BD-4) | `added`: boolean |
| `click_bag_useless` | 상세 `사용 여부 기록하고…` 행 | — |
| `click_useless_confirm` | 사용 여부 기록 완료 (BD-5) | — |
| `click_useless_select_all` | 사용 여부 전체 선택/해제 (BD-5) | `selected`: boolean |
| `click_bag_memo` | 상세 `메모 작성하기` 행 | — |
| `click_memo_confirm` | 메모 저장 (BD-6) | — |
| `click_activity` | [기획] 상세 `운동 기록` 타일 (HA-1) | — |
| `click_activity_permission` | [기획] 건강 데이터 권한 요청 결과 (HA-2) | `granted`: boolean |
| `click_activity_link` | [기획] 운동 연결 확정 (HA-3) | `count`: 연결 수, `source`: `suggested` \| `manual` |
| `click_activity_unlink` | [기획] 운동 연결 해제 (HA-3) | — |
| `click_memo_delete` | 메모 삭제 확정 (BD-6) | — |
| `click_readyshot` | [폐기] 레디샷(배낭 이미지 공유) 기능이 제거되어 더 이상 발생하지 않음 | — |
| `click_film_card_open` | 상세 헤더 `필름 카드` 아이콘 (BS-1) | — |
| `click_film_card_photo` | 필름 카드 사진 선택 완료 (BS-2) | — |
| `click_film_card_share` | 필름 카드 `공유하기` (BS-5) | `has_activity`: boolean, `has_photo`: boolean |
| `click_film_card_save` | 필름 카드 갤러리 저장 (BS-5) | — |
| `click_film_card_element` | 필름 카드 요소 켜기/끄기 (BS-7) | `element`: 요소 종류, `on`: boolean |
| `click_bag_weather` | 배낭 상세 여행지 타일 → 여행지 허브 (DST-2/DST-8) | — |
| `click_bag_destination_directions` | 여행지 허브 `길찾기` (DST-8) | — |

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
| `click_warehouse_unused` | 창고 하단 `안 쓴 장비` 플로팅 버튼 → 전용 화면 (WH-2-1, 2026-08-13) | `from`: `warehouse` |
| `click_gear_delete` | 장비 삭제 확정 (WH-5 / GE-5) | `from`: `warehouse` \| `edit` |
| `click_gear_edit` | 장비 상세 `수정하기` (WH-4) | — |
| `click_gear_save` | 장비 등록/편집 저장 (GE-3/GE-4) | `mode`: `create` \| `edit` |
| `click_gear_photo_change` | [폐기] 공유 이미지 갤러리(GD-4)가 제거되어 더 이상 발생하지 않음 (장비 이미지 미제공, 2026-07-28) | — |
| `click_gear_photo_upload` | 내 장비 사진 업로드 시도 — 앨범·카메라에서 사진을 고른 직후 (GD-13) | `source`: `library` \| `camera`, `mode`: `create` \| `replace` |
| `click_gear_photo_delete` | 내 장비 사진 삭제 확정 (GD-13) | — |
| `click_gear_purchase` | 장비 상세 외부 구매·정보 링크 (GD-5) | `source`: `coupang` \| `brand` |
| `click_gear_share` | 장비 상세 공유 (GD-7) | — |
| `click_gear_review` | 장비 상세 외부 후기 항목 클릭 (GD-6) | `source`: `blog` \| `youtube` |
| `click_warehouse_fine_filter` | 창고 2차(세분) 카테고리 칩 (WH-2) | `category`: 세분 카테고리 값 \| `all` |

**리뷰 / 검색 / 인증·정보** ([Reply.md](Reply.md), [Search.md](Search.md), [Auth.md](Auth.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_reply_submit` | 댓글/답글 등록 (RP-1/RP-2) | `depth`: `comment` \| `reply` |
| `click_reply_like` | 댓글 좋아요 토글 (RP-5) | `liked`: boolean |
| `search` (GA4 표준) | 검색 실행 (SR-1) | `search_term`: 검색어 |
| `click_search_add` | 검색 결과에서 창고/배낭에 장비 추가 (SR-3) | `target`: `warehouse` \| `bag` |
| `click_search_rank_item` | 인기 장비 순위 행 클릭 (SR-4) | — |
| `click_search_empty_custom_add` | `[제안]` 검색 결과 없음 빈 상태의 `직접 추가` 탭 (SR-11). 비로그인으로 로그인 모달이 뜬 탭도 포함 | `source`: `feed` \| `warehouse` \| `bag` |
| `click_browse_category` | [폐기] 탐색 홈(SR-6)이 피드로 대체되며 화면이 제거돼 더 이상 발생하지 않음 | `category`: 카테고리 값 |
| `click_browse_brand_all` | [폐기] 위와 동일 — 브랜드 디렉토리로 가는 진입점이 코드에 없다(라우트만 잔존) | — |
| `click_browse_brand_preview` | [폐기] 위와 동일 | — |
| `click_browse_new_all` | [폐기] 위와 동일 — 신제품 캐러셀(SR-9)이 코드에 없다 | — |
| `click_browse_new_item` | [폐기] 위와 동일 | — |
| `click_brand_directory_item` | 브랜드 디렉토리 항목 클릭 → 브랜드 목록 (SR-8/SR-7) | — |
| `click_browse_sort` | 탐색 목록 정렬 변경 (SR-7) | `sort`: 정렬 값 |
| `click_feed_card` | 피드 카드 클릭 → 장비 상세 (FD-2) | — |
| `click_feed_add` | 피드 카드 담기/제거 토글 (FD-2) | `added`: boolean |
| `click_feed_coupang` | [폐기 2026-08-11] 목록 셀에서 쿠팡 최저가 링크를 없애 더 이상 발생하지 않는다 (FD-2). 커머스 링크는 장비 상세(GD-5)에만 있다 | — |
| `click_feed_brand` | 피드 상단 `브랜드` 진입 버튼 → 브랜드 시트 (FD-3) | — |
| `click_feed_sort` | 피드 상단 `정렬` 드롭다운 → 정렬 시트 (FD-3) | — |
| `click_feed_filter_apply` | 피드 필터 적용 — 카테고리 칩 즉시 적용, 브랜드 시트 `확인`, 정렬 시트 선택 (FD-3) | `category`: 카테고리 값 \| `all`, `brand_count`: 선택 브랜드 수, `sort`: 정렬 라벨(추천/인기순/최신순/가벼운순/무거운순) |
| `click_feed_filter_reset` | 피드 브랜드 시트 `초기화` (FD-3) | — |
| `click_feed_ranking` | 피드 하단 `인기 순위` 버튼 → 인기 순위 화면 (FD-3) | — |
| `click_feed_refresh` | 피드 pull-to-refresh (FD-4) | — |
| `click_feed_fine_filter` | 피드 2차(세분) 카테고리 칩 (FD-3) | `category`: 세분 카테고리 값 \| `all` |
| `click_ad_consent` | 광고 동의 흐름(UMP → iOS 추적 안내 시트 → iOS ATT → SDK 초기화) 완료 — 동의 흐름을 시작하는 광고 자리(탐색·커뮤니티 피드·검색 결과·장비 상세) 첫 포커스 시 앱 수명 동안 1회. 홈은 동의 흐름을 시작하지 않아 남기지 않는다 (AD-3·AD-5). 광고 노출·클릭은 AdMob이 집계하므로 따로 남기지 않는다 | `status`: `granted` \| `tracking_denied`(iOS 추적 거부·제한, 또는 앱이 활성 상태로 돌아오지 않아 ATT를 띄우지 못함) \| `blocked` \| `error`. 추적 안내 시트는 닫을 수 없어 항상 ATT로 이어지므로 시트 단계의 값은 따로 없다 |
| `click_subscription_open` | 구독 시트 진입(로그인 사용자만 — 비로그인은 로그인으로 보내고 남기지 않는다) — 설정(정보 탭) `광고 제거` 행, 한 장짜리 광고(홈·장비 상세) 아래 `광고 없이 보기` 링크, 한 번 뜨는 안내 시트의 `구독 알아보기` ([Subscription.md](Subscription.md) SUB-8·SUB-9) | `from`: `settings` \| `ad_card` \| `nudge` |
| `click_subscription_nudge` | 광고 누적 노출(자리 5곳 합산 20번) 뒤 한 번 뜨는 구독 안내 시트의 결과 — 기기당 한 번만 뜨므로 `shown`(시트가 실제로 뜬 순간) 뒤에 `open`·`dismiss` 중 하나가 따른다 (SUB-8·SUB-9) | `action`: `shown` \| `open`(`구독 알아보기` — 시트가 내려간 뒤 `click_subscription_open` `from: nudge`, 비로그인이면 로그인) \| `dismiss`(`괜찮아요`·스와이프·바깥 탭·안드로이드 뒤로가기) |
| `click_subscription_purchase` | 구독 시트 `구독하기` 결과(스토어 창이 닫힌 뒤) (SUB-2·SUB-8). 금액은 남기지 않는다 | `result`: `success` \| `cancelled` \| `pending`(결제 승인 대기 — iOS Ask to Buy·안드로이드 보류 결제) \| `error` |
| `click_subscription_restore` | 구독 시트 `구매 복원` 결과 (SUB-5·SUB-8) | `result`: `restored` \| `none` \| `error` |
| `click_readyshot_layout` | [폐기] 레디샷 기능 제거로 더 이상 발생하지 않음 | `type`: `grid` \| `collage` |
| `click_readyshot_share` | [폐기] 레디샷 기능 제거로 더 이상 발생하지 않음 | — |
| `click_login` | 로그인 버튼 (AU-1) | `provider`: `google` \| `apple` \| `email` |
| `click_logout` | 정보 탭 로그아웃 확정 (AU-4) | — |
| `click_withdraw` | 회원 탈퇴 확정 (AU-5) | — |
| `click_info_contact` | 정보 탭 서비스 문의 링크 (AU-4, 카카오 채널) | — |

**박지 지도** ([CampSite.md](CampSite.md))

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_camp_site` | 박지 상세 진입 (CS-3) | — |
| `click_camp_site_directions` | 박지 상세 `길찾기` 버튼 (CS-3) | — |
| `click_camp_site_share` | 박지 상세 공유 (CS-3) | — |
| `click_camp_site_favorite` | 박지 즐겨찾기 **추가** (CS-9) — 해제는 보내지 않는다 | — |
| `click_camp_site_favorites_open` | 즐겨찾기 목록 시트 열기 (CS-9) | — |
| `click_camp_site_review` | 박지 상세 외부 후기 항목 클릭 (CS-3) | `source`: `blog` \| `youtube` |
| `click_camp_site_review_write` | 박지 유저 후기 작성 진입 (CS-8) | — |
| `click_camp_site_review_bag` | 박지 유저 후기에 첨부된 배낭 열기 (CS-8) | — |

**커뮤니티** ([Community.md](Community.md)) `[제안]`

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_community_write` | 커뮤니티 `글쓰기` 탭(작성 화면 진입) | — |
| `click_community_publish` | 게시글 등록 성공 | `has_packing`: boolean, `has_poll`: boolean, `image_count`: 0~4 (2026-09-05 첨부 모델 — `type` 파라미터 폐기) |
| `click_community_post` | 피드 카드 → 상세 진입 | `has_packing`, `has_poll`: boolean |
| `click_community_filter` | 첨부 필터 변경 | `filter`: `all` \| `packing` \| `poll` |
| `click_community_sort` | 정렬 변경 | `sort`: `latest` \| `popular` |
| `click_community_like` | 게시글 좋아요 토글 | `liked`: boolean |
| `click_community_comment_submit` | 댓글·답글 등록 성공 | `depth`: `comment` \| `reply` |
| `click_community_vote` | 투표 성공 | `multiple`: boolean, `action`: `create` \| `switch` \| `add` \| `remove` (2026-09-05) |
| `click_info_my_posts` | 내 정보 `내가 쓴 글` 행 탭 | — |
| `click_community_my_posts` | 커뮤니티 필터 행 `내가 쓴 글` 칩 탭 | — |
| `click_community_search` | 커뮤니티 제목 행 검색 아이콘 탭 | — |
| `click_community_search_result` | 검색 결과 카드 → 상세 진입 | `has_packing`, `has_poll`: boolean, `query_length`: 질의 길이 |
| `click_community_snapshot_gear` | 패킹 스냅샷 장비 행 → 장비 상세 이동(카탈로그 장비만) | `gear_id` (2026-09-05) |
| `click_group_create` | 그룹 만들기 완료 | `has_destination`: boolean |
| `click_group_invite_copy` | 초대 링크 복사 | — |
| `click_group_join` | 초대 수락(참여 완료) | `member_count`: 참여 후 인원 |
| `click_group_open` | 그룹 목록 → 상세 진입 | — |
| `click_group_bag_link` | 그룹에 내 배낭 연결 | `item_count`: 장비 수 |
| `click_group_member_bag` | 멤버 배낭 상세 진입 | — |
| `click_group_route_upload` | 코스(GPX) 업로드 성공 | `distance`: m, `point_count` |
| `click_group_point_create` | 지도 포인트 등록 | `type`: `water` \| `shelter` \| `caution` \| `note` |
| `click_group_map_open` | 그룹 지도 열기 | — |
| `click_group_member_remove` | 방장이 멤버 내보내기 | — |
| `click_group_leave` | 그룹 나가기 / 해산 | `role`: `owner` \| `member` |
| `click_bag_group_link` | 배낭 상세 `⋯` → 그룹에 연결 성공 (BD-1) | — |
| `click_bag_group_unlink` | 배낭 상세 `⋯` → 그룹 연결 해제 (BD-1) | — |
| `click_bag_group_sync_schedule` | 연결 뒤 `그룹 일정으로 맞출까요?` 수락 (GRP-5, 그룹·배낭 양쪽) | `destination`: boolean (여행지도 박지로 맞췄는지) |
| `click_bag_route_upload` | 배낭 코스(GPX) 업로드 성공 (BD-11) | `distance`: m, `point_count` |
| `click_bag_route_to_group` | 배낭 코스를 연결된 그룹에 복사 (BD-11) | — |
| `click_trip_record_open` | 여행 기록 시트 진입 ([Community.md](Community.md) CM-16) `[제안]` | `source`: `notification` \| `bag_detail` \| `home` |
| `click_trip_record_submit` | 여행 기록 게시 성공 (CM-16) `[제안]` | `photo_count`, `has_body` |
| `click_trip_record_after` | 기록 후 완료 카드 액션 (CM-16) `[제안]` | `action`: `useless` \| `view` \| `close` |
| `click_home_trip_record` / `click_home_trip_record_write` / `click_home_trip_record_more` | 홈 최근 여행 기록 카드·기록하기·더 보기 ([Home.md](Home.md) HM-17) `[제안]` | — |
| `click_camp_site_record` / `click_camp_site_record_more` | 박지 상세 다녀온 기록 카드·전체 보기 ([CampSite.md](CampSite.md) CS-11) `[제안]` | — |
| `click_community_report` | 신고 등록 성공 | `target`: `post` \| `comment` |

- 커뮤니티 이벤트에는 게시글 ID, 작성자 ID·닉네임, 제목·본문, 투표 문구, 신고 상세를 보내지 않는다.

**온보딩 — 첫 여행 만들기 가이드** ([Onboarding.md](Onboarding.md) OB-9) `[제안]`

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `click_onboarding_trip_step` | 가이드 각 단계의 주 액션·보조 버튼. 1단계 `아직 미정이에요`는 `skip`, 2단계 미선택 상태의 `여행지 고르기`(선택기만 엶)는 보내지 않음, 4단계 주 액션은 `next`·`알림 없이 만들기`는 `skip` | `step`: `date` \| `destination` \| `gear` \| `done` \| `login`, `action`: `next` \| `skip`. `login`(2026-10-08, OB-11): 비로그인 완료 단계 `로그인하고 여행 만들기`=`next`, `나중에 할게요`=`skip`(이때 `done`은 보내지 않음) |
| `click_onboarding_trip_complete` | 가이드로 여행 생성 성공(`BagStore.add` 성공 기준) | `has_dates`: boolean(미정이면 false), `has_destination`: boolean, `gear_count`: 정수, `notification`: `granted` \| `denied` \| `skipped` \| `already` \| `unavailable` |
| `click_home_first_trip` | 비로그인 홈 히어로 `첫 여행 만들기`(HM-8, 2026-10-08) — 가이드를 로그인 전에 엶 | — |
| `welcome_view` | 첫 실행 환영 화면이 뜸(OB-14, 2026-10-08) — 화면 마운트 때 1회. 라우트 `welcome` `screen_view`와 별개의 퍼널용 명시 이벤트 | `audience`: `guest`(비로그인 첫 실행) \| `member`(여행 0개 로그인 사용자) |
| `click_welcome_start` | 환영 화면 `다음 백패킹 준비하기` → 가이드로 바꿈(OB-15) | — |
| `click_welcome_browse` | 환영 화면 `먼저 둘러볼게요` 또는 안드로이드 하드웨어 뒤로 → 홈(OB-15) | — |
| `click_welcome_login` | 환영 화면 `이미 계정이 있어요 · 로그인` → 로그인 모달(비로그인만, OB-15). 결과는 모달의 기존 `click_login` | — |
| `click_onboarding_trip_login` | 가이드 완료 단계에서 연 로그인 모달의 결과(OB-12). 재실행·약관 뒤 이어 만들기는 다시 보내지 않음 | `result`: `success` \| `cancel` |
| `click_onboarding_trip_dismiss` | 가이드 닫기 확정(× 또는 1단계 하드웨어 뒤로) | `step`: 닫은 단계(`date` \| `destination` \| `gear` \| `done`) |
| `click_onboarding_trip_gear_pick` | 가이드 3단계에서 장비를 담음(선택 해제는 미전송). 검색·직접 추가는 돌아와 자동 선택될 때 장비마다 1회 | `source`: `popular` \| `warehouse` \| `search` \| `custom`, `category`: GearFilter 그룹 키 |

- 가이드로 만든 여행은 `click_bag_create_confirm`을 보내지 않는다 — 생성 경로가 다르므로 `click_onboarding_trip_complete`로 구분한다. 전체 생성 수는 두 이벤트를 합산한다.

**알림** ([Notification.md](Notification.md)) `[제안]`

| 이벤트 | 트리거 | 파라미터 |
| --- | --- | --- |
| `notification_open` | 로컬·원격 알림을 탭해 앱 진입 (NT-10). 클릭이 아니라 `logEvent`로 보내므로 위 `logClick` 대조 목록에는 나오지 않는다 | `type`: `packing` \| `useless` \| `weekend_briefing`(NT-11) \| `next_trip` \| `weekend_camp` \| `notice` \| `unknown` |

- 이벤트 이름은 snake_case, `click_` 접두(표준 `search`·알림 `notification_open` 제외), 40자 이내 (GA4 제한).
- **`click_` 접두는 `logClick`이 붙인다** — 호출부는 `logClick('community_post')`처럼 접두 없이 넘긴다. 위 표의 이벤트 이름은 전송되는 최종 이름이다 (AN-5). `logEvent`(예: `notification_open`)에는 접두를 붙이지 않는다.
- 파라미터 값은 식별자가 아닌 열거형 문자열/불리언만 쓴다. `search_term`은 사용자 입력이지만 검색어 자체가 지표 대상이므로 허용 (개인정보 입력란 아님).

### AN-4 개발·테스트 빌드 수집 제외 `[제안]`

> 배경 (2026-10-08 GA4 90일 점검): 화면 `DevLauncherViewController`가 사용자 9명에 조회 5,408회로 잡히고, 평균 참여 시간이 1시간 57분으로 튀었다. 개발 클라이언트(expo-dev-client)를 띄워 둔 개발자 기기의 트래픽이 프로덕션 지표를 오염시킨 것이다. `is_internal`(AN-1)은 로그인한 내부 계정만 거르므로 비로그인·다른 계정으로 띄운 개발 빌드는 못 거른다.

**수용 기준**

- 앱 시작 시(`App.initialize` → `AnalyticsManager.initialize`) 실행 환경을 판정해, 아래 중 하나라도 해당하면 **수집 제외**로 본다.
  - `__DEV__` (Metro 개발 번들)
  - 개발 클라이언트 바이너리 — expo-dev-launcher의 디버그 전용 네이티브 모듈 `EXDevLauncher`가 있으면 개발 빌드다 (릴리스 바이너리엔 링크되지 않는다). `__DEV__`가 꺼진 번들을 개발 클라이언트로 띄운 경우까지 잡는다.
  - Expo Go (`Constants.executionEnvironment === 'storeClient'`)
  - Hot Updater 채널이 `production`이 아님 (예: `preview` 채널로 재서명한 검증용 빌드). 채널을 읽지 못하면(null) 제외하지 않는다 — 프로덕션 오판으로 수집이 끊기는 쪽이 더 나쁘다.
- 수집 제외면 네이티브 SDK에 `setAnalyticsCollectionEnabled(false)`를 보내고 이후 JS의 이벤트·화면·사용자 속성 전송을 모두 no-op으로 한다. 프로덕션이면 `setAnalyticsCollectionEnabled(true)`를 보낸다 — 기본값과 같아 **프로덕션 동작은 그대로**이고, 같은 기기에서 개발 빌드가 남긴 영구 비활성 설정을 되돌린다(이 설정은 SDK가 앱 재실행 너머로 보존한다).
- 한계: 이 판정은 JS가 뜬 뒤에 적용된다. 개발 빌드 **설치 후 첫 실행**에 JS 로드 전 네이티브가 자동 수집한 이벤트(`DevLauncherViewController` 화면 등)는 막지 못한다. 두 번째 실행부터는 보존된 비활성 설정으로 네이티브 자동 수집도 멈춘다.
- 개발 중 GA4 DebugView로 이벤트를 검증해야 할 때는 `.env`에 `EXPO_PUBLIC_ANALYTICS_DEV_COLLECTION=1`을 두고 Metro를 재시작하면 제외를 건너뛴다 (프로덕션 번들에 이 값을 넣지 않는다).
- 웹은 기존대로 전부 no-op이다.

### AN-5 `click_` 접두 중복 방지 `[제안]`

> 배경: GA4에 `click_click_community_post`가 잡혔다. 커뮤니티·내 정보 호출부 13곳이 `logClick('click_…')`처럼 접두를 붙여 넘겨 `logClick`이 한 번 더 붙였다.

**수용 기준**

- 호출부는 접두 없이 넘긴다 (`logClick('community_post')`). 기존 13곳을 고친다 — 전송 이름은 AN-3 표 그대로(`click_community_post` 등)가 된다.
- `logClick`은 넘어온 이름이 이미 `click_`로 시작하면 한 번 떼고 보낸다(가드). `__DEV__`에서는 `console.warn`으로 호출부를 고치라고 알린다.
- 기존에 `click_click_*`로 쌓인 데이터는 되돌리지 않는다 — GA4에서 두 이름을 합쳐 본다.

### AN-6 앱·OTA 컨텍스트 사용자 속성 `[제안]`

**수용 기준**

- 앱 시작 시(수집 제외가 아닐 때) 사용자 속성 두 개를 설정한다. 값은 정보 탭 버전 푸터(AU-4)와 같은 출처(`getAppVersionInfo`)다.
  - `app_channel` — Hot Updater 채널 (`production` 등). 읽지 못하면 `unknown`.
  - `ota_bundle` — 현재 실행 중인 Hot Updater 번들 ID. 내장 번들(OTA 미적용)이면 `embedded`. GA4 사용자 속성 값 한도(36자)에 UUID(36자)가 그대로 들어가므로 자르지 않는다 — 자르면 같은 분에 연달아 배포한 iOS·Android 번들(UUIDv7 앞자리 = 시각)이 겹친다.
- 개인 식별 정보가 아니다 (기기·사용자 단위가 아닌 배포 단위 값).
- GA4 콘솔에서 두 속성을 사용자 범위 맞춤 측정기준으로 등록해야 보고서에 보인다 (운영 작업).

> **운영 메모**: GA4 → BigQuery 내보내기 연결은 별도 운영 작업으로 진행 중이다 (코드 변경 없음). 연결되면 위 사용자 속성·`screen_class` 필터를 SQL로 다룬다.

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
- **개발 빌드**: 수집하지 않는다 (AN-4, 2026-10-08 변경 — 이전엔 `__DEV__`에서도 전송했다). DebugView 검증이 필요하면 `EXPO_PUBLIC_ANALYTICS_DEV_COLLECTION=1`로 켠다.

## 7. 수동 검증 체크리스트

- [ ] Android 에뮬레이터에서 `adb shell setprop debug.firebase.analytics.app com.doublejbs.useless` 후 GA4 DebugView에 이벤트 도착
- [ ] 배낭 복사 3개 진입점 각각 → `click_bag_copy`의 `source` 값이 구분됨
- [ ] 화면 이동 시 `screen_view`의 화면 이름이 `bag/[id]` 형태로 정규화됨
- [ ] 웹 빌드(`npm run web:export`)가 RNFirebase 때문에 깨지지 않고, 웹 런타임에서 클릭해도 에러 없음
- [ ] 이벤트 파라미터에 문서 ID·이메일 등 식별 정보가 없음
- [ ] `[제안]` 커뮤니티 작성·등록·상세·필터·좋아요·댓글·투표·신고 이벤트가 표의 이름·파라미터와 일치
- [ ] (AN-4) 개발 클라이언트(`npm run ios`)로 띄우면 DebugView에 이벤트가 오지 않음 / `EXPO_PUBLIC_ANALYTICS_DEV_COLLECTION=1`로 재시작하면 옴
- [ ] (AN-4) 프로덕션 채널 OTA 적용 후 실시간 보고서에 이벤트가 계속 들어옴 (수집이 끊기지 않음)
- [ ] (AN-4) 배포 1~2주 뒤 GA4에서 `DevLauncherViewController` 화면 조회가 사라지고 평균 참여 시간이 정상 범위로 돌아옴
- [ ] (AN-5) 커뮤니티 카드 탭 → `click_community_post` 1회 (`click_click_*` 아님). 아래 명령의 결과가 비어 있음
  ```bash
  grep -rnE "logClick\(\s*'click_" --include="*.ts" --include="*.tsx" app components model hooks
  ```
- [ ] (AN-6) DebugView 사용자 속성에 `app_channel=production`, `ota_bundle=<번들 UUID 또는 embedded>`가 보임
- [ ] (AN-2) GA4 화면 보고서에서 `screen_class`가 라우트 패턴인 행만 필터해 보면 네이티브 클래스명 행이 빠짐

## 8. 미해결 질문

- ~~개발/프로덕션 트래픽 분리(디버그 트래픽 필터) 필요 여부~~ — AN-4로 해결 (2026-10-08).
- 네이티브 자동 화면 보고 끄기 (AN-2) — `firebase.json`의 `react-native.google_analytics_automatic_screen_reporting_enabled: false`(네이티브 설정, OTA 불가)를 다음 바이너리(2.0.2+)에 넣을지. 같이 `analytics_auto_collection_enabled`는 건드리지 않는다(프로덕션 수집 유지). 개발 빌드 첫 실행 누수(AN-4 한계)도 네이티브에서 디버그 구성만 기본 비활성으로 두면 막을 수 있다.
- 탭 전환(창고/탐색/배낭/정보)을 screen_view 외 별도 클릭 이벤트로도 볼지 — 초기에는 screen_view로 충분하다고 판단.
