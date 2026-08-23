import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';

const DeleteInfoView = () => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const l10n = app.getL10n();

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (isDeleting) return;

    Alert.alert(
      l10n.t('info.deleteAccount.title'),
      l10n.t('info.deleteAccount.confirmMessage'),
      [
        {
          text: l10n.t('common.cancel'),
          style: 'cancel',
        },
        {
          text: l10n.t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            app.getAnalyticsManager()?.logClick('withdraw');
            setIsDeleting(true);

            try {
              await app.getFirebase().deleteUserAccount();
              Alert.alert(
                l10n.t('info.deleteAccount.completedTitle'),
                l10n.t('info.deleteAccount.completedMessage'),
                [
                  {
                    text: l10n.t('common.confirm'),
                    onPress: () => {
                      router.replace('/');
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('회원 탈퇴 실패:', error); // l10n-ignore console 개발자 로그
              let errorMessage = l10n.t('info.deleteAccount.failedMessage');

              if (
                error?.code === 'auth/popup-closed-by-user' ||
                error?.code === '12501'
              ) {
                errorMessage = l10n.t(
                  'info.deleteAccount.reauthCancelledMessage'
                );
              }

              Alert.alert(
                l10n.t('info.deleteAccount.failedTitle'),
                errorMessage
              );
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Layout>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleContainer}>
          <PretendardText weight='bold' style={styles.title}>
            {l10n.t('info.deleteAccount.title')}
          </PretendardText>
        </View>

        <View style={styles.warningContainer}>
          <View style={styles.warningContent}>
            <PretendardText weight='bold' style={styles.warningTitle}>
              {l10n.t('info.deleteAccount.warningTitle')}
            </PretendardText>
            <PretendardText style={styles.warningMainText}>
              {l10n.t('info.deleteAccount.warningMain')}
            </PretendardText>
            <PretendardText style={styles.warningBullet}>
              • {l10n.t('info.deleteAccount.bags')}
            </PretendardText>
            <PretendardText style={styles.warningBullet}>
              • {l10n.t('info.deleteAccount.gears')}
            </PretendardText>
            <PretendardText style={styles.warningBullet}>
              • {l10n.t('info.deleteAccount.settings')}
            </PretendardText>
            <PretendardText style={styles.warningFooter}>
              {l10n.t('info.deleteAccount.warningFooter')}
            </PretendardText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
        >
          <PretendardText weight='bold' style={styles.cancelButtonText}>
            {l10n.t('common.cancel')}
          </PretendardText>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          disabled={isDeleting}
          style={({ pressed }) => [
            styles.button,
            styles.confirmButton,
            isDeleting && styles.confirmButtonDisabled,
            pressed && !isDeleting && styles.confirmButtonPressed,
          ]}
        >
          <PretendardText weight='bold' style={styles.confirmButtonText}>
            {isDeleting
              ? l10n.t('common.processing')
              : l10n.t('common.confirm')}
          </PretendardText>
        </Pressable>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  titleContainer: {
    paddingVertical: 24,
  },
  title: {
    ...AcgType.screenTitle,
  },
  warningContainer: {
    padding: 24,
    backgroundColor: Color.background,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Color.borderLight,
    marginBottom: 24,
  },
  warningContent: {
    gap: 8,
  },
  warningTitle: {
    ...AcgType.rowTitle,
    color: '#e74c3c',
    marginBottom: 8,
  },
  warningMainText: {
    ...AcgType.rowTitle,
    // 여러 줄 경고 문단 — 줄간 여유(HM-8 예외 ②)
    lineHeight: 24,
    color: Color.textPrimary,
    marginBottom: 8,
  },
  warningBullet: {
    ...AcgType.rowTitle,
    // 여러 줄 경고 문단 — 줄간 여유(HM-8 예외 ②)
    lineHeight: 24,
    color: Color.textTertiary,
  },
  warningFooter: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    marginTop: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Color.background,
    flexDirection: 'row',
    gap: 12,
    maxWidth: 768,
    marginHorizontal: 'auto',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Color.background,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  cancelButtonPressed: {
    backgroundColor: Color.surfaceMuted,
  },
  cancelButtonText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  confirmButtonDisabled: {
    backgroundColor: Color.textSecondary,
  },
  confirmButtonPressed: {
    backgroundColor: '#c0392b',
  },
  confirmButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default observer(DeleteInfoView);
