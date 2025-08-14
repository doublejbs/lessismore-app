import SearchWarehouse from '@/model/search/SearchWarehouse';
import { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';

const SearchPage = () => {
  const firebase = app.getFirebase();
  const token = firebase.getIdToken();
  const accessToken = firebase.getAccessToken();

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      {token && accessToken && (
        <WebView
          source={{
            uri: `https://useless.my/search?token=${token}&accessToken=${accessToken}`,
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
        />
      )}
      {/* <SearchWarehouseView searchWarehouse={searchWarehouse} /> */}
    </View>
  );
};

export default observer(SearchPage);
