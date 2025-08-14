import WarehouseWrapper from '@/components/warehouse/WarehouseWrapper';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WarehouseTabPage() {
  // return (
  //   <View style={{ flex: 1 }}>
  //     <WebView
  //       source={{ uri: 'https://useless.my/warehouse' }}
  //       style={{ flex: 1 }}
  //       javaScriptEnabled={true}
  //       domStorageEnabled={true}
  //       startInLoadingState={true}
  //       scalesPageToFit={true}
  //       // 쿠키 및 세션 공유 설정
  //       sharedCookiesEnabled={true}
  //       thirdPartyCookiesEnabled={true}
  //     />
  //   </View>
  // );
  return <WarehouseWrapper />;
}
