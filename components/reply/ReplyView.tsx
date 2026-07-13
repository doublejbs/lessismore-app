import Reply from '@/model/reply/Reply';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';
import PretendardText from '../PretendardText';
import ReplyInputButtonView from './ReplyInputButtonView';
import { observer } from 'mobx-react-lite';
import ReplyItemView from './ReplyItemView';

const ReplyView = ({ reply }: { reply: Reply }) => {
  const router = useRouter();

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
            <Ionicons
              name='chevron-back'
              size={24}
              color={Color.textPrimary}
            />
          </TouchableOpacity>
          <PretendardText weight='semibold' style={styles.titleText}>
            리뷰
          </PretendardText>
          <View style={styles.placeholder} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.replyHeader}>
          <PretendardText weight='semibold' style={styles.replyHeaderText}>
            리뷰
          </PretendardText>
        </View>
        {reply.getComments().length === 0 ? (
          // 리뷰가 없을 때 빈 여백 대신 안내를 남은 공간 중앙에 표시한다.
          <View style={styles.emptyState}>
            <Ionicons
              name='star-outline'
              size={40}
              color={Color.chipBorder}
            />
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              아직 등록된 리뷰가 없어요
            </PretendardText>
            <PretendardText style={styles.emptyDesc}>
              첫 리뷰를 남겨보세요
            </PretendardText>
          </View>
        ) : (
          <View style={styles.content}>
            {reply.getComments().map(comment => (
              <ReplyItemView
                key={comment.id}
                gearId={reply.getGearId()}
                comment={comment}
                reply={reply}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <ReplyInputButtonView reply={reply} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    backgroundColor: Color.background,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleText: {
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
    color: Color.textPrimary,
  },
  placeholder: {
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  replyHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  replyHeaderText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  emptyDesc: {
    fontSize: 14,
    color: Color.textSecondary,
  },
});

export default observer(ReplyView);
