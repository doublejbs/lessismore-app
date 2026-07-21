import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';

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
          <PretendardText style={styles.deleteAccountText}>
            탈퇴하기
          </PretendardText>
        </TouchableOpacity>
      )}
      <PretendardText style={styles.versionText}>
        버전 {appVersion}
      </PretendardText>
      <View style={styles.appInfoContainer}>
        <PretendardText style={styles.appInfoText}>
          Copyright 2025 useless. All rights reserved.
        </PretendardText>
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
    borderTopColor: Color.borderLight,
    backgroundColor: Color.background,
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 12,
    color: Color.textTertiary,
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  appInfoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  appInfoText: {
    fontSize: 11,
    color: Color.textSecondary,
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
