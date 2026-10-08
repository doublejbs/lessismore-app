import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import GearView from '@/components/warehouse/GearView';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Gear from '@/model/gear/Gear';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripGearSource from '@/model/onboarding/OnboardingTripGearSource';

interface Props {
  trip: OnboardingTrip;
  gear: Gear;
  divided: boolean;
  // 창고 체크리스트 행(체크박스) / 인기 장비 행(담기 토글) — 모양·접근성 라벨·계측 source가 갈린다.
  source: OnboardingTripGearSource;
}

// 3단계 장비 행(OB-6) — 창고 행(WH-1, 이름 두 줄 + `무게 · 브랜드` 메타) + 우측 원형 토글.
// 창고 장비는 체크 배지(편집 화면 BD-4와 같은 모양), 인기 장비는 비선택이 `+`다 — 창고에 없는
// 장비라 "담기"(추가)로 읽혀야 한다. 행 전체가 토글 대상이라 터치 영역은 행 높이(72) 그대로다.
const OnboardingTripGearRowView: FC<Props> = ({
  trip,
  gear,
  divided,
  source,
}) => {
  const checked = trip.isGearSelected(gear);
  const isPopular = source === OnboardingTripGearSource.Popular;
  const l10n = app.getL10n();
  const name = gear.getDisplayName();

  const handlePress = () => {
    trip.toggleGear(gear, source);
  };

  const accessibilityProps = isPopular
    ? {
        accessibilityRole: 'button' as const,
        accessibilityState: { selected: checked },
        accessibilityLabel: checked
          ? l10n.t('onboarding.gear.removeAccessibility', { name })
          : l10n.t('onboarding.gear.addAccessibility', { name }),
      }
    : {
        accessibilityRole: 'checkbox' as const,
        accessibilityState: { checked },
        accessibilityLabel: name,
      };

  let icon = null;

  if (checked) {
    icon = <Ionicons name='checkmark' size={16} color={Acg.paper} />;
  } else if (isPopular) {
    icon = <Ionicons name='add' size={18} color={Acg.ink} />;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      {...accessibilityProps}
    >
      <GearView gear={gear} divided={divided}>
        <View
          style={[
            styles.badge,
            isPopular && styles.badgePopular,
            checked && styles.badgeChecked,
          ]}
        >
          {icon}
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
  // 담기 토글은 연회색 채움 원(검색 담기 버튼과 같은 면, HM-8 `controlFill`).
  badgePopular: {
    borderColor: Acg.controlFill,
    backgroundColor: Acg.controlFill,
  },
  badgeChecked: {
    backgroundColor: Acg.ink,
    borderColor: Acg.ink,
  },
});

export default observer(OnboardingTripGearRowView);
