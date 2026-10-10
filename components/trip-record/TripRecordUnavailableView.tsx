import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  message: string;
  onClose: () => void;
}

const CLOSE_BUTTON_HEIGHT = 48;

/**
 * 기록 시트를 열 수 없을 때의 짧은 안내(CM-16 "끝난 여행만" · 웹 · 남의 배낭).
 * 안내 한 줄과 닫기 하나만 둔다.
 */
const TripRecordUnavailableView: FC<Props> = ({ message, onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <PretendardText style={styles.message} weight='medium'>
        {message}
      </PretendardText>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('common.close')}
      >
        <PretendardText style={styles.closeText} weight='semibold'>
          {app.getL10n().t('common.close')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Acg.paper,
    paddingHorizontal: AcgLayout.screenPadding,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래에서 시작한다.
    paddingTop: 52,
    gap: 24,
  },
  message: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  closeButton: {
    minHeight: CLOSE_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  closeText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default TripRecordUnavailableView;
