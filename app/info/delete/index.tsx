import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
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
          <Text style={styles.title}>회원 탈퇴</Text>
        </View>

        <View style={styles.warningContainer}>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>⚠️ 주의사항</Text>
            <Text style={styles.warningMainText}>
              회원 탈퇴 시 모든 데이터가 삭제됩니다.
            </Text>
            <Text style={styles.warningBullet}>• 저장된 모든 배낭 정보</Text>
            <Text style={styles.warningBullet}>• 저장된 모든 장비 정보</Text>
            <Text style={styles.warningBullet}>• 개인 설정 및 기록</Text>
            <Text style={styles.warningFooter}>
              삭제된 데이터는 복구할 수 없습니다.
            </Text>
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
          <Text style={styles.cancelButtonText}>취소</Text>
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
          <Text style={styles.confirmButtonText}>
            {isDeleting ? '처리중...' : '확인'}
          </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  warningContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 24,
  },
  warningContent: {
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  warningMainText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  warningBullet: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  warningFooter: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 12,
    maxWidth: 768,
    marginHorizontal: 'auto',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonPressed: {
    backgroundColor: '#f7f7f7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonPressed: {
    backgroundColor: '#c0392b',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DeleteInfoView;
