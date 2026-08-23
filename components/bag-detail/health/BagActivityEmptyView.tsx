import { FC } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  isWorkoutReadConfirmed: boolean;
}

// 후보 0건 상태(HA-2/HA-3). 문구는 **운동(워크아웃) 읽기 확인 여부로 갈린다.**
// - 확인된 경우: 원인이 하나(최근 창에 기록이 없음)로 확정되므로 권한 언급과 설정
//   링크를 넣지 않는다 — 동의를 마친 사용자에게 미허용을 안내하면 사실과 다르다.
// - 판별 불가: iOS는 "기록 없음"과 "권한 거부"를 구분할 수 없으므로 두 경우를 함께
//   안내하고 설정 앱 링크를 제공한다.
const BagActivityEmptyView: FC<Props> = ({ isWorkoutReadConfirmed }) => {
  const handleOpenSettings = () => {
    void Linking.openSettings();
  };

  if (isWorkoutReadConfirmed) {
    return (
      <View style={styles.container}>
        <Ionicons name='footsteps-outline' size={40} color={Color.iconMuted} />
        <PretendardText style={styles.title} weight='semibold'>
          {app.getL10n().t('health.emptyTitleConfirmed')}
        </PretendardText>
        <PretendardText style={styles.description}>
          {app.getL10n().t('health.emptyDescriptionConfirmed')}
        </PretendardText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name='footsteps-outline' size={40} color={Color.iconMuted} />
      <PretendardText style={styles.title} weight='semibold'>
        {app.getL10n().t('health.emptyTitleUnknown')}
      </PretendardText>
      <PretendardText style={styles.description}>
        {app.getL10n().t('health.emptyDescriptionUnknown')}
      </PretendardText>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={handleOpenSettings}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('health.openSettings')}
      >
        <PretendardText style={styles.settingsButtonText} weight='semibold'>
          {app.getL10n().t('health.openSettings')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.item,
    paddingHorizontal: Spacing.screenH,
  },
  title: {
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...AcgType.body,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  settingsButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.section,
    justifyContent: 'center',
  },
  settingsButtonText: {
    ...AcgType.control,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
});

export default observer(BagActivityEmptyView);
