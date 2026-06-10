# 장비 추가 / 편집

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `GE` |
| 주요 코드 | `app/custom/`, `app/gear-edit/`, `components/gear/`, `model/gear/` (AbstractGearEdit, custom/, edit/, FileUpload), `model/firebase/FirebaseImageStorage.ts` |
| 관련 스펙 | [DataModel.md](DataModel.md), [Warehouse.md](Warehouse.md), [BagDetail.md](BagDetail.md), [Search.md](Search.md) |

## 1. 개요

사용자가 장비를 창고에 등록하는 두 경로 — 직접 입력(커스텀 장비)과 카탈로그 검색 선택 — 와
기존 장비의 편집·삭제를 다룬다. 세 화면이 공통 베이스 `AbstractGearEdit`를 공유한다.

## 2. 화면 및 진입

| 라우트 | 도메인 객체 | 진입 |
| --- | --- | --- |
| `/custom` | `CustomGear` | 창고 추가 버튼 (로그인 필수) |
| `/custom/bag-gear/[bagId]` | `CustomGearForBag` | 배낭 편집 화면의 "장비 추가" — 저장 후 해당 배낭에 자동 추가 |
| `/gear-edit/[id]` | `GearEdit` | 창고 행 메뉴 `수정하기`, 배낭 상세 장비 메뉴 |

단계(스텝) 없는 단일 폼 + 하단 고정 `확인` 버튼.

## 3. 요구사항

### GE-1 입력 필드

| 필드 | 필수 | 규칙 |
| --- | --- | --- |
| 제품명 | **필수** | 2자 이상 입력 시 카탈로그 검색(GE-2) 활성화 |
| 브랜드 | 선택 | 자유 입력 |
| 무게 | 선택 | g 단위. 숫자 외 문자는 입력 시 제거, NaN 무시 |
| 색상 | 선택 | 자유 입력 (팔레트 없음) |
| 카테고리 | 필수(기본값 있음) | 11개 중 단일 선택, 기본 첫 항목(텐트). 목록 정의: `model/gear/custom/CustomGearCategory.ts` |
| 이미지 | 선택 | 카메라/갤러리, 1:1 크롭, 품질 0.8 |

**수용 기준**

- `확인` 시 제품명이 비어 있으면 저장하지 않고 `이름을 입력해주세요` 에러를 3초간 표시한다.
- 무게 0·음수에 대한 별도 검증은 없다(현 동작).

### GE-2 카탈로그 검색 프리필

신규 추가 화면에서 제품명을 입력하면 카탈로그에서 같은 장비를 찾아 선택할 수 있다.

**수용 기준**

- 2자 이상 입력 시 300ms 디바운스로 Algolia 검색([Search.md](Search.md) 검색 계약 공유)을 실행해 결과를 인라인 표시한다.
- 결과 선택 시 해당 카탈로그 장비로 등록된다(`isCustom: false`, 카탈로그 데이터 사용).
- 이미 창고에 있는 장비를 선택하면 `이미 추가된 장비입니다` 알럿을 띄우고 등록하지 않는다.

### GE-3 신규 저장

**수용 기준**

- 저장 경로는 `users/{uid}/gears/{id}` — 필드 계약은 [DataModel.md](DataModel.md) DM-3.
- 직접 입력 저장 시: `isCustom: true`, `nameKorean = name`, `companyKorean = company`, `bags/used/useless = []`, `createDate = 현재 시각(ms)`.
- 카탈로그 선택 저장 시: `isCustom: false`, `gear-rank` count를 +1 한다(신규면 count=1 생성). 직접 입력(커스텀)은 `gear-rank`에 집계하지 않는다.
- 이미지가 첨부되면 Storage `/{userId}/{fileName}`에 업로드 후 URL을 `imageUrl`에 저장한다. 파일명 규칙은 DM-9.
- `/custom/bag-gear/[bagId]` 경로에서는 저장 후 트랜잭션으로 해당 배낭에 장비를 추가한다(배낭 `gears`/`weight` 동시 갱신).

### GE-4 편집

**수용 기준**

- 진입 시 기존 장비 값(제품명·브랜드·무게·색상·카테고리·이미지)을 프리필한다. 프리필은 캐논컬 값(`getName()`) 기준.
- 저장은 같은 문서에 `setDoc` 덮어쓰기. 기존 `nameKorean`/`companyKorean`은 유지된다.
- **무게를 변경하면** 장비가 담긴 모든 배낭의 `weight`를 차액만큼 배치로 갱신한다.
- 카탈로그 장비(`isCustom: false`)에 새 이미지를 올리면 공유 이미지 갤러리(`gear/{gearId}/images`)에도 등록된다 → [GearDetail.md](GearDetail.md).

### GE-5 편집 화면에서 삭제

**수용 기준**

- 헤더 휴지통 → 확인 다이얼로그 → 삭제. 삭제 부수효과는 [Warehouse.md](Warehouse.md) WH-5와 동일 (`GearStore.remove` 공유).
- 완료 후 토스트 `삭제 되었습니다` 표시, `/(tabs)`(창고)로 `replace` 이동.

### GE-6 취소

- 뒤로가기/닫기 시 입력값은 버려진다(임시 저장 없음). 화면 진입마다 새 인스턴스를 생성한다.

## 4. 데이터

- 쓰기: `users/{uid}/gears/{id}`, `gear-rank/{id}`(카탈로그만), Storage `/{userId}/{fileName}`.
- 배낭 연동: `bag/{bagId}` 트랜잭션/배치 — [DataModel.md](DataModel.md) DM-11.

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 이미지 소스 선택 | `ActionSheetIOS` | `Alert.alert` | — |
| 키보드 회피 | `behavior: 'padding'` | `behavior: 'height'` | — |
| 헤더 뒤로가기 | 없음(스와이프 제스처) | chevron 버튼 표시 | — |

## 6. 엣지 케이스

- **비로그인**: `/custom` 진입 시 로그인 모달 표시.
- **이미지 업로드 실패**: 에러 로깅 + 알럿, 폼 유지.
- **저장 실패**: 로딩 해제 후 폼 유지(콘솔 로그).

## 7. 수동 검증 체크리스트

- [ ] 이름 없이 확인 → 에러 메시지 3초 표시
- [ ] 카탈로그 검색 결과 선택 → 등록 후 창고에 카탈로그 정보로 표시, 검색 탭에서 보유 배지 확인
- [ ] 이미 보유한 카탈로그 장비 재선택 → "이미 추가된 장비입니다"
- [ ] 무게 수정 → 소속 배낭 총 무게 반영
- [ ] 배낭 편집 → 장비 추가 → 저장 시 배낭에 자동 포함
- [ ] iOS/Android에서 이미지 선택 UI가 각각 액션시트/다이얼로그로 표시

## 8. 미해결 질문

- 무게에 음수 형식 입력이 가능하다(검증 없음) — 합산 계산에 음수가 섞일 수 있음.
- 편집에서 카테고리를 바꿔도 `gear-rank.category`는 갱신되지 않는다(등록 시점 값 유지).
- `AbstractGearEdit.getFileName()`(이름 기반 파일명 규칙)은 호출처가 없는 데드 코드 — 실제 파일명은 UUID([DataModel.md](DataModel.md) DM-9).
