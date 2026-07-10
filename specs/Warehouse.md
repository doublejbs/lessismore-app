# 창고 (Warehouse 탭)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-07-10 검색·정렬 시트 반영) |
| ID 프리픽스 | `WH` |
| 주요 코드 | `app/(tabs)/index.tsx`, `components/warehouse/`, `model/warehouse/`, `model/order/`, `model/filter/FilterManager.ts` |
| 관련 스펙 | [DataModel.md](DataModel.md), [GearEdit.md](GearEdit.md), [GearDetail.md](GearDetail.md) |

## 1. 개요

창고는 사용자가 보유한 장비(`users/{uid}/gears`)의 목록 화면이자 앱의 첫 탭이다.
카테고리 필터·정렬·장비 추가/수정/삭제의 진입점을 제공한다.

## 2. 화면 및 진입

```
app/(tabs)/index.tsx → WarehouseWrapper → WarehouseScreen
                                            ├─ 검색 인풋 (이름/브랜드 필터, WH-8)
                                            ├─ WarehouseFiltersView (필터 칩 + 개수 + 정렬 OrderButtonView=바텀시트)
                                            ├─ WarehouseGearView × n (GearView + 메뉴 모달)
                                            ├─ AddButtonView (장비 추가 플로팅 버튼)
                                            └─ WarehouseSkeletonView / 빈 상태 메시지
```

- `WarehouseWrapper`는 Firebase 초기화 완료까지 `LoadingIconView`를 렌더하고, 이후 `Warehouse` 도메인 객체를 1회 생성한다.
- 탭 포커스 시(`useFocusEffect`) `warehouse.refresh()`로 목록을 다시 읽는다. pull-to-refresh는 없다.

## 3. 요구사항

### WH-1 장비 목록 표시

로그인한 사용자는 창고에서 자신의 장비 목록을 볼 수 있다.

**수용 기준**

- 각 장비 행에 이미지, 제조사, 이름, 색상, 무게를 표시한다.
- 이름은 `Gear.getDisplayName()`(= `nameKorean || name`)으로 표시한다 — `getName()` 직접 표시 금지.
- 무게는 `{weight}g` 형식으로 표시한다.
- `imageUrl`에 `'http'`가 포함된 경우에만 이미지를 렌더하고, 로드 실패 시 이미지를 표시하지 않는다.
- 사용 기록이 있는 장비는 사용률 배지(`사용률 XX%` — `used`/`useless` 기록 기반)를 표시한다.
- 목록은 전체 일괄 로드한다 (페이지네이션/무한 스크롤 없음).

### WH-2 카테고리 필터

사용자는 카테고리 칩으로 목록을 필터링할 수 있다.

**수용 기준**

- 필터는 `전체` + 11개 카테고리([DataModel.md](DataModel.md) DM-4)로 구성되고 기본값은 `전체`다.
- 칩 UI는 앱 공용 `CategoryChipView`(아웃라인 톤: 비선택 배경+`chipBorder` 테두리+`textSecondary`, 선택 `chipActiveBg` 채움; radius 8)를 쓴다. 고정 높이 없이 `minHeight`+패딩으로 큰 글씨(Dynamic Type)에서도 잘리지 않으며, `hitSlop`으로 44pt 터치를 확보한다. 배낭 상세·피드·배낭 수정·장비 카테고리 칩도 동일 컴포넌트를 공유한다.
- 한 번에 하나만 선택된다 — 다른 필터 선택 시 기존 선택은 해제된다.
- 선택된 필터를 다시 눌러 해제하면 자동으로 `전체`가 선택된다.
- 필터 적용은 Firestore 쿼리(`where('category', 'in', …)`)로 수행한다.
- 필터 영역에 현재 목록의 장비 개수와 **총 무게**를 `총 N개 · X.Xkg` 형식으로 표시한다. 총 무게는 `Warehouse.getTotalWeight()`(현재 보이는 목록 = 필터 + 검색어(WH-8) 적용 후의 무게 합, 그램)로 계산하고 1000g 이상이면 kg로 환산(`(g/1000).toFixed(1)kg`), 미만이면 `{g}g`. 무게 합이 0이면 무게 부분은 생략. 개수·무게 모두 검색어 적용 결과를 반영한다.
- 창고가 완전히 빈 상태(WH-6)에서는 필터 영역을 렌더하지 않는다.

### WH-3 정렬

사용자는 정렬 순서를 선택할 수 있고, 선택은 기기에 저장된다.

**수용 기준**

- 옵션은 4개: `이름순`(기본) / `가벼운순` / `무거운순` / `최근 추가순`.
- 각 옵션은 Firestore `orderBy`에 매핑된다: `name asc` / `weight asc` / `weight desc` / `createDate desc`.
- 선택 시 즉시 목록을 다시 읽고, `LocalStorageManager`에 `selectedOrderType_{key}`로 저장되어 재실행 후에도 유지된다.
- 정렬 선택 UI는 **하단 바텀시트**로 표시한다(딤 오버레이는 opacity 페이드, 시트만 아래→위 슬라이드업; 타이틀 `정렬` + 옵션 행, 선택 옵션은 체크·볼드). 옵션 탭 또는 오버레이 탭으로 닫힌다. (구 앵커드 드롭다운은 폐기.)
- 정렬 기준 `name`은 캐논컬 값이다(표시 이름과 다를 수 있음) — [DataModel.md](DataModel.md) DM-3.

### WH-4 장비 상세/수정 진입

- 장비 행을 누르면 `/gear-detail/{id}`로 이동한다 → [GearDetail.md](GearDetail.md)
- 행의 메뉴(⋮) → `수정하기`를 누르면 `/gear-edit/{id}`로 이동한다 → [GearEdit.md](GearEdit.md)

### WH-5 장비 삭제

사용자는 창고에서 장비를 삭제할 수 있다.

**수용 기준**

- 메뉴(⋮) → `삭제하기` → 확인 다이얼로그(`{이름}을 삭제하시겠습니까?`, 확인 버튼 `삭제하기`)를 거친다.
- 확인 시 장비 문서 삭제와 함께: 장비가 담긴 모든 배낭의 `gears`에서 제거 + 배낭 `weight` 차감 + 카탈로그 장비면 `gear-rank` count 감소([DataModel.md](DataModel.md) DM-6, DM-11).
- 완료 후 토스트 `삭제 되었습니다.`를 표시하고 목록을 갱신한다.

### WH-6 빈 상태

**수용 기준**

- 장비가 0개이고 `전체` 필터이고 로딩 중이 아니면: `장비를 추가해 주세요` 표시.
- 검색어가 있고 결과가 0개면: `검색 결과가 없어요`.
- 검색어가 없고 특정 필터 선택 결과가 0개면: `{필터명}이(가) 없습니다` (josa 라이브러리로 조사 처리).

### WH-7 장비 추가 진입

- 플로팅 추가 버튼: 로그인 상태면 `/custom`으로 이동([GearEdit.md](GearEdit.md)), 비로그인이면 로그인 모달(`LogInAlertManager`)을 띄운다.

### WH-8 장비 검색

사용자는 창고에서 장비를 이름/브랜드로 검색할 수 있다.

**수용 기준**

- 헤더(로고 아래, 필터 칩 위)에 검색 인풋(`장비 검색`)을 둔다. 창고가 완전히 빈 상태(WH-6)에서는 렌더하지 않는다.
- 입력값으로 **현재 로드된 목록을 클라이언트에서 필터**한다(추가 Firestore 조회 없음): `getDisplayName()` 또는 `getDisplayCompany()`에 검색어 포함(대소문자 무시). 카테고리 필터(WH-2)와 함께 적용된다.
- 검색 결과가 개수·총 무게(WH-2)에 반영된다. 결과 0개면 `검색 결과가 없어요`(WH-6).
- 우측 클리어(X) 버튼으로 검색어를 지운다(커스텀 버튼 1개 — 네이티브 `clearButtonMode` 미사용, 크로스플랫폼 일관).

## 4. 데이터

- 읽기: `users/{uid}/gears` — 필터/정렬 쿼리는 WH-2, WH-3.
- 쓰기: 삭제(WH-5)만. 필드 계약은 [DataModel.md](DataModel.md) DM-3.
- 로컬: 정렬 선택 `selectedOrderType_{key}` (AsyncStorage).

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 탭 버튼 | `HapticTab`(진동) | `NoAnimationTab` | `NoAnimationTab` |
| 목록 하단 패딩 / 추가 버튼 위치 | 탭바 높이 보정 있음 | 보정 없음 | iOS와 유사 |
| 삭제 완료 토스트 | 커스텀 ToastView | `ToastAndroid` | 커스텀 ToastView |

## 6. 엣지 케이스

- **비로그인**: 목록을 비우고 빈 상태 표시. 로그인 상태 변화는 MobX reaction으로 감지해 자동 갱신.
- **로딩**: 초기 로드·필터/정렬 변경 시 `WarehouseSkeletonView`(5행 애니메이션) 표시.
- **에러**: Firestore 조회 실패 시 빈 배열 처리(별도 에러 UI 없음). 삭제 실패는 콘솔 로그만.

## 7. 수동 검증 체크리스트

- [ ] 로그인 → 창고 진입 시 장비 목록이 정렬 기본값(이름순)으로 보인다
- [ ] 필터 단일 선택/해제 → 전체 복귀 동작
- [ ] 검색어 입력 → 이름/브랜드 필터, 개수·총무게 반영, 결과 없으면 `검색 결과가 없어요`, X로 초기화(X 1개)
- [ ] 정렬 탭 → 하단 바텀시트(딤 페이드·시트 슬라이드업), 옵션 선택 체크 / 앱 재시작 후 선택 유지
- [ ] 장비 삭제 → 담겨 있던 배낭 상세의 총 무게가 줄어든다
- [ ] 비로그인에서 추가 버튼 → 로그인 모달
- [ ] 한글 이름(`nameKorean`) 장비와 영문만 있는 장비가 모두 올바르게 표시된다

## 8. 미해결 질문

- 삭제 확인 다이얼로그가 `getName()`을 사용한다(`components/warehouse/WarehouseGearView.tsx`). 표시 규칙(WH-1, CLAUDE.md)은 `getDisplayName()`이므로 카탈로그 장비(name=영문/빈 값)에서 빈 이름이나 영문이 노출될 수 있다.
- 전체 일괄 로드 구조라 장비 수가 많을 때 성능 검토 필요 (페이지네이션 미구현).
