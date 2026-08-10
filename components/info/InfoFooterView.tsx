import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidFont, LiquidMotion } from '@/constants/DesignTokens';

// 한 줄 푸터 링크의 44pt 터치 타깃 확보용 여유. 11.5px 한 줄(≈15)이라 (44 − 15) / 2 = 15다.
const LINK_HIT_SLOP = { top: 15, bottom: 15, left: 12, right: 12 };

interface Props {
  isLoggedIn: boolean;
}

/**
 * AU-4 정보 탭 푸터 (Liquid Depth).
 *
 * 가운데 정렬 세 줄이다(목업 §11): 배지 두 개 → `VERSION {n} · 사업자 정보` → `탈퇴하기`.
 * 면을 깔지 않는다 — 지면(지형 배경)이 그대로 비쳐야 위 메뉴 카드와 위계가 갈린다.
 */
const InfoFooterView: FC<Props> = ({ isLoggedIn }) => {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleOpenBusinessInfo = () => {
    router.push('/info/business');
  };

  const handleOpenDeleteAccount = () => {
    router.push('/info/delete');
  };

  return (
    <View style={styles.container}>
      {/* 장식용 배지다 — 스크린 리더가 읽을 내용이 없으므로 접근성 트리에서 제외한다. */}
      <View
        style={styles.badgeRow}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
      >
        <Image
          source={require('@/assets/images/internet.png')}
          style={styles.badge}
          resizeMode='contain'
          accessible={false}
        />
        <Image
          source={require('@/assets/images/magma.png')}
          style={styles.badge}
          resizeMode='contain'
          accessible={false}
        />
      </View>

      <View style={styles.metaRow}>
        {/* 버전은 라틴·숫자라 콘덴스드를 쓴다(한글 글리프가 없어 다른 문구에는 못 쓴다). */}
        <PretendardText style={styles.version}>
          VERSION {appVersion}
        </PretendardText>
        <View style={styles.metaDot} />
        <TouchableOpacity
          onPress={handleOpenBusinessInfo}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='사업자 정보'
          hitSlop={LINK_HIT_SLOP}
        >
          <PretendardText style={styles.metaLink}>사업자 정보</PretendardText>
        </TouchableOpacity>
      </View>

      {isLoggedIn ? (
        <TouchableOpacity
          onPress={handleOpenDeleteAccount}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='탈퇴하기'
          hitSlop={LINK_HIT_SLOP}
        >
          <PretendardText style={styles.deleteAccount}>탈퇴하기</PretendardText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    // 마지막 카드와 붙지 않게 띄운다. 아래 여백은 스크롤 컨테이너가 낸다.
    marginTop: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  // 정체를 알기 어려운 장식 배지라 크게 둘 이유가 없다(목업 §11: 40px · 투명도 0.75).
  badge: {
    width: 40,
    height: 40,
    opacity: 0.75,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /**
   * 목업의 `#9A9AA2`(≈2.9:1)·`inkSubtle`(≈2.2:1)은 11.5px에서 AA(4.5:1)에 못 미쳐 한 단계
   * 올렸다(창고 알림 칩 WH-2-1과 같은 처리). 위계는 색이 아니라 서체·밑줄이 낸다.
   */
  version: {
    fontFamily: LiquidFont.condensed,
    fontSize: 11.5,
    letterSpacing: 0.69,
    color: Liquid.inkTertiary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Liquid.inkSubtle,
  },
  metaLink: {
    fontSize: 11.5,
    color: Liquid.inkTertiary,
  },
  deleteAccount: {
    fontSize: 11.5,
    color: Liquid.inkTertiary,
    textDecorationLine: 'underline',
  },
});

export default InfoFooterView;
