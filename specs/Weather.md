# 여행지 날씨 — 기간 예보

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-07-15 여행지 책임 분리) · **2026-08-11 개정(as-built)**: 기간 날씨 블록을 Liquid Depth로 이식 — 섹션 머리를 마이크로 라벨로, 일별 행을 헤어라인으로(WT-4) |
| ID 프리픽스 | `WT` |
| 주요 코드 | `app/bag/[id]/weather.tsx`, `components/weather/`, `model/bag/BagWeather.ts`, `model/weather/`(`WeatherService`, `WeatherCode`), `model/store/BagStore.ts`(날씨 메서드) |
| 관련 스펙 | [BagDestination.md](BagDestination.md), [DataModel.md](DataModel.md)(DM-5, DM-15), [BagDetail.md](BagDetail.md) |

## 1. 개요

배낭 여행지([BagDestination.md](BagDestination.md)) 좌표를 기준으로 여행 기간(`bag.startDate`~`endDate`) 동안의 일별 날씨를 보여준다.
날씨 도메인은 여행지를 설정하지 않고 `bag.location`을 읽는다. 날씨는 Open-Meteo(무료·키 없음)로 조회한다.
조회 결과는 `bag.weather`에 스냅샷으로 캐시하고, 좌표·기간·신선도(TTL) 조건으로 필요할 때만 재조회한다.

## 2. 화면 및 진입

| 라우트 / 컴포넌트 | 역할 |
| --- | --- |
| 배낭 상세 `여행지` 타일 | 위치·날씨 요약. 동작은 DST-2 |
| `/bag/[id]/weather` → 여행지 허브 | 지도 미리보기·박지 카드·길찾기 + 기간 요약 + 일별 목록. 구성은 DST-8 |
| `WeatherDailyView` | 일별 날씨 행 목록 |

- 상세 카드는 `BagDetail`이 이미 읽은 배낭 데이터를 `BagWeather.hydrate`로 주입해 **중복 문서 읽기를 피한다**. 날씨 화면 단독 진입 시에는 `BagWeather.load`가 `bag` 문서를 직접 읽는다.

## 3. 요구사항

### WT-1 상세 진입 타일 `[폐기]`

배낭 상세 타일의 소유권과 동작은 [BagDestination.md](BagDestination.md) DST-2로 이전한다. 날씨 요약 계산은 WT-4를 계속 사용한다.

### WT-2 여행지 위치 설정 `[폐기]`

여행지 설정·변경 책임은 [BagDestination.md](BagDestination.md) DST-1~DST-3으로 이전한다.

### WT-3 지도에서 위치 선택 `[폐기]`

지도 선택과 박지·장소 통합 검색은 [BagDestination.md](BagDestination.md) DST-3/DST-4로 이전한다.

### WT-4 기간 요약과 일별 표시

**수용 기준**

- 기간 라벨: 시작=종료면 `M.D(요일)`, 아니면 `M.D(요일) ~ M.D(요일)`.
- 기간 요약 한 줄: `{대표상태} · ↑{최고}° ↓{최저}°`, 최대 돌풍이 10m/s 이상이면 `· 돌풍 {n}m/s`를 덧붙인다.
- 대표 상태(`눈`/`비`/`맑음`)·아이콘은 **눈 > 비 > 맑음** 우선순위(`summarizeWeatherPeriod`). 비 판정은 강수 코드이거나 강수확률 ≥ 60%. (예보/과거 무관하게 시제 없이 상태명만 표기.)
- 일별 행: 날짜·요일 / 날씨 아이콘 / 한글 설명 + 강수(확률% 또는 mm) + 바람·돌풍 / **최고(↑) → 최저(↓) 순** 온도. (출처 배지 `예보/실측/평년`은 표기하지 않음 — 최근 과거가 forecast 소스라 라벨이 오해를 줘서 제거.)
- **표시는 항상 현재 여행 기간(startDate~endDate)으로 제한**한다(`BagWeather.getDailyInRange`). 스냅샷은 조회 시점 기간을 담으므로, 이후 여행 날짜를 줄이면 옛 더 넓은 기간이 스냅샷에 남을 수 있다(WT-5 신선도는 경계일 포함만 확인해 재조회를 건너뜀). 일별 목록·기간 요약 모두 잘린 일자를 쓴다. 여행 날짜 변경 시 `updateDates`가 `BagWeather`에 새 기간을 전달해(확장 시 재조회) 상세 카드도 갱신한다.
- 화면 하단에 안내 문구: `예보는 향후 16일까지 제공되며, 그 이후는 과거 평년값을 참고로 표시합니다.`
- **시각 (as-built 2026-08-11 — Liquid Depth)**: 섹션 머리(`여행 기간 날씨`)는 큰 제목이 아니라 **대문자 마이크로 라벨**이고 갱신 중에는 그 오른쪽에 인디케이터를 붙인다. 일별 행은 면 없이 **헤어라인**으로만 갈리며 최고 온도가 잉크·최저가 보조 잉크다. 일별 행 컴포넌트(`WeatherDailyView`)는 박지 상세 날씨 탭(CS-3)과 공유하므로 두 화면이 같은 값을 본다.
- **로딩은 여전히 플랫폼 `ActivityIndicator`(`Liquid.ink`)다** — Liquid Depth는 로딩을 스켈레톤으로 말하는 시스템이라 문법 이탈이며, 박지 상세 날씨 탭과 함께 공용 스켈레톤 프리미티브가 생기는 시점에 옮긴다([CampSite.md](CampSite.md) §2.1의 같은 항목).

### WT-5 스냅샷 캐시와 신선도

불필요한 재조회를 막기 위해 `bag.weather` 스냅샷을 캐시하고, 아래 조건 중 하나라도 맞으면 stale로 보고 재조회한다(`BagWeather.ensureFresh`/`isStale`).

**수용 기준**

- 위치가 없으면 조회하지 않는다. 위치가 있으나 스냅샷이 없으면 stale.
- 스냅샷 좌표 ≠ 현재 위치 좌표 → stale.
- 스냅샷 일별에 시작일 또는 종료일이 포함돼 있지 않다 → stale.
- 스냅샷 `kind` ≠ 현재 기간이 요구하는 `kind` → stale (구간 이동 감지).
- `frozen === true`(종료일이 오늘 이전, 완전 과거 여행)면 **좌표가 같은 동안** stale 아님(다시 조회하지 않는다). 여행지 좌표 변경은 DST-6에서 기존 스냅샷을 제거한다.
- 위 조건이 없으면 TTL로 판단: `forecast`/`mixed` = 3시간, `archive`/`normal` = 7일 경과 시 stale.
- 재조회 성공 시 `updateWeather`로 스냅샷을 저장한다. 실패 시 기존 스냅샷이 있으면 유지하고(에러 표시 안 함), 없으면 에러 상태로 둔다.

### WT-6 데이터 출처

**수용 기준**

- **날씨**: Open-Meteo. 예보 API 커버 범위는 `[오늘-92일 ~ 오늘+15일]`(forecast는 오늘 포함 16일까지만 허용 — 오늘+16 요청 시 400). 기간이 이 범위를 벗어나면 과거 구간은 archive API(실측), 먼 미래 구간은 평년값(과거 5년 같은 날짜 archive 평균)으로 채우고, 여러 구간에 걸치면 `kind='mixed'`.
- 지오코딩·역지오코딩과 카카오 장소 검색은 여행지 선택 책임([BagDestination.md](BagDestination.md) DST-3/DST-4)이다.

## 4. 데이터

- [DataModel.md](DataModel.md) DM-5(`bag.location`/`bag.weather`), DM-15(`BagLocation`/`WeatherSnapshot`/`WeatherDaily` 형태).
- 날씨 도메인은 `location`을 읽고 `weather`만 저장한다. 여행지 변경과 캐시 제거는 [BagDestination.md](BagDestination.md) DST-6이 담당한다.
- 배낭 복사 시 여행지와 날씨를 제외한다([Bag.md](Bag.md) BAG-4).

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 날씨 조회 | Open-Meteo HTTPS | Open-Meteo HTTPS | Open-Meteo HTTPS |

## 6. 엣지 케이스

- **위치 미설정**: 날씨 영역에 `여행지를 설정하면 / 기간 동안의 날씨를 볼 수 있어요` 빈 상태.
- **로딩**: 위치는 있으나 스냅샷이 아직 없으면 중앙 인디케이터.
- **에러**: 조회 실패 + 스냅샷 없음이면 `날씨를 불러오지 못했어요` + `다시 시도` 버튼. 기존 스냅샷이 있으면 조용히 유지.
- **과거 여행**: `frozen`으로 고정되어 재조회하지 않는다.

## 7. 수동 검증 체크리스트

- [ ] 여행지 설정·변경 → 해당 좌표의 날씨만 표시, 이전 위치 스냅샷 미노출
- [ ] 상세 여행지 타일과 페이지의 대표 아이콘·상태·기온 일치
- [ ] 일별 온도가 ↑최고 ↓최저 순 (출처 배지 없음)
- [ ] 먼 미래 기간(오늘+15일 초과) → `평년`, 과거 → `실측`, 혼합 기간 정상 표시
- [ ] iOS/Android/Web에서 동일 기간·좌표에 동일한 날씨 결과 표시

## 8. 미해결 질문

- 없음. 여행지 선택 관련 미해결 질문은 [BagDestination.md](BagDestination.md) §8에서 관리한다.
