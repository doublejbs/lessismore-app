import { FC } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Spacing } from '@/constants/DesignTokens';

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
          최근 기록된 운동이 없어요
        </PretendardText>
        <PretendardText style={styles.description}>
          최근 1년 안에 기록된 운동이 건강 앱에 있는지 확인해 주세요.
        </PretendardText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name='footsteps-outline' size={40} color={Color.iconMuted} />
      <PretendardText style={styles.title} weight='semibold'>
        기록이 없거나 접근이 허용되지 않았어요
      </PretendardText>
      <PretendardText style={styles.description}>
        최근 기록된 운동이 없거나, 건강 앱 접근이 꺼져 있을 수 있어요. 설정에서
        접근 권한을 확인해 주세요.
      </PretendardText>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={handleOpenSettings}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='설정 열기'
      >
        <PretendardText style={styles.settingsButtonText} weight='semibold'>
          설정 열기
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
    fontSize: 16,
    color: Color.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  settingsButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.section,
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 15,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
});

export default BagActivityEmptyView;
