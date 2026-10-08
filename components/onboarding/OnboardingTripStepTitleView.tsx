import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

interface Props {
  title: string;
  subtitle: string;
}

// 단계 제목(22 semibold) + 부제 한 문단(OB-3).
const OnboardingTripStepTitleView: FC<Props> = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <PretendardText
        weight='semibold'
        style={styles.title}
        accessibilityRole='header'
      >
        {title}
      </PretendardText>
      <PretendardText style={styles.subtitle}>{subtitle}</PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginBottom: 24,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
});

export default OnboardingTripStepTitleView;
