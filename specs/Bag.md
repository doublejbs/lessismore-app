# 배낭 탭 (목록 / 생성 / 삭제)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `BAG` |
| 주요 코드 | `app/(tabs)/bag.tsx`, `components/bag/`, `model/bag/`, `model/store/BagStore.ts` |
| 관련 스펙 | [DataModel.md](DataModel.md), [BagDetail.md](BagDetail.md) |

## 1. 개요

배낭 탭은 사용자의 배낭(패킹 리스트) 목록과 생성 진입점이다.
배낭 1개 = 여행/산행 1회의 장비 구성 + 날짜 범위.

## 2. 화면 및 진입

```
app/(tabs)/bag.tsx → BagView
  ├─ BagItemView × n  (배낭 행)
  └─ BagAddView       (생성 모달: 이름 + DateRangeCalendarView 날짜 범위)
```

- 배낭 행 클릭 → `/bag/{id}` ([BagDetail.md](BagDetail.md))
- 생성 완료 → `/bag/{id}`로 자동 이동

## 3. 요구사항

### BAG-1 배낭 목록

**수용 기준**

- `users/{uid}.bags` 배열의 ID로 `bag` 컬렉션을 조회하고 `startDate desc`로 정렬해 표시한다.
- 각 행에 이름, 날짜, 총 무게(kg), 삭제 버튼을 표시한다. (`editDate`는 저장되지만 목록에 표시되지 않는다 — 미해결 질문 참조.)
- 날짜 표시: 시작일과 종료일이 같으면 `YYYY.MM.DD`, 다르면 `YYYY.MM.DD ~ YYYY.MM.DD`.
- 무게 표시: 저장값(g)을 1000으로 나눠 kg로 표시.

### BAG-2 배낭 생성

**수용 기준**

- 입력: 이름(필수, 빈 문자열 거부), 시작일(기본: 오늘), 종료일(기본: 내일).
- 캘린더 날짜 선택 규칙: 두 날짜가 모두 선택된 상태에서 새로 누르면 범위를 다시 시작한다. 시작일 이전 날짜를 누르면 시작일을 교체, 이후 날짜는 종료일로 설정한다.
- 시작일/종료일이 없으면 저장하지 않고 알럿을 띄운다.
- 생성 시 `bag` 문서(`weight: 0`, `gears: []`, `shared: false`)를 만들고 `users/{uid}.bags`에 `arrayUnion`, 생성된 `/bag/{id}` 상세로 이동한다.

### BAG-3 배낭 삭제

**수용 기준**

- 목록 행의 삭제 버튼 → 확인 다이얼로그(`{이름} 배낭을 삭제할까요?`, 확인 버튼 `삭제`)를 거친다.
- 확인 시 배치로: 담긴 모든 장비의 `bags`/`used`/`useless` 배열에서 해당 배낭 ID 제거 → `bag/{id}` 삭제 → `users/{uid}.bags`에서 제거 ([DataModel.md](DataModel.md) DM-11).

## 4. 데이터

- [DataModel.md](DataModel.md) DM-5 (`bag` 문서), DM-2 (`users/{uid}.bags`).

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 목록 하단/추가 버튼 여백 | 20 / 80 | 0 / 0 | — |
| 생성 모달 키보드 회피 | `height`, offset 0 | `height`, offset 20 | — |

## 6. 엣지 케이스

- **비로그인**: 목록은 빈 배열, 추가 버튼은 로그인 모달 표시. 로그인 변화에 reaction으로 자동 갱신.
- **로딩**: `LoadingView` 표시.
- **빈 목록**: 빈 상태 안내 표시.

## 7. 수동 검증 체크리스트

- [ ] 생성 → 상세로 자동 이동, 목록 복귀 시 최신(시작일 내림차순) 위치에 표시
- [ ] 같은 날짜로 생성 → 단일 날짜 표기
- [ ] 배낭 삭제 → 담겨 있던 장비의 상세 "배낭 기록"에서 해당 배낭이 사라짐
- [ ] 비로그인 → 추가 버튼이 로그인 모달

## 8. 미해결 질문

- 배낭 목록 조회의 `in` 쿼리 30개 제한 — [DataModel.md](DataModel.md) 미해결 질문 참조.
- `BagItem.getEditDate()`(`YYYY.MM.DD HH:mm`)는 정의돼 있으나 어디서도 사용되지 않음 — 수정 일시를 목록에 노출할지 결정 필요.
