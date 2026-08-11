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
const WEIGHT_FONT_SIZE = 24;

const WEIGHT_LINE_HEIGHT = 30;

// 면 최소 높이 — 이름이 한 줄뿐인 항목도 면이 납작해지지 않을 만큼만 둔다.
const THUMB_MIN_HEIGHT = 150;

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
}

// FD-2: 탐색 탭 피드의 **2열 그리드 셀**(레퍼런스 이식 2026-08-11, 그리드 전환 같은 날).
//
// 이 앱은 장비 사진을 취급하지 않으므로(DataModel §1) **레퍼런스의 사진 자리를 브랜드·제품명이
// 대신 채운다** — 연회색 면 하나가 셀의 덩어리가 되어, 텍스트만 흐르던 그리드에서 시선이
// 걸릴 곳이 생긴다. 카테고리 썸네일을 쓰지 않는 이유는 같은 카테고리 항목이 전부 같은 그림이
// 되어 시선은 끌지만 항목을 **구분해주지 못하기** 때문이다.
// 구성은 면 하나 안에 위→아래로 [브랜드 · 담기 버튼] / 제품명+색상 / 무게다.
// **쿠팡 최저가 링크는 두지 않는다**(2026-08-11) — 실데이터 커버리지가 0.1%(27건)라 셀 문법에
// 자리를 잡아 두면 대부분 빈 줄이고, 목록 푸터의 수수료 고지까지 딸려 온다. 커머스 동선은
// 고의도 화면인 장비 상세(GD-5)에만 둔다.
//
// 레퍼런스가 단일 컬럼인 이유는 사진이 세로를 다 먹기 때문이다. 사진이 없는 이 앱에서는
// 같은 세로에 두 배가 들어가고 이름·무게 비교도 쉬워, 문법만 가져오고 열 수는 2로 둔다.
// 동작(담기·제거·상세 이동)은 검색 결과 카드와 `useGearRowState`를 공유한다.
const FeedGridCellView: FC<Props> = ({
  gear,
  actions,
  bag,
  gearAddContext,
}) => {
  const weight = gear.getWeight();
  const color = gear.getDisplayColor();

  const {
    isAdded,
    isInThisBag,
    bagCtxId,
    loading,
    showModal,
    handleCardPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
  } = useGearRowState({
    gear,
    actions,
    bag,
    gearAddContext,
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
          레퍼런스에서 사진이 차지하던 면 하나에 셀의 정보를 **다 넣는다** — 면 안팎으로
          정보가 나뉘면 셀의 경계가 흐려지고, 밖으로 나간 값은 순백 지면 위에서 다시 약해진다.
          위→아래로 브랜드·담기 / 제품명+색상 / 무게·쿠팡이다.
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

            {/* 레퍼런스처럼 담기 버튼은 면 우상단에 얹힌다(면 안이라 흰 원이 보인다). */}
            {renderCta()}
          </View>

          {/*
            색상은 이름의 변종 표기라 줄을 따로 두지 않고 중첩 Text로 이어 붙인다 —
            이름이 접히면 색상도 따라 접힌다.
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

          {/*
            무게가 면의 바닥을 잡는다(`marginTop: auto`) — 항목마다 다르고 사람들이 탐색하는
            이유인 값이라 비교가 되도록 셀에서 가장 큰 활자로 둔다.
            같은 행 두 면은 `flex: 1`로 높이가 같아지므로 무게 줄도 한 선에 온다.
          */}
          <View style={styles.footer}>
            {weight ? (
              <AcgDisplayText
                style={styles.weight}
              >{`${weight}g`}</AcgDisplayText>
            ) : (
              // 값을 지어내지 않고 자리만 대시로 표시한다.
              <PretendardText style={styles.weightEmpty}>—</PretendardText>
            )}
          </View>
        </View>
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
  // 셀 자체는 면을 갖지 않는다 — 보이는 면은 `thumb` 하나뿐이다.
  cell: {
    flex: 1,
  },
  /**
   * 셀의 유일한 면. 사진 자리를 그대로 물려받아 정보를 다 담는다.
   *
   * 고정 비율(4:3) 대신 `flex: 1` + `minHeight`를 쓴다 — 비율로 묶으면 이름이 세 줄인 항목의
   * 무게가 면 밖으로 밀리고, 반대로 한 줄인 항목은 가운데가 텅 빈다. 같은 행 두 셀은 부모의
   * stretch로 높이가 같아지므로 면 크기는 열끼리 어긋나지 않는다.
   */
  thumb: {
    flex: 1,
    minHeight: THUMB_MIN_HEIGHT,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 12,
    gap: 6,
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
    lineHeight: 17,
    color: Acg.ink,
  },
  name: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 21,
    color: Acg.ink,
  },
  // 이름 뒤에 이어 붙는 색상 — 중첩 Text라 크기·색만 되돌려 굵기는 상속되지 않는다.
  color: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
  // 면 바닥 줄. 무게 하나뿐이지만 없는 항목도 같은 높이를 유지해 두 열이 한 선에 온다.
  footer: {
    marginTop: 'auto',
    minHeight: WEIGHT_LINE_HEIGHT,
    justifyContent: 'flex-end',
  },
  /**
   * 셀의 숫자 앵커 — 콘덴스드라 같은 크기의 본문보다 좁고 또렷하다.
   * 제품명(15)보다 크게 두는 이유: 이름은 **읽는** 값이고 무게는 **비교하는** 값이라,
   * 훑는 동안 눈에 걸려야 하는 쪽은 무게다.
   */
  weight: {
    fontSize: WEIGHT_FONT_SIZE,
    lineHeight: WEIGHT_LINE_HEIGHT,
    color: Acg.ink,
  },
  weightEmpty: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: WEIGHT_LINE_HEIGHT,
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
});

export default observer(FeedGridCellView);
