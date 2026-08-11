import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import GearRowActions from '@/model/browse/GearRowActions';
import { GearAddContext } from '@/model/gear/GearAddContext';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgShadow, Color } from '@/constants/DesignTokens';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from '@/components/search/SearchGearAddToBagModalView';
import useGearRowState from './useGearRowState';

// FD-2: 2컬럼 그리드 셀 기준. CTA 원형 버튼 크기(축소하되 hitSlop으로 44 실효 터치 타깃 확보).
const CTA_SIZE = 36;
const CTA_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
  // 쿠팡 링크가 실제로 붙었을 때 부모(리스트 푸터 고지)에 알린다 — 자세한 규칙은 `useGearRowState` 참고.
  onCoupangLinkLoaded?: (() => void) | undefined;
}

// FD-2: 검색 결과(SR-2) 2컬럼 카드 그리드 셀. 장비 이미지를 쓰지 않으므로(DataModel §1 장비 이미지
// 미제공 원칙) 이미지 칸·플레이스홀더 없이 카드 면(종이 면 + 각진 모서리)만으로 그리드 리듬을 만든다.
// 구성은 위→아래로 브랜드 → 이름(2줄) → 색상 → 무게이며, 이미지가 하던 시각 위계는 무게가 대신한다.
// 담기 CTA는 카드 우상단, coupangUrl이 있으면 하단 축약 링크.
// 수수료 고지는 카드마다 반복하지 않고 리스트 푸터에서 1회 노출한다.
//
// **탐색 탭 피드 본문은 이 카드가 아니라 단일 컬럼 행(`FeedRowView`)을 쓴다**(레퍼런스 이식,
// 2026-08-11). 동작은 두 뷰가 `useGearRowState`를 공유한다.
const FeedCardView: FC<Props> = ({
  gear,
  actions,
  bag,
  gearAddContext,
  onCoupangLinkLoaded,
}) => {
  const weight = gear.getWeight();
  const color = gear.getDisplayColor();

  const {
    isAdded,
    isInThisBag,
    bagCtxId,
    loading,
    showModal,
    coupangUrl,
    handleCardPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
    handleCoupangPress,
  } = useGearRowState({
    gear,
    actions,
    bag,
    gearAddContext,
    onCoupangLinkLoaded,
  });

  const renderCta = () => {
    if (loading) {
      return (
        <View style={styles.ctaLoading}>
          <LoadingView duration={1000} color={Color.background} />
        </View>
      );
    }

    // GE-8 배낭 컨텍스트: 이미 이 배낭에 담긴 장비는 비파괴 체크 배지(중복 담기 방지),
    // 그 외에는 담기(+) — 창고 보유 여부와 무관하게 제거 동작을 노출하지 않는다.
    if (bagCtxId) {
      if (isInThisBag) {
        return (
          <View style={styles.ownedBadge}>
            <Ionicons name='checkmark' size={18} color={Color.background} />
          </View>
        );
      }
    } else if (isAdded) {
      return (
        <TouchableOpacity
          style={styles.ownedBadge}
          onPress={handleRemovePress}
          hitSlop={CTA_HIT_SLOP}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={`${gear.getDisplayName()} 창고에서 빼기`}
        >
          <Ionicons name='checkmark' size={18} color={Color.background} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddPress}
        hitSlop={CTA_HIT_SLOP}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel={
          bagCtxId
            ? `${gear.getDisplayName()} 배낭에 담기`
            : `${gear.getDisplayName()} 창고에 담기`
        }
      >
        <Ionicons name='add' size={18} color={Color.background} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable style={styles.card} onPress={handleCardPress}>
        <View style={styles.cardFace}>
          <View style={styles.cardHeader}>
            <PretendardText
              style={styles.company}
              weight='semibold'
              numberOfLines={1}
            >
              {gear.getDisplayCompany()}
            </PretendardText>
            {renderCta()}
          </View>

          <PretendardText
            style={styles.name}
            weight='semibold'
            numberOfLines={2}
            lineBreakStrategyIOS='hangul-word'
          >
            {gear.getDisplayName()}
          </PretendardText>

          {color ? (
            <PretendardText
              style={styles.color}
              weight='regular'
              numberOfLines={1}
            >
              {color}
            </PretendardText>
          ) : null}

          {/* 무게는 숫자라 콘덴스드를 쓴다 — 카드의 시각 앵커(ACG). */}
          {weight ? (
            <AcgDisplayText
              style={styles.weight}
            >{`${weight}g`}</AcgDisplayText>
          ) : null}
        </View>

        {coupangUrl ? (
          <TouchableOpacity
            style={styles.coupangLink}
            onPress={handleCoupangPress}
            activeOpacity={0.6}
          >
            <PretendardText style={styles.coupangText}>
              쿠팡 최저가
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={12}
              color={Color.textTertiary}
            />
          </TouchableOpacity>
        ) : null}
      </Pressable>

      <SearchGearAddToBagModalView
        visible={showModal}
        onClose={handleCloseModal}
        gear={gear}
        bag={bag}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  // 텍스트 카드 면 — 이미지 대신 이 면이 2컬럼 그리드의 리듬을 만든다. 높이는 콘텐츠 기준(정방형 강제 없음).
  // flex: 1 로 같은 행의 카드 면을 늘려 면 아래 빈 공간이 뜨지 않게 한다(카드 전체 하단 기준 정렬).
  // ACG: 흰 종이 면 + 각진 모서리. 회색 면(inputBg)은 지면과 붙어 카드가 안 떠 보였다.
  cardFace: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
    padding: 14,
    gap: 6,
  },
  // 브랜드(좌) + 담기 CTA(우상단) 한 행.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  addButton: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Acg.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedBadge: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Acg.ink,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  // 로딩 중에도 담기/보유 CTA와 같은 대비를 유지한다(카드 면 inputBg 위에서 흰 배경은 묻힌다).
  ctaLoading: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Acg.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FD-2: 브랜드는 제품 식별의 첫 축이라 이름(name)과 동일한 타이포로 표시한다(길면 1줄 말줄임).
  company: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: Acg.ink,
  },
  name: {
    fontSize: 14,
    lineHeight: 19,
    color: Acg.ink,
  },
  // FD-2: 색상은 이름보다 작은 활자로, 이름 아래 한 줄 표시.
  // 위치(이름 아래)는 창고 목록(WH-1)과 같지만 톤은 각 화면 규칙을 따른다 — 피드는 12/textSecondary.
  color: {
    fontSize: 12,
    lineHeight: 16,
    color: Acg.textSecondary,
  },
  // 카드에서 가장 큰 활자 — 이미지가 하던 시각 앵커를 무게가 대신한다(FD-2).
  // ACG는 이 앵커를 30px 콘덴스드로 키운다.
  // 카드의 시각 앵커 — 목록 행과 같은 라임 텍스트로 액센트를 통일한다.
  weight: {
    fontSize: 30,
    lineHeight: 34,
    color: Acg.limeText,
  },
  coupangLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
  },
  coupangText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
});

export default observer(FeedCardView);
