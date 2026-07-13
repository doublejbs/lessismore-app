import ReplyInputView from '@/components/reply/ReplyInputView';
import Reply from '@/model/reply/Reply';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import app from '@/model/app/App';

const ReplyInput = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reply] = useState(() =>
    Reply.of(id, app.getFirebase(), app.getReplyStore()!)
  );

  return <ReplyInputView reply={reply} />;
};

export default ReplyInput;
