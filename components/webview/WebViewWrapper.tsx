import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import WebViewManager, {
  WebViewManagerCallback,
} from '@/model/webview/WebViewManager';
import { useEffect, useState } from 'react';
import WebViewContentView from './WebViewContentView';

interface Props {
  uri: string;
  header: boolean;
  callback?: WebViewManagerCallback;
  modal?: boolean;
}

const WebViewWrapper = ({ uri, header, callback, modal = false }: Props) => {
  const router = useRouter();
  const firebase = app.getFirebase();
  const webViewManager = WebViewManager.getInstance(router, callback);
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
          <WebViewContentView
            uri={uri}
            tokens={tokens}
            webViewManager={webViewManager}
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
