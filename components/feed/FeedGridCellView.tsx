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
import { Acg, AcgFontSize, AcgRadius } from '@/constants/DesignTokens';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from '@/components/search/SearchGearAddToBagModalView';
import useGearRowState from './useGearRowState';

// 담기 버튼은 그 자체로 44pt 터치 타깃이다(레퍼런스처럼 썸네일 면 위 흰 원).
const CTA_SIZE = 36;
// 시각 크기를 키우면 행이 두꺼워지므로 여유로만 HIG 44를 채운다: (44 − 36) / 2 = 4.
const CTA_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

const CTA_ICON_SIZE = 24;

// 썸네일 면 안에서 제품명이 차지할 최대 줄 수. 면 높이 계산과 짝이라 상수로 둔다.
const NAME_MAX_LINES = 3;

// 앵커 무게. 셀에서 가장 큰 활자다.
const WEIGHT_FONT_SIZE = 26;

const WEIGHT_LINE_HEIGHT = 30;

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
  // 쿠팡 링크가 실제로 붙었을 때 부모(리스트 푸터 고지)에 알린다 — 자세한 규칙은 `useGearRowState` 참고.
  onCoupangLinkLoaded?: (() => void) | undefined;
}

// FD-2: 탐색 탭 피드의 **2열 그리드 셀**(레퍼런스 이식 2026-08-11, 그리드 전환 같은 날).
//
// 이 앱은 장비 사진을 취급하지 않으므로(DataModel §1) **레퍼런스의 사진 자리를 브랜드·제품명이
// 대신 채운다** — 연회색 면 하나가 셀의 덩어리가 되어, 텍스트만 흐르던 그리드에서 시선이
// 걸릴 곳이 생긴다. 카테고리 썸네일을 쓰지 않는 이유는 같은 카테고리 항목이 전부 같은 그림이
// 되어 시선은 끌지만 항목을 **구분해주지 못하기** 때문이다.
// 구성은 위→아래로 썸네일 면[브랜드 · 담기 버튼 / 제품명+색상] → 무게 → 쿠팡이다.
//
// 레퍼런스가 단일 컬럼인 이유는 사진이 세로를 다 먹기 때문이다. 사진이 없는 이 앱에서는
// 같은 세로에 두 배가 들어가고 이름·무게 비교도 쉬워, 문법만 가져오고 열 수는 2로 둔다.
// 동작(담기·제거·상세 이동·쿠팡 지연 로드)은 검색 결과 카드와 `useGearRowState`를 공유한다.
const FeedGridCellView: FC<Props> = ({
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
      <Pressable style={styles.cell} onPress={handleCardPress}>
        {/*
          사진 자리 — 사진 대신 브랜드·제품명이 들어간다. 면이 있어야 셀이 덩어리로 읽히고,
          그 안에서는 밖(순백 지면)보다 대비가 확보돼 브랜드도 또렷해진다.
        */}
        <View style={styles.thumb}>
          <View style={styles.thumbHeader}>
            {/*
              브랜드는 작지만 **잉크**다 — 회색으로 낮추면 순백 지면 위에서 그랬듯 사라진다.
              제품명과는 색이 아니라 크기·굵기로 갈라진다.
            */}
            <PretendardText
              style={styles.company}
              weight='medium'
              numberOfLines={1}
            >
              {gear.getDisplayCompany()}
            </PretendardText>

            {/* 레퍼런스처럼 담기 버튼은 썸네일 면 우상단에 얹힌다(면 안이라 흰 원이 보인다). */}
            {renderCta()}
          </View>

          {/*
            제품명은 면 바닥에 붙는다(`marginTop: auto`) — 브랜드와 사이가 벌어져 둘이
            한 덩어리로 뭉치지 않는다. 색상은 이름의 변종 표기라 줄을 따로 두지 않고
            중첩 Text로 이어 붙인다.
          */}
          <PretendardText
            style={styles.name}
            weight='semibold'
            numberOfLines={NAME_MAX_LINES}
          >
            {gear.getDisplayName()}
            {color ? (
              <PretendardText
                style={styles.color}
              >{` ${color}`}</PretendardText>
            ) : null}
          </PretendardText>
        </View>

        {/*
          무게는 면 밖 숫자 앵커다 — 항목마다 다르고 사람들이 탐색하는 이유인 값이라
          비교가 되도록 셀에서 가장 큰 활자로 둔다.
        */}
        <View style={styles.weightRow}>
          {weight ? (
            <AcgDisplayText
              style={styles.weight}
            >{`${weight}g`}</AcgDisplayText>
          ) : (
            // 무게가 없는 항목도 같은 높이를 차지해야 두 열의 썸네일 면이 한 선에서
            // 시작한다. 값을 지어내지 않고 자리만 대시로 표시한다.
            <PretendardText style={styles.weightEmpty}>—</PretendardText>
          )}
        </View>

        {coupangUrl ? (
          <TouchableOpacity
            style={styles.coupangLink}
            onPress={handleCoupangPress}
            activeOpacity={0.7}
            accessibilityRole='link'
            accessibilityLabel={`${gear.getDisplayName()} 쿠팡 최저가`}
          >
            <PretendardText style={styles.coupangText} numberOfLines={1}>
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
  // `flex: 1`로 같은 행 두 셀의 폭을 맞춘다. 셀 자체는 면·테두리를 갖지 않는다 — 면은 썸네일뿐이다.
  cell: {
    flex: 1,
    gap: 8,
  },
  /**
   * 사진 자리. 레퍼런스 사진과 같은 비율(4:3)로 두어 그리드의 리듬이 사진판과 같아진다.
   * 정사각으로 두면 텍스트 두세 줄에 비해 빈 회색이 너무 넓어 보인다.
   */
  thumb: {
    aspectRatio: 4 / 3,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 12,
  },
  thumbHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  // `minWidth: 0`이 없으면 긴 브랜드명이 담기 버튼을 면 밖으로 밀어낸다.
  company: {
    flex: 1,
    minWidth: 0,
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Acg.ink,
  },
  name: {
    marginTop: 'auto',
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 21,
    color: Acg.ink,
  },
  // 이름 뒤에 이어 붙는 색상 — 중첩 Text라 크기·색만 되돌려 굵기는 상속되지 않는다.
  color: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
  /**
   * 셀의 숫자 앵커 — 콘덴스드라 같은 크기의 본문보다 좁고 또렷하다.
   * 제품명(15)보다 크게 두는 이유: 이름은 **읽는** 값이고 무게는 **비교하는** 값이라,
   * 훑는 동안 눈에 걸려야 하는 쪽은 무게다.
   */
  // 무게 유무와 무관하게 같은 높이를 차지한다 — 없으면 열이 한 줄씩 밀려 어긋난다.
  weightRow: {
    minHeight: WEIGHT_LINE_HEIGHT,
    justifyContent: 'center',
  },
  weight: {
    fontSize: WEIGHT_FONT_SIZE,
    lineHeight: WEIGHT_LINE_HEIGHT,
    color: Acg.ink,
  },
  weightEmpty: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.textMuted,
  },
  // 회색 면 위이므로 레퍼런스와 같이 흰 원이다.
  cta: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Acg.paper,
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

export default observer(FeedGridCellView);
