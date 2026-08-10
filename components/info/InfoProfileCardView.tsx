import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidStatTile from '@/components/liquid/LiquidStatTile';
import { HomeRecordSummary } from '@/model/home/HomeRecordSummary';
import { Liquid, LiquidLayout, LiquidMotion } from '@/constants/DesignTokens';

/**
 * `Firebase.getLoginProvider()`가 돌려주는 집합 그대로다.
 *
 * 컨벤션대로면 string enum이어야 하지만, `Firebase`가 이 값을 문자열 리터럴로 읽고 쓰는
 * 자리(재인증 분기)가 여럿이라 표시부만 enum으로 바꾸면 비교마다 캐스팅이 붙는다.
 * enum 전환은 인증 경로를 함께 손볼 때 한다.
 */
type LoginProvider = 'google' | 'apple' | 'email';

interface Props {
  nickname: string;
  /** `Firebase.getLoginProvider()` 값 — 표시 문구는 이 뷰가 정한다 */
  provider: LoginProvider | null;
  /** 아직 도착하지 않았으면 null — 타일은 자리를 지키고 숫자만 셔머가 된다 */
  summary: HomeRecordSummary | null;
  onPressEdit: () => void;
}

const PROVIDER_LABEL: Record<LoginProvider, string> = {
  google: 'Google 로그인',
  apple: 'Apple 로그인',
  email: '이메일 로그인',
};

// 아바타 한 변. 이니셜 한 글자를 담는 최소 크기이자 목업 §11의 값이다.
const AVATAR_SIZE = 48;

/**
 * AU-4 프로필 카드 (Liquid Depth).
 *
 * **정체와 지표를 한 카드에 합쳤다**(목업 §11) — 예전에는 닉네임 행이 타이틀 아래에 홀로
 * 놓였고 지표는 아예 없었다. 내 정보는 "내가 누구이고 무엇을 얼마나 갖고 있나"를 한 번에
 * 말하는 자리라, 정체 한 줄과 지표 세 개가 같은 면 위에 있어야 한 덩어리로 읽힌다.
 *
 * 카드 전체가 아니라 **정체 행만** 누를 수 있다 — 지표 타일은 다음 걸음이 없어 표시로 족하다.
 */
const InfoProfileCardView: FC<Props> = ({
  nickname,
  provider,
  summary,
  onPressEdit,
}) => {
  const isLoading = summary === null;
  const hasNickname = nickname.length > 0;
  const providerLabel = provider ? PROVIDER_LABEL[provider] : '';

  return (
    <LiquidCard tone='glass' radius='hero' padding={LiquidLayout.cardPadLg}>
      <TouchableOpacity
        style={styles.identityRow}
        onPress={onPressEdit}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={hasNickname ? '닉네임 수정' : '닉네임 설정'}
      >
        {/* 이 화면의 라임 면은 아바타 하나뿐이다(핸드오프: 화면당 라임 면 1개). */}
        <View style={styles.avatar}>
          {hasNickname ? (
            <PretendardText weight='bold' style={styles.avatarInitial}>
              {nickname.slice(0, 1)}
            </PretendardText>
          ) : (
            <Ionicons name='person' size={22} color={Liquid.limeOn} />
          )}
        </View>

        <View style={styles.identityText}>
          <PretendardText
            weight='bold'
            style={styles.nickname}
            numberOfLines={1}
          >
            {hasNickname ? nickname : '닉네임 설정하기'}
          </PretendardText>
          {providerLabel ? (
            <PretendardText style={styles.provider} numberOfLines={1}>
              {providerLabel}
            </PretendardText>
          ) : null}
        </View>

        {/* 행 전체에 라벨이 붙어 있으므로 아이콘은 접근성 트리에서 뺀다. */}
        <Ionicons
          name='create-outline'
          size={20}
          color={Liquid.inkMuted}
          accessible={false}
        />
      </TouchableOpacity>

      <View style={styles.tileRow}>
        <LiquidStatTile
          tone='sunken'
          size='sm'
          loading={isLoading}
          value={summary ? summary.gearCount : 0}
          label='장비'
        />
        <LiquidStatTile
          tone='sunken'
          size='sm'
          loading={isLoading}
          value={summary ? summary.bagCount : 0}
          label='여행'
        />
        {/* 셋 중 이 하나만 덜어낼 후보라 라임 계열 잉크로 세운다(홈 HM-7과 같은 처리). */}
        <LiquidStatTile
          tone='sunken'
          size='sm'
          highlight
          loading={isLoading}
          value={summary ? summary.unusedCount : 0}
          label='안 쓴 장비'
        />
      </View>
    </LiquidCard>
  );
};

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 아바타가 48이라 44 터치 타깃은 이미 넘지만, 명시해 Dynamic Type에서도 유지한다.
    minHeight: LiquidLayout.touchMin,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Liquid.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 19,
    color: Liquid.limeOn,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nickname: {
    fontSize: 18,
    color: Liquid.ink,
  },
  provider: {
    fontSize: 12.5,
    color: Liquid.inkTertiary,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
});

export default InfoProfileCardView;
