import { FC } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { AcgFontSize, Color } from '@/constants/DesignTokens';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 커스텀 JS 헤더를 유지한다.
export const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 투명 헤더 아래에서 콘텐츠를 시작시키기 위한 보정값.
export const NATIVE_HEADER_HEIGHT = 44;
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
export const IOS_EDGES = ['left', 'right', 'bottom'] as const;

interface Props {
  title: string;
}

/**
 * 정보 탭 하위 화면(약관·정책, 사업자 정보)의 공용 헤더.
 *
 * 루트 스택이 `headerShown: false`라 화면이 스스로 헤더를 세워야 한다 — 안 하면 **뒤로 갈
 * 방법이 없다.** 인기순위 화면(LG-1)이 쓰던 방식을 그대로 공유한다: iOS는 네이티브 투명
 * 헤더에 맡기고(글래스 back·scroll edge effect는 시스템이 그린다), Android/Web은 커스텀 헤더.
 */
const InfoSubScreenHeaderView: FC<Props> = ({ title }) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: title,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole='button'
            accessibilityLabel='뒤로 가기'
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            {title}
          </PretendardText>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  // HIG 최소 터치 타깃 44×44pt.
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: AcgFontSize.rowTitle,
    color: Color.textPrimary,
  },
});

export default InfoSubScreenHeaderView;
