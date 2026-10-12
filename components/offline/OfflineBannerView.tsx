import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { openSubscription } from '@/model/subscription/OpenSubscription';
import SubscriptionEntryPoint from '@/model/subscription/SubscriptionEntryPoint';

interface Props {
  // 구독이 끝나 저장본을 열 수 없다(OF-7) — 문구가 구독 유도로 바뀌고 누르면 구독 화면이다.
  locked: boolean;
}

/**
 * 여행 탭 오프라인 배너 (OF-4 · OF-7). 연회색 면 + `cloud-offline-outline`, 닫기 없음 — 연결되면 사라진다.
 * 잠긴 변형만 누를 수 있고, 누를 수 있음은 셰브론으로 알린다(HM-8 — 색만으로 말하지 않는다).
 */
const OfflineBannerView: FC<Props> = ({ locked }) => {
  const l10n = app.getL10n();
  const message = l10n.t(
    locked ? 'offline.banner.locked' : 'offline.banner.offline'
  );

  const content = (
    <>
      <Ionicons name='cloud-offline-outline' size={20} color={Acg.ink} />
      <PretendardText style={styles.message}>{message}</PretendardText>
      {locked ? (
        <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
      ) : null}
    </>
  );

  if (!locked) {
    return (
      <View style={styles.banner} accessible accessibilityLabel={message}>
        {content}
      </View>
    );
  }

  const handlePress = () => {
    // 구독 화면은 연결이 있어야 연다 — 오프라인이면 토스트로 알린다(OF-7).
    if (app.getNetworkStatus().isOffline()) {
      app.getToastManager()?.showSimple(l10n.t('offline.toast.onlineOnly'));

      return;
    }

    openSubscription(SubscriptionEntryPoint.Offline);
  };

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={message}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  message: {
    ...AcgType.body,
    color: Acg.ink,
    flex: 1,
  },
});

export default OfflineBannerView;
