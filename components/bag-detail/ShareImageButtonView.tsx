import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
    <TouchableOpacity style={styles.tile} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.iconRow}>
        <Ionicons name='sparkles' size={22} color='#7C3AED' />
        <View style={styles.aiBadge}>
          <PretendardText style={styles.aiBadgeText} weight='bold'>
            AI
          </PretendardText>
        </View>
      </View>
      <View style={styles.textWrap}>
        <PretendardText style={styles.title} weight='medium'>
          레디샷
        </PretendardText>
        <PretendardText style={styles.subtitle} numberOfLines={1}>
          장비로 이미지 생성
        </PretendardText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: 92,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.listThumb,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  textWrap: {
    gap: 2,
  },
  title: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Color.textSecondary,
  },
});

export default observer(ShareImageButtonView);
