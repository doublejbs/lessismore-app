import { FC } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import SeperaterView from '../ui/SeperaterView';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailReviewSectionView: FC<Props> = ({ warehouseDetail }) => {
  const replies = warehouseDetail.getReplies();
  const hasReplies = warehouseDetail.hasReplies();
  const replyCount = warehouseDetail.replyCount();

  const handleAddReviewPress = () => {
    router.push(`/reply/${warehouseDetail.getId()}`);
  };

  return (
    <>
      <SeperaterView />
      <View style={styles.container}>
        <Text style={styles.title}>리뷰 {replyCount}개</Text>
        <View style={styles.repliesContainer}>
          {hasReplies ? (
            replies.map(reply => (
              <Text key={reply.getID()}>{reply.getContent()}</Text>
            ))
          ) : (
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={handleAddReviewPress}
            >
              <Text style={styles.addReviewButtonText}>첫번째 리뷰 남기기</Text>
              <Ionicons name='chevron-forward' size={14} color='#000000' />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  repliesContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  addReviewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    width: '100%',
  },
  addReviewButtonText: {
    fontSize: 14,
    color: '#000000',
  },
});

export default observer(WarehouseDetailReviewSectionView);
