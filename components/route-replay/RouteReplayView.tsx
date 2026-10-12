import { FC, useCallback } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { RouteReplayRequest } from '@/model/route-replay/RouteReplayRequest';
import RouteReplayNoticeView from './RouteReplayNoticeView';
import RouteReplayWebView from './RouteReplayWebView';

interface Props {
  request: RouteReplayRequest | null;
}

const IS_IOS = Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';
const HEADER_HEIGHT = 52;

/**
 * 3D 코스 리플레이 화면(RR-2) — 헤더 + 웹뷰. iOS는 네이티브 헤더, Android는 커스텀 헤더다(LG-1,
 * 코스 화면과 같은 관례). 진입 데이터가 없으면(딥링크·새로고침) 빈 상태와 닫기만 둔다(RR-3).
 * 웹에는 진입점이 없다(APP-5) — 직접 열어도 빈 상태다.
 */
const RouteReplayView: FC<Props> = ({ request }) => {
  const l10n = app.getL10n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const title = request?.title ?? '';

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace('/');
  }, [router]);

  const renderCloseButton = () => {
    return (
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleClose}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('common.close')}
      >
        <Ionicons name='close' size={24} color={Acg.ink} />
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    if (!request || IS_WEB) {
      return <RouteReplayNoticeView message={l10n.t('routeReplay.empty')} />;
    }

    return <RouteReplayWebView request={request} />;
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTitle: title,
          headerBackVisible: false,
          headerShadowVisible: false,
          headerRight: renderCloseButton,
        }}
      />
      {IS_IOS ? null : (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerButton} />
          <PretendardText
            weight='semibold'
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {title}
          </PretendardText>
          {renderCloseButton()}
        </View>
      )}
      <View style={styles.content}>{renderBody()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Acg.paper },
  header: {
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Acg.paper,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    flex: 1,
    textAlign: 'center',
  },
  content: { flex: 1 },
});

export default RouteReplayView;
