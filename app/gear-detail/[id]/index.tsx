import { useLocalSearchParams } from 'expo-router';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const GearDetailWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <WebViewWrapper
      uri={`http://localhost:5173/warehouse/detail/${id}`}
      header={false}
    />
  );
};

export default GearDetailWrapper;
