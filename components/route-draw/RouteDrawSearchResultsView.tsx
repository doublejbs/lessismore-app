import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgShadow,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import RouteDrawSearch from '@/model/route-draw/RouteDrawSearch';

interface Props {
  search: RouteDrawSearch;
  onSelect: (result: GeocodeResult) => void;
}

// 드롭다운 최대 높이(pt) — 여행지 선택기 결과 카드와 같은 값. 넘치면 스크롤한다.
const CARD_MAX_HEIGHT = 320;
// 행 위아래 여백 — 장소명 + 주소 두 줄에 더해 HIG 44pt를 넘긴다.
const ROW_PADDING_V = 12;
const MIN_TOUCH_SIZE = 44;
// 장소명과 주소 사이 간격.
const ROW_TEXT_GAP = 2;
// 스피너·빈 결과 안내의 위아래 여백 — 여행지 선택기 결과 카드와 같은 값.
const SEARCHING_PADDING_V = 16;
const EMPTY_PADDING_V = 20;

/**
 * 그리기 검색 결과 드롭다운 (RD-5) — 여행지 선택기 결과 카드(`BagDestinationSearchResultsView`) 문법에서 박지
 * 섹션·종류 배지를 뺐다(카카오 장소만 나온다). 장소명 + 주소 한 줄, 최대 8행, 검색 중 스피너, 없으면 안내.
 */
const RouteDrawSearchResultsView: FC<Props> = ({ search, onSelect }) => {
  const l10n = app.getL10n();
  const results = search.getResults();
  const searching = search.isSearching();

  return (
    <View style={styles.card}>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        showsVerticalScrollIndicator={false}
      >
        {searching
          ? null
          : results.map((result, index) => (
              <TouchableOpacity
                key={`${result.latitude},${result.longitude},${index}`}
                style={[styles.row, index > 0 && styles.rowDivider]}
                onPress={() => onSelect(result)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={
                  result.subtitle
                    ? `${result.name}, ${result.subtitle}`
                    : result.name
                }
              >
                <PretendardText
                  style={styles.rowTitle}
                  weight='medium'
                  numberOfLines={1}
                >
                  {result.name}
                </PretendardText>
                {result.subtitle ? (
                  <PretendardText style={styles.rowSubtitle} numberOfLines={1}>
                    {result.subtitle}
                  </PretendardText>
                ) : null}
              </TouchableOpacity>
            ))}

        {searching ? (
          <View style={styles.searchingRow}>
            <ActivityIndicator size='small' color={Acg.textMuted} />
          </View>
        ) : null}

        {!searching && results.length === 0 ? (
          <PretendardText style={styles.emptyText}>
            {l10n.t('routeDraw.searchEmpty')}
          </PretendardText>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // 지도 위에 떠 있는 카드라 순백 면 + 그림자(HM-8 지도 위 요소 예외).
  card: {
    alignSelf: 'stretch',
    maxHeight: CARD_MAX_HEIGHT,
    paddingHorizontal: Spacing.item,
    borderRadius: Radius.card,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.card,
  },
  row: {
    justifyContent: 'center',
    gap: ROW_TEXT_GAP,
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: ROW_PADDING_V,
  },
  // 첫 행에는 헤어라인을 두지 않는다(HM-8).
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.hairline,
  },
  rowTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  rowSubtitle: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  searchingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SEARCHING_PADDING_V,
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
    textAlign: 'center',
    paddingVertical: EMPTY_PADDING_V,
  },
});

export default observer(RouteDrawSearchResultsView);
