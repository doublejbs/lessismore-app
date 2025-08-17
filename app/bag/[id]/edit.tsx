import { useLocalSearchParams } from 'expo-router';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const BagEditWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <WebViewWrapper uri={`https://useless.my/bag/${id}/edit`} header={false} />
  );
};

export default BagEditWrapper;
