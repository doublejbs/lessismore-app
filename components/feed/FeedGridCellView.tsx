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

// 이름 줄간. 두 줄 자리를 미리 비우는 계산에 쓰이므로 상수로 둔다.
const NAME_LINE_HEIGHT = 25;

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
// 면·테두리·그림자·모서리·구분선을 갖지 않는다 — 순백 지면에 콘텐츠가 직접 놓이고 그리드의
// 리듬은 셀 사이 여백만으로 만든다. 레퍼런스는 사진이 셀의 앵커지만 이 앱은 장비 사진을
// 취급하지 않으므로(DataModel §1) **이름이 앵커**다.
// 구성은 위→아래로 이름(2줄 자리 고정) → 브랜드 → 푸터[메타·쿠팡 | 담기 버튼]이다.
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
      <Pressable style={styles.cell} onPress={handleCardPress}>
        {/*
          이름은 셀 폭을 다 쓴다 — 담기 버튼을 이름 옆에 두면 좁은 셀에서 이름이 두 배로
          접혀 읽기가 나빠진다. 버튼은 아래 푸터 우측에 놓는다.
          두 줄 자리를 **비워 두고** 시작해 한 줄 이름과 두 줄 이름의 셀 키가 같아진다 —
          면이 없는 그리드에서 셀 키가 어긋나면 열이 톱니처럼 보인다.
        */}
        <PretendardText style={styles.name} weight='semibold' numberOfLines={2}>
          {gear.getDisplayName()}
        </PretendardText>

        <PretendardText style={styles.company} numberOfLines={1}>
          {gear.getDisplayCompany()}
        </PretendardText>

        {/* 푸터는 `marginTop: auto`로 셀 바닥에 붙는다 — 같은 행 두 셀의 담기 버튼이 한 선에 온다. */}
        <View style={styles.footer}>
          <View style={styles.footerText}>
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
                <PretendardText style={styles.coupangText} numberOfLines={1}>
                  쿠팡 최저가
                </PretendardText>
                <Ionicons
                  name='chevron-forward'
                  size={14}
                  color={Acg.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {renderCta()}
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
  /**
   * `flex: 1`로 같은 행 두 셀의 키를 맞춘다(행 높이 = 더 긴 셀). 면·테두리·그림자는 없다 —
   * 그리드의 리듬은 셀 사이 여백이 만든다.
   */
  cell: {
    flex: 1,
    gap: 4,
  },
  /**
   * 사진이 없으므로 이름이 셀의 앵커다 — 셀에서 가장 큰 활자.
   *
   * `minHeight`로 **두 줄 자리를 미리 비운다**. 한 줄 이름과 두 줄 이름이 섞이면 카드 면이
   * 없는 그리드에서 브랜드·메타 줄이 셀마다 다른 높이에서 시작해 열이 톱니처럼 어긋난다.
   */
  name: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: NAME_LINE_HEIGHT,
    minHeight: NAME_LINE_HEIGHT * 2,
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
  /**
   * 셀 바닥에 붙는 줄 — `marginTop: 'auto'`가 위 여백을 다 먹어 같은 행 두 셀의 담기 버튼이
   * 한 선에 온다. 좌측 텍스트(메타·쿠팡)와 우측 버튼을 아래 끝으로 맞춘다.
   */
  footer: {
    marginTop: 'auto',
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  // `minWidth: 0`이 없으면 긴 메타가 담기 버튼을 셀 밖으로 밀어낸다.
  footerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
