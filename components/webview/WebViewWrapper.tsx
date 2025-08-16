import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import app from '@/model/app/App';
import WebViewManager from '@/model/webview/WebViewManager';
import { WEBVIEW_BRIDGE_SCRIPT } from '@/model/webview/WebViewBridge';
import { useEffect, useState } from 'react';

interface Props {
  uri: string;
  header: boolean;
  modal?: boolean;
}

const WebViewWrapper = ({ uri, header, modal = false }: Props) => {
  const router = useRouter();
  const firebase = app.getFirebase();
  // WebViewManager 인스턴스 생성 (router 전달)
  const webViewManager = WebViewManager.getInstance(router);
  const [tokens, setTokens] = useState<{
    idToken: string | null;
    accessToken: string | null;
  }>({
    idToken: null,
    accessToken: null,
  });

  const handleGoBack = () => {
    router.back();
  };

  useEffect(() => {
    const refreshTokens = async () => {
      const newTokens = await firebase.refreshTokens();

      setTokens(newTokens);
    };
    refreshTokens();

    return () => {
      setTokens({
        idToken: null,
        accessToken: null,
      });
    };
  }, [firebase]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* 드래그 바 (모달일 때만 표시) */}
      {modal && <View style={styles.dragBar} />}

      {/* 헤더 */}
      {header && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name='chevron-back' size={24} color='black' />
          </TouchableOpacity>
        </View>
      )}

      {/* 웹뷰 컨텐츠 영역 */}
      <View style={styles.webViewContainer}>
        {tokens.idToken && tokens.accessToken && (
          <WebView
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
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dragBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    height: 50,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewContainer: {
    flex: 1,
  },
});

export default WebViewWrapper;
