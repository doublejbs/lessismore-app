import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ViewStyle,
} from 'react-native';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(AN-3).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

const AnnouncementBannerView = () => {
  const router = useRouter();
  const manager = app.getAnnouncementManager();

  // 매니저 미초기화 또는 표시 조건 미충족이면 렌더하지 않는다(AN-2).
  if (!manager || !manager.shouldShow()) {
    return null;
  }

  const message = manager.getMessage();
  const link = manager.getLink();

  const handlePressBanner = () => {
    if (!link) {
      return;
    }

    // 내부 경로는 라우터로, http(s)는 외부 브라우저로. 그 외 형식은 무시한다(크래시 금지).
    if (link.startsWith('/')) {
      router.push(link as never);

      return;
    }

    if (EXTERNAL_LINK_PATTERN.test(link)) {
      void Linking.openURL(link).catch(() => undefined);
    }
  };

  const handlePressClose = () => {
    void manager.dismiss();
  };

  const closeButton = (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handlePressClose}
      accessibilityRole='button'
      accessibilityLabel='공지 닫기'
    >
      <PretendardText weight='medium' style={styles.closeIcon}>
        ✕
      </PretendardText>
    </TouchableOpacity>
  );

  const messageText = (
    <PretendardText
      weight='medium'
      style={styles.message}
      numberOfLines={2}
      ellipsizeMode='tail'
    >
      {message}
    </PretendardText>
  );

  // 링크가 있으면 배너 전체가 탭 가능하다. 없으면 닫기 버튼만 동작한다(AN-3).
  if (link) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={handlePressBanner}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel={message}
      >
        {messageText}
        {closeButton}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {messageText}
      {closeButton}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.surfaceMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.borderLight,
    borderRadius: Radius.card,
    paddingLeft: Spacing.item,
    paddingVertical: Spacing.item,
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.item,
  } as ViewStyle,
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Color.textPrimary,
  },
  // 44×44 터치 타깃(HIG). 아이콘 자체는 작아도 탭 영역을 넉넉히 잡는다.
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  closeIcon: {
    fontSize: 16,
    color: Color.textSecondary,
  },
});

export default observer(AnnouncementBannerView);
