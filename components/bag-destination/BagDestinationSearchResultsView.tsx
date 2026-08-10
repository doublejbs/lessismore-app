import { FC } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';

interface Props {
  spots: CampSpot[];
  places: GeocodeResult[];
  searchingPlaces: boolean;
  onSelectSpot: (spot: CampSpot) => void;
  onSelectPlace: (place: GeocodeResult) => void;
}

// 통합 검색 결과(DST-4). 등록된 박지를 먼저, 카카오 장소를 다음에 보여준다.
// 결과 종류는 텍스트 배지로 구분한다 — 색·아이콘만으로 구분하지 않는다.
const BagDestinationSearchResultsView: FC<Props> = ({
  spots,
  places,
  searchingPlaces,
  onSelectSpot,
  onSelectPlace,
}) => {
  const hasNoResult = spots.length === 0 && places.length === 0;

  return (
    // 그림자는 바깥 래퍼가 진다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 두면
    // 그림자가 잘려 지도 위 흰 카드에 아무 경계도 남지 않는다(지도 탭 드롭다운과 같은 구조).
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <ScrollView
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
          showsVerticalScrollIndicator={false}
        >
          {spots.length > 0 && (
            <>
              <View style={styles.sectionLabel}>
                <LiquidSectionLabel>등록된 박지</LiquidSectionLabel>
              </View>
              {spots.map(spot => (
                <TouchableOpacity
                  key={spot.id}
                  style={styles.row}
                  onPress={() => onSelectSpot(spot)}
                  activeOpacity={LiquidMotion.pressOpacity}
                  accessibilityRole='button'
                  accessibilityLabel={`박지 ${spot.name}, ${getCampSpotRegionLabel(spot)}`}
                >
                  <View style={styles.badge}>
                    <PretendardText style={styles.badgeText} weight='semibold'>
                      박지
                    </PretendardText>
                  </View>
                  <View style={styles.rowText}>
                    <PretendardText
                      style={styles.rowTitle}
                      weight='medium'
                      numberOfLines={1}
                    >
                      {spot.name}
                    </PretendardText>
                    <PretendardText
                      style={styles.rowSubtitle}
                      numberOfLines={1}
                    >
                      {getCampSiteTypeLabel(spot.type)} ·{' '}
                      {getCampSpotRegionLabel(spot)}
                    </PretendardText>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {places.length > 0 && (
            <>
              <View style={styles.sectionLabel}>
                <LiquidSectionLabel>장소</LiquidSectionLabel>
              </View>
              {places.map((place, index) => (
                <TouchableOpacity
                  key={`${place.latitude},${place.longitude},${index}`}
                  style={styles.row}
                  onPress={() => onSelectPlace(place)}
                  activeOpacity={LiquidMotion.pressOpacity}
                  accessibilityRole='button'
                  accessibilityLabel={`장소 ${place.name}`}
                >
                  <View style={styles.badge}>
                    <PretendardText style={styles.badgeText} weight='semibold'>
                      장소
                    </PretendardText>
                  </View>
                  <View style={styles.rowText}>
                    <PretendardText
                      style={styles.rowTitle}
                      weight='medium'
                      numberOfLines={1}
                    >
                      {place.name}
                    </PretendardText>
                    {place.subtitle && (
                      <PretendardText
                        style={styles.rowSubtitle}
                        numberOfLines={1}
                      >
                        {place.subtitle}
                      </PretendardText>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* 장소 검색이 아직 도는 중이면 박지 결과만 먼저 보여주고 아래에 진행을 알린다. */}
          {searchingPlaces && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size='small' color={Liquid.ink} />
              <PretendardText style={styles.searchingText}>
                장소를 찾는 중이에요
              </PretendardText>
            </View>
          )}

          {!searchingPlaces && hasNoResult && (
            // 빈 상태는 사실 + 다음 걸음 두 줄(핸드오프 Interactions).
            <View style={styles.empty}>
              <PretendardText style={styles.emptyFact} weight='semibold'>
                검색 결과가 없어요
              </PretendardText>
              <PretendardText style={styles.emptyNext}>
                다른 이름으로 다시 찾아볼까요?
              </PretendardText>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    marginHorizontal: LiquidLayout.screenH,
    borderRadius: LiquidRadius.tile,
    boxShadow: LiquidShadow.card,
  },
  /**
   * 결과는 필드 아래 **종이 카드**로 뜬다 — 유리로 두면 지도 위에서 행이 겹쳐 읽힌다.
   * 모서리는 카드값(20)이라 알약 검색 필드와 형태가 갈려 "필드에 이어 붙은 목록"으로 읽힌다.
   */
  card: {
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    maxHeight: 320,
    paddingHorizontal: LiquidLayout.cardPad,
    overflow: 'hidden',
  },
  // 라벨 자체가 아래 여백 10을 들고 있어 위쪽만 띄운다.
  sectionLabel: {
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // 고정 높이 대신 여백으로 44pt 이상을 확보해 Dynamic Type에 대응한다.
    paddingVertical: 12,
    minHeight: LiquidLayout.touchMin,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Liquid.hairline,
  },
  // 결과 종류(박지·장소)를 글자로 말하는 중립 배지 — 색·아이콘만으로 구분하지 않는다.
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.badgeFill,
  },
  badgeText: {
    fontSize: LiquidType.micro.fontSize,
    color: Liquid.inkSecondary,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  rowSubtitle: {
    fontSize: LiquidType.caption.fontSize,
    color: Liquid.inkMuted,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  searchingText: {
    fontSize: LiquidType.bodySm.fontSize,
    color: Liquid.inkTertiary,
  },
  empty: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 20,
  },
  emptyFact: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyNext: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default BagDestinationSearchResultsView;
