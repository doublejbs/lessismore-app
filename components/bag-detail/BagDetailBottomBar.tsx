import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const getPackingLabel = (bagDetail: BagDetail): string => {
  switch (bagDetail.getPackingButtonState()) {
    case PackingButtonState.Completed:
      return app.getL10n().t('bagDetail.packingComplete');
    case PackingButtonState.InProgress:
      return app.getL10n().t('bagDetail.packingProgress', {
        packed: bagDetail.getPackedCount(),
        total: bagDetail.getCount(),
      });
    default:
      return app.getL10n().t('bagDetail.packingStart');
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
            <Ionicons name='bag-check-outline' size={18} color={Acg.ink} />
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
              {app.getL10n().t('bagDetail.addGear')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 알약 높이 — 모서리는 그 절반이다(완전한 알약).
const PILL_HEIGHT = 48;

const styles = StyleSheet.create({
  // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 버튼 주위를 감싸면 지면이 끊긴다.
  container: {
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  // 보조는 연회색 알약이다(라임·잉크 면은 주 액션 몫).
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    minHeight: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: Acg.controlFill,
  },
  secondaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  // 이 화면의 유일한 라임 면 — 눌러야 하는 것 하나(홈 주 액션·플로팅 알약과 같은 문법).
  primary: {
    flex: 1,
    minHeight: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.lime,
  },
  primaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(BagDetailBottomBar);
