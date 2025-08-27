import { useLocalSearchParams } from 'expo-router';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const BagDetailWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <WebViewWrapper uri={`http://localhost:5173/bag/${id}`} header={false} />
  );
};

export default BagDetailWrapper;
