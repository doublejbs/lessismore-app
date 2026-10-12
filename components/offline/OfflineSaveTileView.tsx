import { FC } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import tileStyles from '@/components/bag-detail/BagDetailActionTileStyles';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import OfflineTrip from '@/model/offline/OfflineTrip';

interface Props {
  offlineTrip: OfflineTrip;
}

/**
 * 배낭 상세 액션 그리드의 `오프라인` 타일 (BD-10 · OF-2). 그리드 규칙(연회색 면·아이콘 + 제목 + 부제)을
 * 그대로 따른다. 구독이 아니어도 자물쇠·유료 배지를 달지 않는다 — 탭했을 때 게이트(SUB-11)가 설명한다
 * (HM-8 행 안 배지 금지). 웹·옛 바이너리에서는 그리지 않는다.
 */
const OfflineSaveTileView: FC<Props> = ({ offlineTrip }) => {
  const l10n = app.getL10n();

  if (!offlineTrip.isVisible()) {
    return null;
  }

  const subtitle = offlineTrip.getSubtitle();

  const handlePress = () => {
    offlineTrip.handlePress();
  };

  const handleCloseMenu = () => {
    offlineTrip.closeMenu();
  };

  return (
    <>
      <TouchableOpacity
        style={tileStyles.tile}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('offline.tile.label', { subtitle })}
      >
        <Ionicons
          name='cloud-download-outline'
          size={24}
          color={Color.textPrimary}
        />
        <View style={tileStyles.textWrap}>
          <PretendardText
            style={tileStyles.title}
            weight='semibold'
            numberOfLines={1}
          >
            {l10n.t('offline.tile.title')}
          </PretendardText>
          <PretendardText style={tileStyles.subtitle} numberOfLines={2}>
            {subtitle}
          </PretendardText>
        </View>
      </TouchableOpacity>
      <BottomMenuModalView
        visible={offlineTrip.isMenuVisible()}
        onClose={handleCloseMenu}
        menuItems={[
          {
            icon: 'refresh-outline',
            text: l10n.t('offline.menu.refresh'),
            onPress: () => {
              void offlineTrip.refresh();
            },
          },
          {
            icon: 'trash-outline',
            text: l10n.t('offline.menu.remove'),
            onPress: () => {
              offlineTrip.confirmRemove();
            },
          },
        ]}
      />
    </>
  );
};

export default observer(OfflineSaveTileView);
