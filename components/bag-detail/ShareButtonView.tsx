import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { setBagShareContext } from '@/model/bag-detail/BagShareHandoff';
import { Color } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 헤더 공유 아이콘(BD-1). 탭하면 배낭 공유 formSheet(/bag-share)를 연다.
const ShareButtonView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();

  const handleShareButtonPress = () => {
    app.getAnalyticsManager()?.logClick('bag_share');
    setBagShareContext(bagDetail);
    router.push('/bag-share');
  };

  return (
    <TouchableOpacity
      style={styles.shareButton}
      onPress={handleShareButtonPress}
      hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
      accessibilityRole='button'
      accessibilityLabel='공유'
    >
      <Ionicons name='share-outline' size={24} color={Color.textPrimary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(ShareButtonView);
