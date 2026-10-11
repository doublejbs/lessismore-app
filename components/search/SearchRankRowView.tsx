import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRow, AcgType, Color } from '@/constants/DesignTokens';
import LoadingView from '../ui/LoadingView';
import Gear from '@/model/gear/Gear';
import app from '@/model/app/App';

interface Props {
  gear: Gear;
  // 0부터 시작하는 순위 인덱스. 표시는 index + 1, 상위 3위(0~2)는 라임 배지.
  index: number;
  // 추가·제거 요청이 진행 중이면 우측 버튼 자리에 로딩을 그린다.
  isLoading: boolean;
  // 행 위 헤어라인. 첫 행에는 두지 않는다(제목 밑줄로 읽힌다 — HM-8).
  divided: boolean;
  onPress: () => void;
  onAddPress: (e: GestureResponderEvent) => void;
  onRemovePress: (e: GestureResponderEvent) => void;
}

// 상위 몇 위까지 라임 채움 배지로 세우는지(SR-4).
const TOP_RANK_COUNT = 3;

/**
 * 추가·보유 버튼의 터치 여유(SR-4).
 *
 * 버튼은 28pt로 그리되 HIG 최소 타깃 44×44pt를 만족시켜야 한다 —
 * 시각 크기를 키우면 행이 버튼에 눌리므로 여유로만 확보한다. (44 − 28) / 2 = 8.
 */
const BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * SR-4 / FD-6 인기 장비 순위 행.
 *
 * 전용 순위 화면(`SearchTopKeywordsView`)과 피드 상단 인기 순위 섹션(`FeedRankingSectionView`)이
 * **한 컴포넌트를 공유한다** — 두 곳이 같은 것임을 모양으로 알리고, 배지·주 액션·접근성 규칙이
 * 한쪽만 바뀌는 일을 막는다.
 */
const SearchRankRowView: FC<Props> = ({
  gear,
  index,
  isLoading,
  divided,
  onPress,
  onAddPress,
  onRemovePress,
}) => {
  const l10n = app.getL10n();
  const isTopRank = index < TOP_RANK_COUNT;

  const renderButton = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingView duration={1000} />
        </View>
      );
    }

    if (gear.isAdded()) {
      return (
        <TouchableOpacity
          style={styles.ownedBadge}
          onPress={onRemovePress}
          // 체크 아이콘만으로는 "누르면 제거"가 드러나지 않는다(SR-4).
          accessibilityRole='button'
          accessibilityLabel={l10n.t('search.rank.removeAccessibility', {
            name: gear.getDisplayName(),
          })}
          hitSlop={BUTTON_HIT_SLOP}
        >
          <Ionicons name='checkmark' size={16} color={Color.textSecondary} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddPress}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('search.rank.addAccessibility', {
          name: gear.getDisplayName(),
        })}
        hitSlop={BUTTON_HIT_SLOP}
      >
        <Ionicons name='add' size={18} color={Color.textPrimary} />
      </TouchableOpacity>
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.rankItem,
        divided && styles.rankItemDivided,
        pressed && styles.rankItemPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.rankBadge, isTopRank && styles.rankBadgeTop3]}>
        <PretendardText
          style={[styles.rankNumber, isTopRank && styles.rankNumberTop3]}
          weight='bold'
        >
          {index + 1}
        </PretendardText>
      </View>

      {/* 목록 행 문법(HM-8): 이름 + 메타 한 줄(`무게 · 브랜드`). 브랜드가 이름 위
          작은 줄이던 것을 메타로 내렸다 — 위에 두면 순위·브랜드·이름 세 층이 된다. */}
      <View style={styles.gearInfo}>
        <PretendardText
          style={styles.gearName}
          weight='medium'
          numberOfLines={2}
        >
          {gear.getDisplayName()}
        </PretendardText>
        <PretendardText style={styles.gearMeta} numberOfLines={1}>
          {[`${gear.getWeight()}g`, gear.getDisplayCompany()]
            .filter(Boolean)
            .join(' · ')}
        </PretendardText>
      </View>

      <View style={styles.buttonContainer}>{renderButton()}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  /**
   * 레퍼런스 목록 행(HM-8) — 면 없이 지면에 놓고 행 사이 헤어라인으로 가른다.
   * 행마다 회색 면을 두던 것을 걷었다(2026-08-12): 면이 순위마다 반복되면 정작 순위 숫자와
   * 이름이 그 안에 갇혀 목록이 카드 나열로 읽힌다.
   */
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  rankItemDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rankItemPressed: {
    backgroundColor: Acg.controlFill,
  },
  /**
   * 순위는 배지 원이 아니라 **숫자 그 자체**다. 상위 3위만 채움 원으로 세운다 —
   * 4위 이하까지 원을 두면 원이 목록의 리듬을 만들어 이름보다 먼저 읽힌다.
   * 채움은 라임(2026-08-13 사용자 결정, SR-4) — "라임은 화면당 하나" 규칙의 명시적 예외로,
   * 이 화면의 정체가 순위라 1·2·3이 곧 화면의 주인공이다. 숫자는 잉크(라임 위 글자 규칙).
   */
  rankBadge: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeTop3: {
    borderRadius: 14,
    backgroundColor: Acg.lime,
  },
  rankNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  rankNumberTop3: {
    color: Acg.ink,
  },
  gearInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  // 이름 + 메타 한 줄(브랜드·무게)로 묶는다 — 브랜드가 이름 위 작은 줄이던 것을 내렸다.
  gearName: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  gearMeta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 보유 상태 배지(SR-4). **추가 버튼보다 약하다.**
   * 예전에는 검정 채움이라 이미 보유한 항목이 시선을 독점하고, 정작 눌러야 할 추가 버튼은
   * 행 배경과 같은 색이라 사라져 있었다 — 위계가 뒤집혀 있었다.
   */
  ownedBadge: {
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 이 화면의 주 액션(SR-4). 행 배경(surfaceMuted)과 같은 색이면 버튼으로 보이지 않으므로
  // 흰 채움 + 테두리로 세운다.
  addButton: {
    backgroundColor: Color.background,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SearchRankRowView);
