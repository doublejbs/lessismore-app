import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailMemoView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const hasMemo = bagDetail.hasMemo();
  const memo = bagDetail.getMemo();

  const handlePressMemo = () => {
    app.getAnalyticsManager()?.logClick('bag_memo');
    router.push(`/bag/${bagDetail.getId()}/memo`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchableContainer}
        onPress={handlePressMemo}
        activeOpacity={0.7}
      >
        <View style={styles.textContainer}>
          {hasMemo ? (
            <>
              <View style={styles.titleRow}>
                <Ionicons
                  name='document-text-outline'
                  size={20}
                  color={Color.textPrimary}
                />
                <PretendardText style={styles.titleText} weight='medium'>
                  {memo}
                </PretendardText>
              </View>
            </>
          ) : (
            <View style={styles.titleRow}>
              <Ionicons
                name='document-text-outline'
                size={20}
                color={Color.textPrimary}
              />
              <PretendardText style={styles.titleText} weight='medium'>
                메모 작성하기
              </PretendardText>
            </View>
          )}
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
  memoContent: {
    fontSize: 15,
    color: Color.textTertiary,
    marginTop: 8,
    lineHeight: 20,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(BagDetailMemoView);
