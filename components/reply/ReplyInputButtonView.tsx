import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import Reply from '@/model/reply/Reply';
import app from '@/model/app/App';

interface Props {
  reply: Reply;
}

const ReplyInputButtonView: FC<Props> = ({ reply }) => {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    reply.moveToInput();
  };

  return (
    // 화면 맨 아래 바라 홈 인디케이터를 피한다.
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={handlePress}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('reply.writeReview')}
      >
        <View style={styles.inputWrapper}>
          <PretendardText style={styles.placeholder}>
            {app.getL10n().t('reply.reviewPlaceholder')}
          </PretendardText>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 화면 하단을 가로지르면 층이 하나 늘어난다.
  // 대신 입력 유도 칸이 면이 된다.
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    backgroundColor: 'transparent',
    width: '100%',
  },
  // RP-7: 연회색 면 + 모서리 12(앱 공통 입력 면 문법). 높이는 HIG 최소 터치 타깃 44pt.
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 누르는 라벨이라 `control` 단이다. 플랫폼별 임의 줄간(ios 20 / android 22)을 걷었다 —
  // 줄간은 타입 단이 정한다.
  placeholder: {
    ...AcgType.control,
    color: Acg.textMuted,
    flex: 1,
  },
});

export default observer(ReplyInputButtonView);
