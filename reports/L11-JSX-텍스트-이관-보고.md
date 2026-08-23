# L11 JSX 텍스트 노드 이관 보고

## 지점별 처리

| 지점 | 처리 | 키·사유 |
| --- | --- | --- |
| `app/bag-add-options.tsx:44` | 이관 | 기존 `bag.add` 재사용 |
| `app/bag-add-options.tsx:58` | 이관 | 신규 `app.bagAddOptions.create` |
| `app/bag-add-options.tsx:61` | 이관 | 신규 `app.bagAddOptions.createSubtitle` |
| `app/bag-add-options.tsx:79` | 이관 | 신규 `app.bagAddOptions.copy` |
| `app/bag-add-options.tsx:82` | 이관 | 신규 `app.bagAddOptions.copySubtitle` |
| `app/bag-add-options.tsx:100` | 이관 | 신규 `app.bagAddOptions.template` |
| `app/bag-add-options.tsx:103` | 이관 | 신규 `app.bagAddOptions.templateSubtitle` |
| `app/sort-sheet.tsx:50` | 이관 | 신규 공통 키 `common.sort` |
| `components/alert/AlertView.tsx:57` | 이관 | 기존 `common.cancel` 재사용. `취소하기` 전용 기존 키는 없고 공통 취소 문구 관례를 따름 |
| `components/bag/BagAddEndDateView.tsx:23` | 이관 | 기존 `bag.calendar.dateLabel` 재사용 |
| `components/bag/BagCopySourceListView.tsx:47` | 이관 | 신규 `app.bagCopy.sourceEmpty` |
| `components/bag/BagCopySourceListView.tsx:95` | 이관 | 신규 `app.bagCopy.sourceTitle` |
| `components/bag/BagMemoInputView.tsx:148` | 이관 | 기존 `bag.memo.title` 재사용 |
| `components/bag/BagMemoInputView.tsx:203` | 이관 | 기존 `common.done` 재사용 |
| `components/bag-destination/BagDestinationHubView.tsx:92` | 이관 | 기존 `bagDestination.emptyMessage` 재사용. 언어별 줄바꿈 포함 |
| `components/bag-destination/BagDestinationSearchResultsView.tsx:129` | 이관 | 신규 `bagDestination.searching` |
| `components/bag-destination/BagDestinationSearchResultsView.tsx:136` | 이관 | 기존 `search.resultEmpty` 재사용 |
| `components/bag-detail/BagDetailGearView.tsx:59` | 이관 | 기존 `bagDetail.delete` 재사용 |
| `components/bag-detail/BagDetailMemoView.tsx:49` | 이관 | 기존 `bag.memo.title` 재사용 |
| `components/bag-detail/BagDetailMemoView.tsx:52` | 이관 | 신규 `bag.memo.write` |
| `components/bag-edit/BagEditWarehouseView.tsx:32` | 이관 | 기존 `warehouse.noSearchResults` 재사용 |
| `components/bag-film-card/BagFilmCardCanvasView.tsx:242` | 이관 | 기존 `bagFilmCard.choosePhoto` 재사용. `BagFilmCardView`의 캔버스 ref만 `captureRef` 대상이고, 이 플레이스홀더는 `capturing` 중 숨겨지므로 캔버스 내보내기 문구가 아닌 사용자 UI |
| `components/bag-packing/BagPackingView.tsx:130` | 이관 | 신규 `packing.empty` |
| `components/bag-useless/BagUselessView.tsx:144` | 이관 | 147번과 합쳐 신규 `bagUseless.title` 한 키 사용 |
| `components/bag-useless/BagUselessView.tsx:147` | 이관 | 144번과 합쳐 신규 `bagUseless.title` 한 키 사용 |
| `components/bag-useless/BagUselessView.tsx:192` | 이관 | 기존 `common.done` 재사용 |
| `components/ui/BottomMenuModalView.tsx:126` | 이관 | 기존 `common.close` 재사용 |
| `model/bag-film-card/BagFilmCard.ts:29` | ignore | 사용자에게 노출되지 않는 한글 브랜드 판정 정규식. `l10n-ignore` 사유 주석 추가 |

`BagUselessView` 타이틀은 두 `<Text>`를 하나로 합쳤다. 한국어는 `실제로 사용했던 장비만\n선택해주세요`, 영어는 `Select only gear you actually used` 한 줄, 일본어는 `実際に使ったギアだけ\n選択してください`로 언어별 자연스러운 줄바꿈을 허용했다.

## en/ja 표본 6개

| 키 | en | ja |
| --- | --- | --- |
| `app.bagAddOptions.create` | Create a new bag | 新しく作成 |
| `app.bagAddOptions.copySubtitle` | Bring over a previous bag | 以前のバックパックをそのまま使う |
| `app.bagCopy.sourceTitle` | Choose a bag to copy | コピーするバックパックを選択 |
| `bagDestination.emptyMessage` | Set a destination\nto see the weather there | 目的地を設定すると\nその場所の天気も確認できます |
| `bagFilmCard.choosePhoto` | Choose photo | 写真を選択 |
| `bagUseless.title` | Select only gear you actually used | 実際に使ったギアだけ\n選択してください |

## observer 확인

번역을 호출하는 기존 `observer` 컴포넌트는 그대로 두고, 새로 번역을 넣은 무상태 뷰·라우트인 `bag-add-options`, `sort-sheet`, `BagAddEndDateView`, `BagCopySourceListView`, `BottomMenuModalView`를 `observer`로 감쌌다. 언어 전환 시 `L10n.t()`가 읽는 observable 언어 상태를 해당 화면이 추적한다.

## 검증

- `npx tsc --noEmit`: 통과
- `npx eslint <변경 파일>`: 오류 0건, 기존 경고 4건
- `git diff --check`: 통과
- `node scripts/find-hardcoded-korean.mjs`: 0건
