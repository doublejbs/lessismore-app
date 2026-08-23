import { FC, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  bagDetail: BagDetail;
}

// 배낭 공유 formSheet 내용(BD-1) — 배낭 생성/복사/정보수정 시트와 동일한 UI 언어.
// 그래버·키보드 회피·라운드 코너는 네이티브 formSheet(OS)가 처리한다.
const BagShareContent: FC<Props> = ({ bagDetail }) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const shared = bagDetail.isShared();
  const url = bagDetail.getUrl();

  const handleShare = async () => {
    setIsLoading(true);

    try {
      if (shared) {
        await bagDetail.unshare();
        Alert.alert(app.getL10n().t('common.alert'), app.getL10n().t('bagShare.cancelled'));
      } else {
        await bagDetail.share();

        try {
          await Clipboard.setStringAsync(url);
          Alert.alert(app.getL10n().t('bagShare.success'), app.getL10n().t('bagShare.linkCopied'));
        } catch {
          Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('bagShare.copyFailed'));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert(app.getL10n().t('bagShare.success'), app.getL10n().t('bagShare.copied'));
    } catch (error) {
      console.error('복사 실패:', error); // l10n-ignore
      Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('bagShare.copyFailedShort'));
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom - 12, 12) },
      ]}
    >
      <View style={styles.body}>
        <PretendardText weight='bold' style={styles.title}>
          {shared ? app.getL10n().t('bagShare.sharing') : app.getL10n().t('bagShare.share')}
        </PretendardText>
        <PretendardText style={styles.description}>
          {shared
            ? app.getL10n().t('bagShare.sharedDescription')
            : app.getL10n().t('bagShare.description')}
        </PretendardText>

        {shared && (
          <View style={styles.urlContainer}>
            <PretendardText style={styles.urlText} numberOfLines={2}>
              {url}
            </PretendardText>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyLink}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole='button'
              accessibilityLabel={app.getL10n().t('bagShare.copyLink')}
            >
              <Ionicons
                name='copy-outline'
                size={18}
                color={Color.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
          onPress={handleShare}
          disabled={isLoading}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={shared ? app.getL10n().t('bagShare.cancelShare') : app.getL10n().t('bagShare.shareAction')}
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            {isLoading ? app.getL10n().t('bagShare.processing') : shared ? app.getL10n().t('bagShare.cancelShare') : app.getL10n().t('bagShare.shareAction')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다.
    paddingTop: 52,
  },
  body: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    ...AcgType.screenTitle,
    color: Color.textPrimary,
    marginBottom: 8,
  },
  description: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    marginBottom: 20,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  urlText: {
    flex: 1,
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
  },
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  mainButton: {
    minHeight: 52,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default observer(BagShareContent);
