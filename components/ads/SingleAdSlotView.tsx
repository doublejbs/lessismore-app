import { FC } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import SingleAdSlot from '@/model/ads/SingleAdSlot';
import app from '@/model/app/App';
import { openSubscription } from '@/model/subscription/OpenSubscription';
import SubscriptionEntryPoint from '@/model/subscription/SubscriptionEntryPoint';
import CommunityAdCardView from './CommunityAdCardView';

// HIG 44pt 터치 타깃. 글자 한 줄(메타 18)보다 커서 세로로 가운데 둔다 — 고정 높이가 아니라 최소 높이라
// Dynamic Type으로 글자가 커지면 따라 자란다.
const LINK_MIN_HEIGHT = 44;

// 글자 링크 셰브론 — 장비 상세 리뷰 링크(`WarehouseDetailReviewSectionView`, 잉크 14)와 같은 크기.
const LINK_CHEVRON_SIZE = 14;

// 라벨과 셰브론 사이 틈. 맞는 간격 토큰이 없다.
const LINK_CHEVRON_GAP = 2;

interface Props {
  // 화면이 `useSingleAdSlotState`로 한 번 만든 자리. 화면 안에서 분기(로그인 여부·스켈레톤)가 바뀌어도
  // 같은 자리를 넘겨 광고를 다시 요청하지 않는다.
  slot: SingleAdSlot;
  // 광고를 두지 않는 쓰임(AD-1)이면 받은 광고가 해제되기 전이라도 바로 접는다.
  enabled: boolean;
  // 광고가 있을 때만 두르는 바깥 여백 — 광고가 없으면 자리째 접혀 여백도 남지 않는다.
  style?: StyleProp<ViewStyle>;
}

// AD-1·AD-2: 스크롤 맨 끝 한 장짜리 광고 자리(장비 상세·홈). 커뮤니티 게시글 카드 문법
// (`CommunityAdCardView`)으로 그린다. 받기 전·받지 못하면 아무것도 그리지 않는다(AD-1 자리 접기).
// SUB-9: 광고 카드 바로 아래, **광고 뷰 바깥**에 `광고 없이 보기` 글자 링크를 둔다 — 광고 요소와 겹치거나
// 광고 클릭으로 오인되지 않게(AdMob 정책). 구독 기능이 켜져 있고 미구독일 때만.
const SingleAdSlotView: FC<Props> = ({ slot, enabled, style }) => {
  const nativeAd = slot.getAd();
  const subscriptionStore = app.getSubscriptionStore();
  const l10n = app.getL10n();
  const isSubscriptionLinkVisible =
    subscriptionStore.isAvailable() && !subscriptionStore.isSubscribed();

  const handleOpenSubscription = () => {
    openSubscription(SubscriptionEntryPoint.AdCard);
  };

  if (!enabled || !nativeAd) {
    return null;
  }

  const linkLabel = l10n.t('subscription.adCardLink');

  return (
    <View style={style}>
      <CommunityAdCardView nativeAd={nativeAd} />

      {isSubscriptionLinkVisible ? (
        <TouchableOpacity
          style={styles.link}
          onPress={handleOpenSubscription}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={linkLabel}
        >
          <PretendardText style={styles.linkText}>{linkLabel}</PretendardText>
          <Ionicons
            name='chevron-forward'
            size={LINK_CHEVRON_SIZE}
            color={Acg.ink}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 오른쪽 정렬 한 줄. 터치 영역은 글자 폭 + 44pt 높이다(행 전체가 아니다 — 광고 카드와 붙은 넓은 면이
  // 광고 클릭으로 읽히지 않게).
  link: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: LINK_CHEVRON_GAP,
    minHeight: LINK_MIN_HEIGHT,
  },
  linkText: {
    ...AcgType.meta,
    color: Acg.ink,
  },
});

export default observer(SingleAdSlotView);
