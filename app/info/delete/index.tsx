import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdropView from '@/components/liquid/LiquidBackdrop';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidBackdrop,
  LiquidLayout,
  LiquidRadius,
  LiquidSemantic,
  LiquidType,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';

const DeleteInfoView = () => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (isDeleting) {
      return;
    }

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
    <Layout
      // 하단 고정 버튼 줄이 절대 배치라 좌우 여백은 화면이 블록마다 직접 준다
      // (장비 상세와 같은 구조) — 컨테이너 패딩에 기대면 절대 자식이 그 안에 드는지가
      // 레이아웃 엔진 동작에 달린다.
      paddingHorizontal={0}
      background={<LiquidBackdropView screen='none' glowPosition='topRight' />}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PretendardText weight='bold' style={styles.title}>
          회원 탈퇴
        </PretendardText>

        {/* 되돌릴 수 없는 액션이라 경고 면(의미색) 위에 올린다 — 흰 카드로 두면
            다른 안내 화면과 구분되지 않는다. 아이콘만 `warnInk`, 문장은 대비를 지킨
            `warnInkStrong`이다(박지 상세 경고 배너와 같은 처리). */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons
              name='alert-circle'
              size={20}
              color={LiquidSemantic.warnInk}
              accessible={false}
            />
            <PretendardText weight='bold' style={styles.warningTitle}>
              주의사항
            </PretendardText>
          </View>
          <PretendardText weight='semibold' style={styles.warningMainText}>
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
      </ScrollView>

      {/* 지면색 그라디언트가 콘텐츠와 버튼 사이를 끊는다 — 불투명 띠를 두면 버튼 주위에
          각진 면이 생겨 카드가 그 뒤에서 잘려 보인다. */}
      <View style={styles.buttonContainer} pointerEvents='box-none'>
        <LinearGradient
          colors={LiquidBackdrop.ctaVeil.colors}
          locations={LiquidBackdrop.ctaVeil.locations}
          style={StyleSheet.absoluteFill}
          pointerEvents='none'
        />
        <LiquidPillButton
          label='취소'
          variant='secondary'
          onPress={handleCancel}
          style={styles.button}
        />
        <LiquidPillButton
          label={isDeleting ? '처리중...' : '확인'}
          variant='danger'
          onPress={handleConfirm}
          disabled={isDeleting}
          busy={isDeleting}
          style={styles.button}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  // 하단 고정 버튼 줄(알약 54 + 여백) 뒤로 콘텐츠가 숨지 않게 비운다.
  scrollContent: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: 110,
  },
  title: {
    paddingTop: 18,
    paddingBottom: 18,
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  warningCard: {
    padding: LiquidLayout.cardPadLg,
    gap: 6,
    borderRadius: LiquidRadius.card,
    backgroundColor: LiquidSemantic.warnBg,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  warningTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: LiquidSemantic.warnInkStrong,
  },
  warningMainText: {
    fontSize: 15,
    lineHeight: 22,
    color: LiquidSemantic.warnInkStrong,
    marginBottom: 4,
  },
  warningBullet: {
    fontSize: 15,
    lineHeight: 22,
    color: LiquidSemantic.warnInkStrong,
  },
  warningFooter: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 19,
    color: LiquidSemantic.warnInk,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: LiquidLayout.screenH,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 768,
    marginHorizontal: 'auto',
  },
  button: {
    flex: 1,
  },
});

export default DeleteInfoView;
