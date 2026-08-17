import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

const DeleteInfoView = () => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (isDeleting) return;

    Alert.alert(
      '회원 탈퇴',
      '정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.\n\n본인 확인을 위해 재로그인 후 탈퇴합니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '확인',
          style: 'destructive',
          onPress: async () => {
            app.getAnalyticsManager()?.logClick('withdraw');
            setIsDeleting(true);

            try {
              await app.getFirebase().deleteUserAccount();
              Alert.alert('회원 탈퇴 완료', '회원 탈퇴가 완료되었습니다.', [
                {
                  text: '확인',
                  onPress: () => {
                    router.replace('/');
                  },
                },
              ]);
            } catch (error: any) {
              console.error('회원 탈퇴 실패:', error);
              let errorMessage =
                '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.';

              if (
                error?.code === 'auth/popup-closed-by-user' ||
                error?.code === '12501'
              ) {
                errorMessage =
                  '재인증이 취소되었습니다. 회원 탈퇴를 진행하려면 재인증이 필요합니다.';
              }

              Alert.alert('회원 탈퇴 실패', errorMessage);
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
            회원 탈퇴
          </PretendardText>
        </View>

        <View style={styles.warningContainer}>
          <View style={styles.warningContent}>
            <PretendardText weight='bold' style={styles.warningTitle}>
              ⚠️ 주의사항
            </PretendardText>
            <PretendardText style={styles.warningMainText}>
              회원 탈퇴 시 모든 데이터가 삭제됩니다.
            </PretendardText>
            <PretendardText style={styles.warningBullet}>
              • 저장된 모든 배낭 정보
            </PretendardText>
            <PretendardText style={styles.warningBullet}>
              • 저장된 모든 장비 정보
            </PretendardText>
            <PretendardText style={styles.warningBullet}>
              • 개인 설정 및 기록
            </PretendardText>
            <PretendardText style={styles.warningFooter}>
              삭제된 데이터는 복구할 수 없습니다.
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
            취소
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
            {isDeleting ? '처리중...' : '확인'}
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

export default DeleteInfoView;
