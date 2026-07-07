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
      <ScrollView>
        <View style={styles.replyHeader}>
          <PretendardText weight='semibold' style={styles.replyHeaderText}>
            리뷰
          </PretendardText>
        </View>
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
});

export default observer(ReplyView);
