import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import OfflineTripAccess from '@/model/offline/OfflineTripAccess';

interface Props {
  access: OfflineTripAccess;
}

const getMessageKey = (access: OfflineTripAccess): string => {
  switch (access) {
    case OfflineTripAccess.Locked:
      return 'offline.detail.locked';
    case OfflineTripAccess.NeedsUpgrade:
      return 'offline.detail.needsUpgrade';
    default:
      return 'offline.detail.notSaved';
  }
};

/**
 * 오프라인인데 저장본으로 열 수 없을 때의 빈 상태 (OF-5 `이 여행은 저장되지 않았어요` · OF-7 잠김 · OF-1 갱신 필요).
 * 배낭 상세와 코스 화면이 함께 쓴다. 버튼을 두지 않는다 — 오프라인에서 할 수 있는 일이 없다.
 */
const OfflineUnavailableView: FC<Props> = ({ access }) => {
  const message = app.getL10n().t(getMessageKey(access));

  return (
    <View style={styles.container} accessible accessibilityLabel={message}>
      <Ionicons name='cloud-offline-outline' size={40} color={Acg.textMuted} />
      <PretendardText style={styles.message}>{message}</PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  message: {
    ...AcgType.body,
    color: Acg.textMuted,
    textAlign: 'center',
  },
});

export default OfflineUnavailableView;
