import Reply from '@/model/reply/Reply';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import ReplyInputButtonView from './ReplyInputButtonView';
import { observer } from 'mobx-react-lite';
import ReplyItemView from './ReplyItemView';

const ReplyView = ({ reply }: { reply: Reply }) => {
  const router = useRouter();
  const count = reply.getCount();

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
            <Ionicons name='chevron-back' size={24} color='#191F28' />
          </TouchableOpacity>
          <PretendardText style={styles.titleText}>리뷰</PretendardText>
          <View style={styles.placeholder} />
        </View>
      </View>
      <ScrollView>
        <View style={styles.replyHeader}>
          <Text style={styles.replyHeaderText}>리뷰 {count}개</Text>
        </View>
        <View style={styles.content}>
          {reply.getComments().map(comment => (
            <ReplyItemView
              key={comment.id}
              gearId={reply.getGearId()}
              comment={comment}
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
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: 'white',
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
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    color: '#191F28',
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
    fontWeight: '600',
    color: '#191F28',
  },
});

export default observer(ReplyView);
