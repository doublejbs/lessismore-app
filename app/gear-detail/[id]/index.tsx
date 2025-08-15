import { useLocalSearchParams } from 'expo-router';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const GearDetailWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <WebViewWrapper
      uri={`https://useless.my/warehouse/detail/${id}`}
      header={true}
    />
  );
};

export default GearDetailWrapper;
