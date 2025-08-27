import WebViewManager from '@/model/webview/WebViewManager';
import { WEBVIEW_BRIDGE_SCRIPT } from '@/model/webview/WebViewBridge';
import { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { useNavigation } from 'expo-router';

interface Props {
  uri: string;
  tokens: { idToken: string | null; accessToken: string | null };
  webViewManager: WebViewManager;
}

const WebViewContentView = ({ uri, tokens, webViewManager }: Props) => {
  const webViewRef = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (webViewRef.current && loaded) {
        webViewRef.current.injectJavaScript(
          `if (window.onRefreshFromReactNative) {
          window.onRefreshFromReactNative();
        }
        true;`
        );
      }
    });

    return unsubscribe;
  }, [navigation, loaded]);

  if (!tokens.idToken || !tokens.accessToken) {
    return null;
  }

  return (
    <WebView
      ref={webViewRef}
      source={{
        uri: `${uri}?token=${encodeURIComponent(
          tokens.idToken
        )}&accessToken=${encodeURIComponent(tokens.accessToken)}`,
      }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      scalesPageToFit={true}
      // 쿠키 및 세션 공유 설정
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      cacheEnabled={true}
      // WebView 브릿지 설정
      injectedJavaScript={WEBVIEW_BRIDGE_SCRIPT}
      onMessage={webViewManager.handleMessage}
      onLoadEnd={() => {
        setLoaded(true);
      }}
    />
  );
};

export default WebViewContentView;
