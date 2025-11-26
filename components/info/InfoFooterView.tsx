import React, { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

interface Props {
  isLoggedIn: boolean;
}

const InfoFooterView: FC<Props> = ({ isLoggedIn }) => {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={styles.container}>
      {isLoggedIn && (
        <TouchableOpacity
          onPress={() => router.push('/info/delete')}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>탈퇴하기</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.versionText}>버전 {appVersion}</Text>
      <View style={styles.appInfoContainer}>
        <Text style={styles.appInfoText}>
          Copyright 2025 useless. All rights reserved.
        </Text>
      </View>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/internet.png')}
          style={styles.image}
          resizeMode='contain'
        />
        <Image
          source={require('@/assets/images/magma.png')}
          style={styles.image}
          resizeMode='contain'
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 60 : 0,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: 11,
    color: '#999',
  },
  appInfoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  appInfoText: {
    fontSize: 11,
    color: '#999',
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  image: {
    width: 70,
    height: 70,
  },
});

export default InfoFooterView;
