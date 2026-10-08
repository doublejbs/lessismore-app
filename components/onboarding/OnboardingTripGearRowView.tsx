import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import GearView from '@/components/warehouse/GearView';
import { Acg } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';

interface Props {
  trip: OnboardingTrip;
  gear: Gear;
  divided: boolean;
}

// 3단계 체크 행(OB-6) — 창고 행(WH-1) + 우측 원형 체크 배지(편집 화면 BD-4와 같은 모양).
// 행 전체가 하나의 체크박스라 VoiceOver/TalkBack이 이름과 선택 상태를 한 번에 읽는다.
const OnboardingTripGearRowView: FC<Props> = ({ trip, gear, divided }) => {
  const checked = trip.isGearSelected(gear);

  const handlePress = () => {
    trip.toggleGear(gear);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='checkbox'
      accessibilityState={{ checked }}
      accessibilityLabel={gear.getDisplayName()}
    >
      <GearView gear={gear} divided={divided}>
        <View style={[styles.badge, checked && styles.badgeChecked]}>
          {checked ? (
            <Ionicons name='checkmark' size={16} color={Acg.paper} />
          ) : null}
        </View>
      </GearView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Acg.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeChecked: {
    backgroundColor: Acg.ink,
    borderColor: Acg.ink,
  },
});

export default observer(OnboardingTripGearRowView);
