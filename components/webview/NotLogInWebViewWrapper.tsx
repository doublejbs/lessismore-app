import WebViewManager, {
  WebViewManagerCallback,
} from '@/model/webview/WebViewManager';
import { WEBVIEW_BRIDGE_SCRIPT } from '@/model/webview/WebViewBridge';
import { useRouter } from 'expo-router';
import { FC, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';

interface Props {
  uri: string;
  header: boolean;
  callback?: WebViewManagerCallback;
  modal?: boolean;
}

const NotLogInWebViewWrapper: FC<Props> = ({
  uri,
  header,
  callback,
  modal,
}) => {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const webViewManager = WebViewManager.getInstance(router, callback);
  const accessToken = app.getFirebase().getAccessToken();
  const idToken = app.getFirebase().getIdToken();
  const isLoggedIn = app.getFirebase().isLoggedIn();

  const handleGoBack = () => {
    router.back();
  };

  useEffect(() => {
    if (accessToken && idToken && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'AUTH_TOKENS',
          data: {
            accessToken,
            idToken,
          },
        })
      );
    }
  }, [accessToken, idToken, webViewRef.current]);

  useEffect(() => {
    if (isLoggedIn) {
      router.back();
    }
  }, [isLoggedIn]);

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
        <WebView
          ref={webViewRef}
          source={{
            uri: uri,
          }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          // 쿠키 및 세션 공유 설정
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={false}
          // WebView 브릿지 설정
          injectedJavaScript={WEBVIEW_BRIDGE_SCRIPT}
          onMessage={webViewManager.handleMessage}
        />
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

export default observer(NotLogInWebViewWrapper);
