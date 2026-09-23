import { FC } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { formatRouteDistance } from '@/model/route/RouteFormat';
import tileStyles from './BagDetailActionTileStyles';

interface Props {
  bagDetail: BagDetail;
}

const IS_WEB = Platform.OS === 'web';

/**
 * 배낭 상세의 코스 타일 (BD-10 · BD-11). 액션 그리드에서 **운동 기록 타일과 나란히** 둔다 —
 * 둘 다 지도를 보여주지만 성격이 반대다(코스는 갈 곳, 운동 기록은 다녀온 것). 떨어뜨려 놓으면
 * 둘 다 "지도 나오는 그것"이 되므로 붙여 두고 라벨로 가른다.
 */
const BagDetailRouteView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const count = bagDetail.getRouteCount();

  // 웹은 파일 선택이 없어 코스를 올릴 수 없다 — 볼 것이 하나도 없으면 진입점 자체를
  // 그리지 않는다(APP-5, BD-11). 네이티브는 비어 있어도 `GPX 추가`로 남긴다.
  if (IS_WEB && count === 0) {
    return null;
  }

  const handlePress = () => {
    router.push(`/bag/${bagDetail.getId()}/route`);
  };

  const subtitle =
    count === 0
      ? l10n.t('bag.route.tileEmpty')
      : [
          l10n.t('bag.route.count', { count }),
          formatRouteDistance(bagDetail.getRouteDistance()),
        ].join(l10n.t('common.metaSeparator'));

  return (
    <TouchableOpacity
      style={tileStyles.tile}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={l10n.t('bag.route.tileLabel', { subtitle })}
    >
      <Ionicons name='trail-sign-outline' size={24} color={Color.textPrimary} />
      <View style={tileStyles.textWrap}>
        <PretendardText
          style={tileStyles.title}
          weight='semibold'
          numberOfLines={1}
        >
          {l10n.t('bag.route.title')}
        </PretendardText>
        <PretendardText style={tileStyles.subtitle} numberOfLines={1}>
          {subtitle}
        </PretendardText>
      </View>
    </TouchableOpacity>
  );
};


export default observer(BagDetailRouteView);
