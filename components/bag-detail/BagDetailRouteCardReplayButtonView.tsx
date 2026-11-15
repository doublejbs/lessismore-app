import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgShadow,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  // 지도 칸 위에 떠 있는지 — 떠 있으면 그림자(HM-8 지도 위 요소), 카드 면 위면 헤어라인 테두리.
  onMap: boolean;
  onPress: () => void;
}

// 아이콘-라벨 간격·좌우 패딩(코스 화면 `3D` 알약과 같은 값).
const ICON_GAP = 6;
const PADDING_H = 16;

/**
 * 여행 상세 코스 카드의 `3D로 보기` 흰 보조 알약 (RD-9 #5 · RR-1). 자리(지도 칸 우하단 / 글자 줄 오른쪽)는 카드가
 * 정하고, 이 뷰는 면만 고른다. 라임이 아니다 — 이 화면의 라임은 하단 바 주 액션이다(HM-8). 44pt 터치.
 */
const BagDetailRouteCardReplayButtonView: FC<Props> = ({ onMap, onPress }) => {
  const label = app.getL10n().t('routeReplay.open');

  return (
    <TouchableOpacity
      style={[styles.pill, onMap ? styles.onMap : styles.onCard]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole='button'
      accessibilityLabel={label}
    >
      <Ionicons name='cube-outline' size={18} color={Acg.ink} />
      <PretendardText weight='semibold' style={styles.label}>
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ICON_GAP,
    paddingHorizontal: PADDING_H,
    paddingVertical: Spacing.item,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
  },
  onMap: {
    boxShadow: AcgShadow.card,
  },
  // 카드 면 위 — 그림자 대신 헤어라인 테두리(그룹 시트 `코스 추가` 보조 알약과 같은 면).
  onCard: {
    borderWidth: 1,
    borderColor: Acg.hairline,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default BagDetailRouteCardReplayButtonView;
