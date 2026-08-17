import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';

// 자격 증명 문제와 그 밖의 실패를 가른다(AU-5·AU-10). 재인증을 통과한 뒤의 실패
// (데이터·계정 삭제)까지 비밀번호 문구로 안내하면 맞는 비밀번호를 틀렸다고 말하게 된다.
const CREDENTIAL_ERROR_CODES = new Set([
  'auth/wrong-password',
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
]);

const getDeleteFailureMessage = (code?: string) => {
  if (code === 'auth/too-many-requests') {
    return '시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }

  if (code && CREDENTIAL_ERROR_CODES.has(code)) {
    return '비밀번호가 올바르지 않습니다.';
  }

  return '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.';
};

const DeletePasswordView = () => {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const email = app.getFirebase().getCurrentUserEmail();
  const canDelete = password.trim().length > 0 && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await app.getFirebase().deleteUserAccountWithEmail(password);
      Alert.alert('회원 탈퇴 완료', '회원 탈퇴가 완료되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            router.replace('/');
          },
        },
      ]);
    } catch (error: any) {
      console.error('이메일 회원 탈퇴 실패:', error);
      // 자격 증명 문제만 비밀번호 문구를 쓴다(AU-5·AU-10). 재인증을 통과한 뒤의 실패
      // (데이터·계정 삭제)까지 "비밀번호가 틀렸다"고 하면 맞는 비밀번호를 틀렸다고 안내하게 된다.
      const message = getDeleteFailureMessage(error?.code);
      Alert.alert('회원 탈퇴 실패', message);
      setIsDeleting(false);
    }
  };

  return (
    <Layout
      paddingHorizontal={0}
      edges={['top', 'right', 'left', 'bottom']}
    >
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={styles.content}
      >
        <PretendardText weight='bold' style={styles.title}>
          비밀번호 확인
        </PretendardText>
        <PretendardText style={styles.description}>
          탈퇴를 위해 비밀번호를 다시 입력해주세요.
        </PretendardText>
        <PretendardText style={styles.email}>{email}</PretendardText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder='비밀번호'
          secureTextEntry
          autoFocus
          textContentType='password'
          autoComplete='password'
          editable={!isDeleting}
        />
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            !canDelete && styles.deleteButtonDisabled,
            pressed && canDelete && styles.deleteButtonPressed,
          ]}
          onPress={handleDelete}
          disabled={!canDelete}
          accessibilityRole='button'
          accessibilityLabel='탈퇴하기'
          accessibilityState={{ disabled: !canDelete }}
        >
          <PretendardText weight='bold' style={styles.deleteButtonText}>
            {isDeleting ? '처리중...' : '탈퇴하기'}
          </PretendardText>
        </Pressable>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screenH,
    gap: 16,
  },
  title: {
    ...AcgType.screenTitle,
  },
  description: {
    ...AcgType.body,
    color: Color.textSecondary,
  },
  email: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
    paddingVertical: 12,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    color: Color.textPrimary,
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    fontFamily: 'Pretendard-Regular',
  },
  deleteButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Color.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: Color.surfaceMuted,
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default DeletePasswordView;
