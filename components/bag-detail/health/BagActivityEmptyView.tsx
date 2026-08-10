import { FC } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  isWorkoutReadConfirmed: boolean;
}

const EMPTY_ICON_SIZE = 40;

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
        <Ionicons
          name='footsteps-outline'
          size={EMPTY_ICON_SIZE}
          color={Liquid.inkSubtle}
        />
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
      <Ionicons
        name='footsteps-outline'
        size={EMPTY_ICON_SIZE}
        color={Liquid.inkSubtle}
      />
      <PretendardText style={styles.title} weight='semibold'>
        기록이 없거나 접근이 허용되지 않았어요
      </PretendardText>
      <PretendardText style={styles.description}>
        최근 기록된 운동이 없거나, 건강 앱 접근이 꺼져 있을 수 있어요. 설정에서
        접근 권한을 확인해 주세요.
      </PretendardText>
      {/* 이 상태의 유일한 다음 걸음이라 주 액션(알약)으로 세운다. */}
      <LiquidPillButton
        label='설정 열기'
        variant='primary'
        block
        onPress={handleOpenSettings}
        style={styles.settingsButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: LiquidLayout.screenH,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
    textAlign: 'center',
  },
  // 여러 줄 설명은 목업 박지 상세의 설명 값(14/22)을 쓴다.
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  settingsButton: {
    marginTop: 8,
  },
});

export default BagActivityEmptyView;
