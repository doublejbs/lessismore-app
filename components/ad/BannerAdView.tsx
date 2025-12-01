import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

// TODO: 프로덕션 배포 시 실제 광고 단위 ID로 교체 필요
const adUnitId = __DEV__
  ? TestIds.BANNER
  : Platform.select({
      ios: 'ca-app-pub-1953089301592534/8991809440',
      android: 'ca-app-pub-1953089301592534/5355816761',
    }) ?? TestIds.BANNER;

interface Props {
  size?: BannerAdSize;
}

const BannerAdView: FC<Props> = ({
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
}) => {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

export default BannerAdView;
