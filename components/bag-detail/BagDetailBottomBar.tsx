import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const getPackingLabel = (bagDetail: BagDetail): string => {
  switch (bagDetail.getPackingButtonState()) {
    case PackingButtonState.Completed:
      return '패킹 완료';
    case PackingButtonState.InProgress:
      return `패킹 ${bagDetail.getPackedCount()}/${bagDetail.getCount()}`;
    default:
      return '패킹 시작';
  }
};

// 하단 고정 액션 바: (패킹 보조) + 장비 편집(주). 플로팅 버튼이 리스트를 가리던 문제 해소.
const BagDetailBottomBar: FC<Props> = ({ bagDetail }) => {
  const showPacking = bagDetail.shouldShowPackingButton();

  const handleEdit = () => {
    app.getAnalyticsManager()?.logClick('bag_edit');
    bagDetail.goToEdit();
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showPacking && (
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => bagDetail.goToPacking()}
            activeOpacity={0.7}
            accessibilityRole='button'
          >
            <Ionicons
              name='bag-check-outline'
              size={18}
              color={Color.textPrimary}
            />
            <PretendardText style={styles.secondaryText} weight='semibold'>
              {getPackingLabel(bagDetail)}
            </PretendardText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.primary}
          onPress={handleEdit}
          activeOpacity={0.8}
          accessibilityRole='button'
        >
          <PretendardText style={styles.primaryText} weight='semibold'>
            수정하기
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 버튼 주위를 감싸면 지형이 끊긴다
  // (2026-08-04 사용자 지적). 버튼 자체가 잉크/지면색 면이라 이미 충분히 읽힌다.
  container: {
    paddingTop: 12,
    paddingHorizontal: Spacing.screenH,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: Radius.card,
    backgroundColor: Color.surfaceMuted,
  },
  secondaryText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  primary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.chipActiveBg,
  },
  primaryText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default observer(BagDetailBottomBar);
