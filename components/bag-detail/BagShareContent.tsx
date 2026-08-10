import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 배낭 공유 formSheet 내용(BD-1) — 배낭 생성/복사/정보수정 시트와 동일한 UI 언어.
// 그래버·키보드 회피·라운드 코너는 네이티브 formSheet(OS)가 처리한다.
const BagShareContent: FC<Props> = ({ bagDetail }) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const shared = bagDetail.isShared();
  const url = bagDetail.getUrl();

  const handleShare = async () => {
    setIsLoading(true);

    try {
      if (shared) {
        await bagDetail.unshare();
        Alert.alert('알림', '공유가 취소되었습니다.');
      } else {
        await bagDetail.share();

        try {
          await Clipboard.setStringAsync(url);
          Alert.alert('성공', '공유 링크가 클립보드에 복사되었습니다.');
        } catch {
          Alert.alert('오류', '링크 복사에 실패했습니다.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('성공', '링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      Alert.alert('오류', '복사에 실패했습니다.');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom - 12, 12) },
      ]}
    >
      <View style={styles.body}>
        <PretendardText weight='bold' style={styles.title}>
          {shared ? '배낭 공유 중' : '배낭 공유하기'}
        </PretendardText>
        <PretendardText style={styles.description}>
          {shared
            ? '현재 배낭이 공유되어 다른 사용자가 볼 수 있어요'
            : '배낭을 공유하면 다른 사용자가 볼 수 있어요'}
        </PretendardText>

        {shared && (
          <View style={styles.urlContainer}>
            <PretendardText style={styles.urlText} numberOfLines={2}>
              {url}
            </PretendardText>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyLink}
              activeOpacity={LiquidMotion.pressOpacity}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole='button'
              accessibilityLabel='링크 복사'
            >
              <Ionicons
                name='copy-outline'
                size={18}
                color={Liquid.inkSecondary}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {/* 처리 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 `처리 중...`으로
            바뀌면 무엇을 기다리는지 사라진다. */}
        <LiquidPillButton
          label={shared ? '공유 취소' : '공유하기'}
          variant='primary'
          block
          onPress={handleShare}
          disabled={isLoading}
          busy={isLoading}
          leading={
            isLoading ? <ActivityIndicator color={Liquid.surface} /> : null
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 폼 시트는 종이 면이다 — 링크 면만 한 단계 가라앉힌다.
    backgroundColor: Liquid.surface,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다.
    paddingTop: 52,
  },
  body: {
    paddingHorizontal: LiquidLayout.screenH,
    marginBottom: 20,
  },
  // 시트 제목은 화면 대상이라 title3(다른 배낭 시트와 같은 값).
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Liquid.inkTertiary,
    // 세로 여백이라 `LiquidLayout.screenH`(가로축 토큰)를 쓰지 않는다 — 값이 같아도 축이 다르다.
    marginBottom: 20,
  },
  // 두 줄까지 늘어나는 면이라 알약이 아니라 타일(20)이다.
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Liquid.surfaceSunken,
    borderRadius: LiquidRadius.tile,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  urlText: {
    flex: 1,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkSecondary,
  },
  // 아이콘 전용 컨트롤 — 28 프레임 + 상하좌우 `hitSlop` 8로 44×44pt를 채운다(HIG).
  // 링크 줄 높이를 밀지 않으려고 프레임은 44가 아니라 28이다.
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  buttonContainer: {
    paddingHorizontal: LiquidLayout.screenH,
  },
});

export default observer(BagShareContent);
