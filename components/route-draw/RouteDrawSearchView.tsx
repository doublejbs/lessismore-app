import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RouteDrawSearchResultsView from '@/components/route-draw/RouteDrawSearchResultsView';
import {
  Acg,
  AcgShadow,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import { isGeocodeAvailable } from '@/model/bag-destination/GeocodeService';
import RouteDrawSearch from '@/model/route-draw/RouteDrawSearch';

interface Props {
  search: RouteDrawSearch;
  onSelect: (result: GeocodeResult) => void;
}

const ICON_SIZE = 18;
const MIN_TOUCH_SIZE = 44;
const INPUT_PADDING_H = 14;
const INPUT_GAP = 8;

/**
 * 그리기 모드 위치 검색 (RD-5) — 안내 줄 아래 검색 인풋 + 드롭다운. 여행지 선택기(DST-4)의 검색창 문법
 * (돋보기 + 인풋 + 지우기 ×)이고, 지도 위에 떠 있어 순백 면 + 그림자다(HM-8 지도 위 요소 예외).
 * 카카오 키가 없는 빌드에서는 그리지 않는다.
 */
const RouteDrawSearchView: FC<Props> = ({ search, onSelect }) => {
  const l10n = app.getL10n();
  const query = search.getQuery();

  if (!isGeocodeAvailable()) {
    return null;
  }

  const handleChangeQuery = (value: string) => {
    search.setQuery(value);
  };

  const handleSubmit = () => {
    search.searchNow();
  };

  const handleFocus = () => {
    search.openResults();
  };

  const handleClear = () => {
    search.clear();
  };

  return (
    <View style={styles.container} pointerEvents='box-none'>
      <View style={styles.searchBox}>
        <Ionicons name='search' size={ICON_SIZE} color={Acg.textMuted} />
        <TextInput
          style={[
            styles.searchInput,
            query.length === 0 && styles.searchInputTrailing,
          ]}
          placeholder={l10n.t('routeDraw.searchPlaceholder')}
          placeholderTextColor={Acg.textMuted}
          value={query}
          onChangeText={handleChangeQuery}
          onFocus={handleFocus}
          onSubmitEditing={handleSubmit}
          autoCorrect={false}
          returnKeyType='search'
          accessibilityLabel={l10n.t('routeDraw.searchLabel')}
        />
        {query.length > 0 ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('routeDraw.searchClear')}
          >
            <Ionicons
              name='close-circle'
              size={ICON_SIZE}
              color={Acg.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {search.isResultsVisible() ? (
        <RouteDrawSearchResultsView search={search} onSelect={onSelect} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 상단 오버레이는 `alignItems: 'flex-start'`라 폭을 직접 다 쓴다.
  container: {
    alignSelf: 'stretch',
    gap: Spacing.item,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: INPUT_GAP,
    minHeight: MIN_TOUCH_SIZE,
    paddingLeft: INPUT_PADDING_H,
    borderRadius: Radius.input,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.card,
  },
  searchInput: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다 — 여행지 선택기와 같다).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
    padding: 0,
  },
  // × 가 없을 때는 인풋이 오른쪽 여백을 직접 둔다(있으면 44pt 버튼이 그 자리다).
  searchInputTrailing: {
    marginRight: INPUT_PADDING_H,
  },
  clearButton: {
    width: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(RouteDrawSearchView);
