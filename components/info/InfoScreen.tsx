import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import InfoProfileCardView from '@/components/info/InfoProfileCardView';
import InfoMenuCardView from '@/components/info/InfoMenuCardView';
import InfoNicknameEditView from '@/components/info/InfoNicknameEditView';
import InfoFooterView from '@/components/info/InfoFooterView';
import app from '@/model/app/App';
import InfoStats from '@/model/info/InfoStats';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  infoStats: InfoStats;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

/**
 * AU-4 내 정보 탭 (Liquid Depth).
 *
 * 위에서 아래로 **정체 → 설정 → 떠남 → 사실**의 순서다(목업 §11): 프로필 유리 카드(정체와
 * 지표) → 메뉴 흰 카드 네 줄 → 가라앉은 `로그아웃` 카드 → 지면 위 푸터.
 * 화면 타이틀은 로그인 여부와 무관하게 `내 정보`로 고정한다 — 닉네임은 프로필 카드의 값이다.
 */
const InfoScreen: FC<Props> = ({ infoStats }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editedNickname, setEditedNickname] = useState('');
  const firebase = app.getFirebase();
  const isLoggedIn = firebase.isLoggedIn();
  const nickname = firebase.getNickname();
  const logInAlertManager = app.getLogInAlertManager();

  useFocusEffect(
    useCallback(() => {
      infoStats.load();
    }, [infoStats])
  );

  // 로그인 상태 reaction을 들고 있으므로 언마운트 시 정리한다.
  useEffect(() => {
    return () => {
      infoStats.dispose();
    };
  }, [infoStats]);

  const handleLogout = async () => {
    app.getAnalyticsManager()?.logClick('logout');
    await firebase.logout();
  };

  const handleLogin = () => {
    logInAlertManager?.show();
  };

  const handleOpenKakao = () => {
    app.getAnalyticsManager()?.logClick('info_contact');
    Linking.openURL('http://pf.kakao.com/_VJwSn');
  };

  const handleOpenNotificationSettings = () => {
    router.push('/info/notification');
  };

  const handleOpenPrivacyPolicy = () => {
    router.push('/info/policy?tab=privacy');
  };

  const handleOpenTerms = () => {
    router.push('/info/policy?tab=terms');
  };

  const handleEditNickname = () => {
    setEditedNickname(nickname || '');
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (editedNickname.trim() === '') {
      setIsEditingNickname(false);

      return;
    }

    if (editedNickname === nickname) {
      setIsEditingNickname(false);

      return;
    }

    try {
      await firebase.updateNickname(editedNickname.trim());
      setIsEditingNickname(false);
    } catch (error) {
      console.error('Failed to update nickname:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingNickname(false);
    setEditedNickname('');
  };

  const renderIdentity = () => {
    if (isLoggedIn) {
      return (
        <InfoProfileCardView
          nickname={nickname || ''}
          provider={firebase.getLoginProvider()}
          summary={infoStats.getSummary()}
          onPressEdit={handleEditNickname}
        />
      );
    }

    /**
     * 미로그인 상태의 `로그인`은 이 화면의 **주 액션**이라 프로필 카드 자리를 그대로 받는다
     * (AU-4). 아래 메뉴 카드와 같은 목록 행으로 두면 가장 먼저 할 일이 목록에 묻힌다.
     */
    return (
      <LiquidCard tone='glass' radius='hero' padding={LiquidLayout.cardPadLg}>
        <PretendardText weight='bold' style={styles.signedOutTitle}>
          로그인하면 창고와 배낭이 따라와요
        </PretendardText>
        <PretendardText style={styles.signedOutSubtitle}>
          다음 여행 준비도 이어서 볼 수 있어요
        </PretendardText>
        <LiquidPillButton
          label='로그인'
          variant='primary'
          block
          onPress={handleLogin}
          style={styles.signedOutButton}
        />
      </LiquidCard>
    );
  };

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={LiquidLayout.screenH}
      background={<LiquidBackdrop screen='info' glowPosition='topLeft' />}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PretendardText weight='bold' style={styles.title}>
          내 정보
        </PretendardText>

        <View style={styles.identity}>{renderIdentity()}</View>

        <View style={styles.menu}>
          <InfoMenuCardView
            onPressNotification={handleOpenNotificationSettings}
            onPressContact={handleOpenKakao}
            onPressPrivacy={handleOpenPrivacyPolicy}
            onPressTerms={handleOpenTerms}
          />
        </View>

        {/* `로그아웃`은 메뉴 카드에서 떼어 가라앉은 면으로 둔다(AU-4) — 빨강이 아니다.
            사용 빈도가 가장 낮고 되돌리려면 다시 로그인해야 하는 액션이라 목록 아래,
            한 단계 낮은 면에 놓는다. */}
        {isLoggedIn ? (
          <TouchableOpacity
            style={styles.logoutCard}
            onPress={handleLogout}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='로그아웃'
          >
            <Ionicons
              name='log-out-outline'
              size={20}
              color={Liquid.inkMuted}
              accessible={false}
            />
            <PretendardText weight='medium' style={styles.logoutLabel}>
              로그아웃
            </PretendardText>
          </TouchableOpacity>
        ) : null}

        {/* 푸터는 스크롤 안 마지막에 둔다. 밖에 고정하면 남는 높이를 면이 다 채워
            플로팅 탭바 뒤까지 빈 덩어리가 생겼다(2026-08-03 실기기 확인). */}
        <InfoFooterView isLoggedIn={isLoggedIn} />

        <View
          style={{
            // 플로팅 탭바 아래로 콘텐츠가 흐르므로 130을 비운다(핸드오프 레이아웃).
            height: Platform.select({
              ios: insets.bottom + LiquidLayout.scrollBottom,
              default: LiquidLayout.scrollBottom,
            }),
          }}
        />
      </ScrollView>

      <InfoNicknameEditView
        visible={isEditingNickname}
        hasNickname={!!nickname}
        value={editedNickname}
        onChangeValue={setEditedNickname}
        onCancel={handleCancelEdit}
        onSubmit={handleSaveNickname}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    paddingTop: 18,
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  identity: {
    marginTop: 18,
  },
  menu: {
    marginTop: 16,
  },
  signedOutTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
  },
  signedOutSubtitle: {
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
  },
  signedOutButton: {
    marginTop: 16,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: LiquidLayout.cardPad,
    minHeight: LiquidLayout.touchMin,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surfaceQuiet,
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 15,
    color: Liquid.inkTertiary,
  },
});

export default observer(InfoScreen);
