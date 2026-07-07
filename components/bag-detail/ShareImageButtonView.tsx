import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const ShareImageButtonView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('readyshot');
    router.push(`/share-image/${bagDetail.getId()}`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchableContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Ionicons name='sparkles' size={20} color='#7C3AED' />
            <PretendardText style={styles.titleText} weight='medium'>
              내가 가진 장비로 레디샷 만들기
            </PretendardText>
            <View style={styles.aiBadge}>
              <PretendardText style={styles.aiBadgeText} weight='bold'>
                AI
              </PretendardText>
            </View>
          </View>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name='chevron-forward' size={24} color={Color.textPrimary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: Color.background,
  },
  touchableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.card,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  aiBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.listThumb,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(ShareImageButtonView);
