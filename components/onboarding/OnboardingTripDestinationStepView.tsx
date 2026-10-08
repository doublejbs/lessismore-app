import { FC } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgType,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripStepTitleView from './OnboardingTripStepTitleView';

interface Props {
  trip: OnboardingTrip;
  onOpenPicker: () => void;
}

// 2단계 — 어디로 가세요?(OB-5). 여행지 면 하나 — 탭하면 공용 선택기(DST-3)를 연다.
const OnboardingTripDestinationStepView: FC<Props> = ({
  trip,
  onOpenPicker,
}) => {
  const l10n = app.getL10n();
  const location = trip.getLocation();
  const title = location
    ? location.name
    : l10n.t('onboarding.destination.placeholder');
  const meta = location
    ? location.campSpotId
      ? l10n.t('onboarding.destination.campSite')
      : l10n.t('onboarding.destination.freeLocation')
    : l10n.t('onboarding.destination.placeholderMeta');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingTripStepTitleView
        title={l10n.t('onboarding.destination.title')}
        subtitle={l10n.t('onboarding.destination.subtitle')}
      />
      <TouchableOpacity
        style={styles.surface}
        onPress={onOpenPicker}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('onboarding.destination.accessibility', {
          name: `${title}, ${meta}`,
        })}
      >
        <Ionicons
          name={location ? 'location' : 'location-outline'}
          size={22}
          color={Acg.ink}
        />
        <View style={styles.text}>
          <PretendardText
            weight='medium'
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </PretendardText>
          <PretendardText style={styles.meta} numberOfLines={1}>
            {meta}
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Acg.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    paddingBottom: 24,
  },
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    paddingHorizontal: 16,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
});

export default observer(OnboardingTripDestinationStepView);
