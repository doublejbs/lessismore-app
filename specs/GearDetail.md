# 장비 상세

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `GD` |
| 주요 코드 | `app/gear-detail/[id]/`, `components/warehouse-detail/`, `model/warehouse-detail/WarehouseDetail.ts`, `components/gear-image/`, `model/gear-image/`, `model/store/GearImageStore.ts` |
| 관련 스펙 | [DataModel.md](DataModel.md), [Reply.md](Reply.md), [Warehouse.md](Warehouse.md), [Search.md](Search.md) |

## 1. 개요

장비 1개의 상세 화면. 기본 정보, 이 장비를 담았던 배낭 기록(사용/미사용 통계), 리뷰(댓글) 미리보기,
공유 이미지 갤러리(대표 사진 변경)를 제공한다. 창고·검색·배낭 상세 어디서든 `/gear-detail/{id}`로 진입한다.

## 2. 화면 및 진입

```
app/gear-detail/[id]/index.tsx → WarehouseDetailWrapper → WarehouseDetailView
  ├─ WarehouseDetailInformationView   (제조사/이름/색상/무게/대표 사진)
  ├─ WarehouseDetailBagRecordView     (배낭 기록 — bags가 있을 때만)
  ├─ WarehouseDetailReviewSectionView (리뷰 미리보기)
  └─ SharedImageSelectionModalView    (공유 이미지 갤러리 모달)
```

- 장비 조회는 `GearStore.getGear(id)`: `users/{uid}/gears/{id}` 우선, 없으면 카탈로그 `gear/{id}`.

## 3. 요구사항

### GD-1 기본 정보 섹션

**수용 기준**

- 제조사, 이름(`getDisplayName()`), 색상, 무게, 대표 사진을 표시한다.
- 대표 사진 변경 버튼은 **내 창고에 추가된 장비이고 공유 이미지 기능이 활성일 때만** 노출된다.

### GD-2 배낭 기록 섹션

사용자는 이 장비를 어떤 배낭에 담았고 실제로 썼는지 볼 수 있다.

**수용 기준**

- 장비의 `bags`가 0개면 섹션 자체를 렌더하지 않는다.
- 담긴 배낭 수, USED 횟수(`used.length`), USELESS 횟수(`useless.length`)를 표시한다.
- 배낭별 행에 사용 여부 태그(USED/USELESS)를 표시하고, 행을 누르면 해당 배낭 상세로 이동한다.

### GD-3 리뷰 미리보기 섹션

**수용 기준**

- 댓글이 없으면 `첫번째 리뷰 남기기` 버튼 → 누르면 댓글 목록 화면으로 이동([Reply.md](Reply.md)).
- 댓글이 있으면 최신 댓글 1개(`createdAt desc limit 1`)와 `더 많은 의견 보기` 버튼을 표시한다.
- 리뷰 화면 이동은 로그인 확인을 거친다.

### GD-4 공유 이미지 갤러리

카탈로그 장비는 사용자들이 올린 실사용 사진을 공유하고, 그중 하나를 내 대표 사진으로 쓸 수 있다.

**수용 기준**

- **카탈로그 장비(`isCustom === false`)에만** 갤러리 기능이 활성화된다. 커스텀 장비는 비활성.
- 이미지 목록은 `gear/{gearId}/images`를 `uploadedAt desc`로 표시한다([DataModel.md](DataModel.md) DM-8).
- 업로드는 로그인 사용자 누구나 가능 (카메라/갤러리, 권한 필요).
- 삭제는 본인이 올린 이미지(`uploadedBy === 내 uid`)만 가능.
- 대표 사진 선택은 선택(pending) → `확인` 2단계로 적용되며, 내 장비 문서의 `imageUrl`이 갱신된다.
- 이미지가 0장이어도 `사진 추가` 버튼은 항상 노출된다.

### GD-5 최저가 구입 링크 (쿠팡 파트너스)

사용자는 카탈로그 장비 상세에서 쿠팡 파트너스 최저가 구입 링크로 바로 이동할 수 있다.

**수용 기준**

- 카탈로그 `gear/{id}.coupangUrl`이 있을 때만 `최저가 구입하기` 검정 버튼을 노출한다. 값이 없으면 버튼과 고지 문구 모두 미노출.
- 스크롤 흐름 안에서 **제품 정보 섹션 바로 뒤, 리뷰 섹션 바로 위**에 **독립 섹션**으로 배치하고, 다른 섹션과 동일한 구분선(`SeperaterView`, 상단 10px `#F2F4F6` 밴드)을 섹션 상단에 넣는다.
- 링크는 **항상 카탈로그 `gear/{id}`에서만** 읽는다. 커스텀 장비는 카탈로그 문서가 없어 자연스럽게 미노출되고, 창고 사본으로 진입해도 카탈로그에서 읽는다.
- 버튼을 누르면 `click_gear_purchase` 이벤트를 전송한 뒤 `Linking.openURL(coupangUrl)`로 외부 링크를 연다. 링크 열기 실패는 조용히 무시한다.
- 버튼 바로 아래에 수수료 고지 문구(`이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`)를 상시(숨김/접힘 없이) 표시한다.

## 4. 데이터

- 읽기: 장비 문서(DM-3), `gear/{gearId}/images`(DM-8), 최신 댓글(DM-7).
- 쓰기: 갤러리 업로드/삭제(Storage `/gears/{gearId}/{imageId}` + Firestore), 대표 사진 변경(`users/{uid}/gears/{id}.imageUrl`).

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 이미지 업로드/삭제 선택 UI | `ActionSheetIOS` | `Alert.alert` | — |

## 6. 엣지 케이스

- **장비 조회 실패**(삭제된 장비 등): 알럿 표시 후 초기화 중단(화면 미렌더).
- **로딩**: 초기화 완료 전에는 아무것도 렌더하지 않는다(null). 스켈레톤 UI 없음.
- **비로그인**: 리뷰 이동·이미지 업로드 시 로그인 유도.

## 7. 수동 검증 체크리스트

- [ ] 창고/검색 양쪽에서 진입 시 동일 장비 정보 표시
- [ ] 배낭에 담긴 적 없는 장비 → 배낭 기록 섹션 미노출
- [ ] 커스텀 장비 → 갤러리/대표 사진 변경 미노출
- [ ] 다른 사용자가 올린 공유 이미지에 삭제 버튼 미노출
- [ ] 대표 사진 변경 → 창고 목록 썸네일에 반영
- [ ] `coupangUrl`이 있는 카탈로그 장비 → 제품 정보~리뷰 사이 섹션에 `최저가 구입하기` 검정 버튼·수수료 고지·구분선 노출, 탭 시 외부 링크
- [ ] `coupangUrl`이 없는 장비·커스텀 장비 → 버튼·고지 미노출

## 8. 미해결 질문

- 컴포넌트 디렉토리 이름이 `warehouse-detail`이지만 라우트는 `gear-detail` — 명칭 불일치(리팩토링 후보).
- `WarehouseDetailSkeletonView`는 정의만 있고 사용되지 않는 데드 코드 — 로딩 스켈레톤을 살릴지 삭제할지 결정 필요.
