import { FC } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { observer } from 'mobx-react-lite';
import SingleAdSlot from '@/model/ads/SingleAdSlot';
import CommunityAdCardView from './CommunityAdCardView';

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
const SingleAdSlotView: FC<Props> = ({ slot, enabled, style }) => {
  const nativeAd = slot.getAd();

  if (!enabled || !nativeAd) {
    return null;
  }

  return (
    <View style={style}>
      <CommunityAdCardView nativeAd={nativeAd} />
    </View>
  );
};

export default observer(SingleAdSlotView);
