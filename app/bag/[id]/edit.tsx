import { useLocalSearchParams } from 'expo-router';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const BagEditWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <WebViewWrapper
      uri={`http://localhost:5173/bag/${id}/edit`}
      header={false}
    />
  );
};

export default BagEditWrapper;
