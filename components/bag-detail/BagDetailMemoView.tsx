import { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import BagDetail from '@/model/bag-detail/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailMemoView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const hasMemo = bagDetail.hasMemo();
  const memo = bagDetail.getMemo();

  const handlePressMemo = () => {
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
                  color='#191F28'
                />
                <Text style={styles.titleText}>{memo}</Text>
              </View>
            </>
          ) : (
            <View style={styles.titleRow}>
              <Ionicons
                name='document-text-outline'
                size={20}
                color='#191F28'
              />
              <Text style={styles.titleText}>메모 작성하기</Text>
            </View>
          )}
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name='chevron-forward' size={24} color='#191F28' />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  touchableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
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
    fontWeight: '500',
    color: '#191F28',
  },
  memoContent: {
    fontSize: 15,
    color: '#666',
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
