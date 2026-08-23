# L10N-14 구현·l10n-ignore 재감사

## 카테고리 표시명 표

`category.*`가 표시 매핑의 단일 소스다. `ko`는 Firestore 캐논컬 표시와 같고, `en`·`ja`는 화면 표시용 번역이다.

| 키 | ko | en | ja |
| --- | --- | --- | --- |
| `category.all` | 전체 | All | すべて |
| `category.tent` | 텐트 | Tent | テント |
| `category.sleepingBag` | 침낭 | Sleeping bag | 寝袋 |
| `category.backpack` | 배낭 | Backpack | バックパック |
| `category.clothing` | 의류 | Clothing | ウェア |
| `category.mat` | 매트 | Sleeping pad | マット |
| `category.furniture` | 가구 | Furniture | ファニチャー |
| `category.lantern` | 랜턴 | Lantern | ランタン |
| `category.cooking` | 조리 | Cookware | 調理 |
| `category.electronic` | 전자기기 | Electronics | 電子機器 |
| `category.food` | 음식 | Food | 食料 |
| `category.etc` | 기타 | Etc | その他 |
| `category.fine.backpack` | 배낭 | Backpack | バックパック |
| `category.fine.vest_pack` | 베스트 배낭 | Vest pack | ベストパック |
| `category.fine.backpack_cover` | 배낭 커버 | Backpack cover | バックパックカバー |
| `category.fine.tent` | 텐트 | Tent | テント |
| `category.fine.tarp` | 타프 | Tarp | タープ |
| `category.fine.shelter` | 쉘터 | Shelter | シェルター |
| `category.fine.tent_acc` | 텐트ACC | Tent accessories | テントアクセサリー |
| `category.fine.sleeping_bag` | 침낭 | Sleeping bag | 寝袋 |
| `category.fine.mat` | 매트 | Sleeping pad | マット |
| `category.fine.pillow` | 필로우 | Pillow | ピロー |
| `category.fine.cup` | 컵 | Cup | カップ |
| `category.fine.bowl` | 그릇 | Bowl | ボウル |
| `category.fine.cutlery` | 수저 | Cutlery | カトラリー |
| `category.fine.stove` | 버너 | Stove | バーナー |
| `category.fine.torch` | 토치 | Torch | トーチ |
| `category.fine.bottle` | 물통 | Water bottle | ボトル |
| `category.fine.cookware` | 코펠·쿡웨어 | Cookware | クッカー |
| `category.fine.cookware_etc` | 식기류 기타 | Other cookware | その他の食器 |
| `category.fine.chair` | 체어 | Chair | チェア |
| `category.fine.table` | 테이블 | Table | テーブル |
| `category.fine.furniture_etc` | 그 외 기타 | Other furniture | その他の家具 |
| `category.fine.clothing` | 일반 | General | 一般 |
| `category.fine.sunglasses` | 선글라스 | Sunglasses | サングラス |
| `category.fine.gaiter` | 스패츠 | Gaiters | ゲイター |
| `category.fine.gloves` | 장갑 | Gloves | グローブ |
| `category.fine.lighting` | 조명 | Lighting | 照明 |
| `category.fine.headlamp` | 헤드랜턴 | Headlamp | ヘッドランプ |
| `category.fine.food` | 식품 | Food | 食品 |
| `category.fine.towel` | 수건 | Towel | タオル |
| `category.fine.pouch` | 파우치/수납가방 | Pouch / storage bag | ポーチ／収納バッグ |
| `category.fine.hand_warmer` | 핫팩 | Hand warmer | カイロ |
| `category.fine.shovel` | 삽 | Shovel | シャベル |
| `category.fine.hammer` | 망치 | Hammer | ハンマー |
| `category.fine.microspikes` | 아이젠 | Microspikes | アイゼン |
| `category.fine.trekking_pole` | 트레킹폴 | Trekking pole | トレッキングポール |
| `category.fine.etc` | 그 외 기타 | Other | その他 |
| `category.fine.electronic` | 전자기기 | Electronics | 電子機器 |

무게 분해의 `베이스`는 기존 `bagDetail.summary.base` 키를 유지하면서 en `Base`, ja `ベース`로 이미 번역돼 있다(BD-3).

## 라벨/값 분리 및 저장 경로 감사

- `getGearFilterName()`은 `L10nRegistry.getAppTranslation('category.*')`만 반환한다. `getGearFilterCanonicalName()`과 `GEAR_FILTER_NAMES`는 캐논컬 폴백·순서 소스로만 남겼다.
- `WarehouseFilter.getName()`은 캐논컬 이름(또는 내부 참조 값), `getLabel()`은 번역 표시명이다. 창고·배낭 편집·직접 입력·템플릿·패킹 화면은 `getLabel()`을 쓴다.
- `FilterManager`와 `CustomGearCategory`의 정의는 `GEAR_FILTER_NAMES[GearFilter.*]`를 저장 값으로 사용하며, 직접 입력 등록은 `CustomGear.getSelectedFilter()`(enum)를 `Gear.category`에 넣는다.
- 배낭 상세 그룹도 `GearFilter`/캐논컬 이름으로만 참조하고 표시할 때 `getGearFilterName()`을 쓴다. 스크롤 ref 키는 `filter.getFilter()`로 바꿨다.
- 세분 카테고리는 `FINE_CATEGORY_LABELS`를 캐논컬 폴백으로 유지하고, `getFineCategoryLabel()`이 `category.fine.*`를 표시한다. 조회·필터링은 기존 세분 키(`getCategory()`) 그대로다.

Firestore 쓰기 회귀 확인:

| 경로 | 확인 결과 |
| --- | --- |
| `model/store/GearStore.ts:327` `batch.set(..., gear.getData())` | `Gear.getData().category` 원본 세분 값 유지 |
| `model/store/GearStore.ts:343-347` `gear-rank` 생성 | `gear.getGroupCategory()` enum 값 유지 |
| `model/store/GearStore.ts:445` `batch.update(..., gear.getData())` | 수정 시에도 원본 category 유지 |
| `model/gear/custom/CustomGear.ts:62,72` | 선택 필터 enum을 `Gear` 생성자와 등록에 전달; 라벨 미사용 |
| `model/gear/edit/GearEdit.ts:51,65,77` | 기존 원본의 그룹 enum을 선택하고 update; 표시 라벨 미사용 |
| `model/bag-edit/BagEdit.ts:113,135-179` | 조회/저장은 선택 `getFilter()`와 장비 객체 사용; 라벨 미사용 |

정렬 옵션은 이미 `common.order.*` 번역 키 기반 `OrderOption.fromKey()`를 사용한다. `OrderType` 값과 `selectedOrderType_{key}` 저장, `saveLastOrderOption()` 동작은 변경하지 않았다.

## l10n-ignore 재분류

초기 감사 집계는 저장소 검색 결과 283줄이었고, 이 중 `scripts/find-hardcoded-korean.mjs`의 검출 패턴 문자열 1줄을 제외한 실제 ignore 주석은 282줄이었다. 표시 문자열인 카테고리·검색 예시·WeatherService 최종 오류의 33개 ignore 지점을 번역 경로로 전환했고, 캐논컬 폴백으로 남겨야 하는 카테고리 리터럴에는 명시적 사유를 보강했다. 현재 실제 유지 ignore는 249줄(검출 패턴 문자열까지 검색하면 250줄)이다.

| 분류 | 유지 지점 | 사유 |
| --- | ---: | --- |
| 개발자 로그/console | 138 | 사용자 UI가 아닌 디버깅·예외 진단 로그 |
| 후기 검색 매칭 토큰 | 32 | `ReviewRelevance` 및 후기 검색어의 매칭 데이터. 번역하면 검색 결과가 달라짐 |
| 캐논컬 값/폴백 | 50 | 카테고리 값·세분 라벨의 ko 폴백. Firestore/비교/기존 데이터 호환용 |
| Health SDK 매핑/진단 | 16 | HealthKit/Health Connect SDK 키·진단 scope |
| 번역 토스트로 치환되는 계층 오류 | 4 | 호출부가 사용자용 번역 토스트로 표시 |
| Firestore 삭제 마커/콘텐츠 출처 | 2 | 삭제 sentinel 및 콘텐츠 출처 표기 값 |
| 카테고리 캐논컬 기본값·웹 방어 메시지 | 2 | 데이터 기본값/내부 접근 방어 |
| OTA 초기화 전 폴백 | 2 | L10n 초기화 전 안전한 한국어 화면 |
| 언어 이름 자기 표기 | 2 | `한국어` 고정 자기 표기 |
| 사업자 고유명 | 2 | 상호·대표자 고유명 |
| 지역 라벨 | 1 | 좌표 역지오코딩 폴백 지역명 |
| 조사 후처리 정규식 | 5 | 번역 후 한국어 조사 계산용 패턴 |
| 사용하지 않는 레거시 정렬 라벨 | 5 | `BrowseSortLabel` grep 확인 결과 현재 import/호출 없음 |
| 개발자 API/설정 예외 | 4 | Kakao/Open-Meteo API 및 환경설정 예외가 호출부에서 UI로 직접 표시되지 않음 |
| **합계** | **249** |  |

전환 지점 33개는 `FilterManager` 12, `CustomGearCategory` 11, `SearchInputView` 9, `WeatherService` 1이다. `GearFilterName`·`GearCategoryGroups`의 한국어 리터럴은 표시 경로가 아니라 캐논컬 폴백 맵이므로 50개 유지 분류에 포함한다.

## 검증

- `npx tsc --noEmit` 통과
- 변경 TS/TSX `npx eslint ...` 오류 0 (기존 경고 8개)
- `git diff --check` 통과
- `node scripts/find-hardcoded-korean.mjs` 결과 0건
