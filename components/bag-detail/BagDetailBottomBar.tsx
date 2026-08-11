import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';
import PretendardText from '@/components/PretendardText';
import AcgGlassView from '@/components/acg/AcgGlassView';
import { Acg, Color, Radius, Spacing } from '@/constants/DesignTokens';

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
  const insets = useSafeAreaInsets();

  const handleEdit = () => {
    app.getAnalyticsManager()?.logClick('bag_edit');
    bagDetail.goToEdit();
  };

  return (
    <View style={styles.container}>
      {/* 유리 바 — 목록이 이 아래로 흐르며 비친다. 부모 SafeAreaView가 하단 인셋을
          이미 소비하므로, 유리만 그만큼 아래로 늘려 홈 인디케이터 영역까지 덮는다
          (콘텐츠 배치는 그대로 둔 채 재질만 아래로 이어 붙이는 것). */}
      <AcgGlassView
        elevated={false}
        style={[styles.glassLayer, { bottom: -insets.bottom }]}
      />
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
            장비 추가
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 컨테이너는 계속 투명이고, 면은 유리 레이어가 낸다.
  // **주의**: 2026-08-04에 여기 불투명 흰 띠를 걷어낸 적이 있다("버튼 주위 흰 띠가
  // 지형을 끊는다" — 사용자 지적). 유리는 뒤 지형이 비쳐 흐르므로 그때의 단색 띠와는
  // 다르지만, 띠가 다시 생긴 것으로 읽힌다면 이 레이어를 빼는 것이 그때 결정에 맞다.
  container: {
    paddingTop: 12,
    paddingHorizontal: Spacing.screenH,
    backgroundColor: 'transparent',
  },
  // 하단 바의 스펙큘러는 위쪽 엣지 하나다 — 좌우·아래는 화면 밖이라 테두리를 두르면
  // 바가 아니라 떠 있는 상자로 보인다.
  glassLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.glassStrokeTop,
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
