import WebViewWrapper from '@/components/webview/WebViewWrapper';
import { FC } from 'react';
import { useLocalSearchParams } from 'expo-router';

const UselessPage: FC = () => {
  const { id } = useLocalSearchParams();

  return (
    <WebViewWrapper
      uri={`https://useless.my/bag/${id}/useless`}
      header={false}
    />
  );
};

export default UselessPage;
