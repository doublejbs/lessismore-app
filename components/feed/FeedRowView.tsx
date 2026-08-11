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
import { Acg, AcgFontSize } from '@/constants/DesignTokens';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from '@/components/search/SearchGearAddToBagModalView';
import useGearRowState from './useGearRowState';

// 담기 버튼은 그 자체로 44pt 터치 타깃이다(레퍼런스는 사진 위 흰 원, 여기선 연회색 원).
const CTA_SIZE = 36;
// 시각 크기를 키우면 행이 두꺼워지므로 여유로만 HIG 44를 채운다: (44 − 36) / 2 = 4.
const CTA_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

const CTA_ICON_SIZE = 24;

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
  // 쿠팡 링크가 실제로 붙었을 때 부모(리스트 푸터 고지)에 알린다 — 자세한 규칙은 `useGearRowState` 참고.
  onCoupangLinkLoaded?: (() => void) | undefined;
}

// FD-2: 탐색 탭 피드의 단일 컬럼 행(레퍼런스 이식, 2026-08-11).
//
// 면·테두리·그림자·모서리·구분선을 갖지 않는다 — 순백 지면에 콘텐츠가 직접 놓인다.
// 레퍼런스는 사진이 행의 앵커지만 이 앱은 장비 사진을 취급하지 않으므로(DataModel §1)
// **이름이 앵커**다. 구성은 위→아래로 [이름 + 담기 버튼] → 브랜드 → 메타(`무게 · 색상`)이며,
// 쿠팡 링크가 있으면 메타 아래 별도 줄로 붙는다.
// 동작(담기·제거·상세 이동·쿠팡 지연 로드)은 검색 결과 카드와 `useGearRowState`를 공유한다.
const FeedRowView: FC<Props> = ({
  gear,
  actions,
  bag,
  gearAddContext,
  onCoupangLinkLoaded,
}) => {
  const weight = gear.getWeight();
  const color = gear.getDisplayColor();
  const hasMeta = !!weight || !!color;

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
        <View style={styles.cta}>
          <LoadingView duration={1000} color={Acg.ink} />
        </View>
      );
    }

    // GE-8 배낭 컨텍스트: 이미 이 배낭에 담긴 장비는 비파괴 체크 배지(중복 담기 방지),
    // 그 외에는 담기(+) — 창고 보유 여부와 무관하게 제거 동작을 노출하지 않는다.
    if (bagCtxId) {
      if (isInThisBag) {
        return (
          <View style={[styles.cta, styles.ctaAdded]}>
            <Ionicons name='checkmark' size={CTA_ICON_SIZE} color={Acg.lime} />
          </View>
        );
      }
    } else if (isAdded) {
      return (
        <TouchableOpacity
          style={[styles.cta, styles.ctaAdded]}
          onPress={handleRemovePress}
          hitSlop={CTA_HIT_SLOP}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={`${gear.getDisplayName()} 창고에서 빼기`}
        >
          <Ionicons name='checkmark' size={CTA_ICON_SIZE} color={Acg.lime} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.cta}
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
        <Ionicons name='add' size={CTA_ICON_SIZE} color={Acg.ink} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable style={styles.row} onPress={handleCardPress}>
        <View style={styles.titleRow}>
          <PretendardText
            style={styles.name}
            weight='semibold'
            numberOfLines={2}
          >
            {gear.getDisplayName()}
          </PretendardText>
          {renderCta()}
        </View>

        <PretendardText style={styles.company} numberOfLines={1}>
          {gear.getDisplayCompany()}
        </PretendardText>

        {hasMeta ? (
          <PretendardText style={styles.meta} numberOfLines={1}>
            {/* 무게 숫자만 콘덴스드로 살짝 세운다 — 한글에는 쓰지 않는다(글리프 없음). */}
            {weight ? (
              <AcgDisplayText style={styles.metaWeight}>
                {`${weight}g`}
              </AcgDisplayText>
            ) : null}
            {weight && color ? ' · ' : null}
            {color}
          </PretendardText>
        ) : null}

        {coupangUrl ? (
          <TouchableOpacity
            style={styles.coupangLink}
            onPress={handleCoupangPress}
            activeOpacity={0.7}
            accessibilityRole='link'
            accessibilityLabel={`${gear.getDisplayName()} 쿠팡 최저가`}
          >
            <PretendardText style={styles.coupangText}>
              쿠팡 최저가
            </PretendardText>
            <Ionicons name='chevron-forward' size={14} color={Acg.textMuted} />
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
  row: {
    gap: 6,
  },
  // 이름(좌, 최대 2줄) + 담기 버튼(우). 이름이 여러 줄로 늘어도 버튼은 첫 줄에 붙는다.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  // 사진이 없으므로 이름이 행의 앵커다 — 행에서 가장 큰 활자.
  name: {
    flex: 1,
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 25,
    color: Acg.ink,
  },
  company: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.textMuted,
  },
  meta: {
    fontSize: AcgFontSize.meta,
    lineHeight: 20,
    color: Acg.ink,
  },
  metaWeight: {
    fontSize: AcgFontSize.meta,
    color: Acg.ink,
  },
  // 연회색 원 — 순백 지면에서는 레퍼런스의 흰 원이 보이지 않는다.
  cta: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Acg.controlFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 담긴 상태는 잉크 채움 + 라임 체크(기존 규칙).
  ctaAdded: {
    backgroundColor: Acg.ink,
  },
  coupangLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    // 링크 자체로 44pt 터치 타깃을 확보한다.
    minHeight: 44,
  },
  coupangText: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
});

export default observer(FeedRowView);
