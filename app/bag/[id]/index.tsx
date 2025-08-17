import { useLocalSearchParams } from 'expo-router';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const BagDetailWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <WebViewWrapper uri={`https://useless.my/bag/${id}`} header={false} />;
};

export default BagDetailWrapper;
