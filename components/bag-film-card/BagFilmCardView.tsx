import { FC, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  PixelRatio,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import BagFilmCardCanvasView from '@/components/bag-film-card/BagFilmCardCanvasView';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  filmCard: BagFilmCard;
}

// LG-1: iOS만 네이티브 스택 헤더를 쓰고, Android/Web은 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 26 투명 헤더는 배경이 없어(고정 레이아웃 화면) 콘텐츠 상단 여백을 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = 44;

// SNS 업로드에 충분한 가로 해상도(BS-5).
const CAPTURE_PIXEL_WIDTH = 1080;
// 카드 높이/너비 비(대략 4:5). onLayout 실측 전 폴백으로만 쓴다.
const DEFAULT_CARD_RATIO = 1.27;
// 헤더 + 사진 다시 고르기 버튼 + 하단 CTA가 쓰는 세로 공간(카드 최대 크기 산정용).
const RESERVED_HEIGHT = 300;
const MIN_CARD_WIDTH = 220;
// 이보다 작은 비율 변화는 되먹임 루프를 막기 위해 무시한다(handleLayoutCard 주석 참고).
const CARD_RATIO_EPSILON = 0.001;

/**
 * iOS 네이티브는 캡처 옵션 크기를 pt로 받아 기기 배율만큼 픽셀이 곱해지고(RNViewShot.mm의
 * `UIGraphicsImageRendererFormat.scale = 0`), Android는 px로 받아 그대로 리사이즈한다
 * (ViewShot.java의 `Bitmap.createScaledBitmap`). 결과가 양쪽 모두 정확히 가로 1080px이
 * 되도록 플랫폼별로 환산한다.
 */
const getCaptureSize = (ratio: number) => {
  const width = IS_IOS
    ? Math.round(CAPTURE_PIXEL_WIDTH / PixelRatio.get())
    : CAPTURE_PIXEL_WIDTH;

  return { width, height: Math.round(width * ratio) };
};

const BagFilmCardView: FC<Props> = ({ filmCard }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [cardRatio, setCardRatio] = useState(DEFAULT_CARD_RATIO);

  // 카드는 화면 폭에 맞추되, 하단 CTA를 가리지 않도록 남은 높이로도 한 번 더 제한한다.
  const cardWidth = Math.max(
    MIN_CARD_WIDTH,
    Math.min(
      windowWidth - Spacing.screenH * 2,
      (windowHeight - RESERVED_HEIGHT - insets.top - insets.bottom) / cardRatio
    )
  );

  const sharing = filmCard.isSharing();
  const saving = filmCard.isSaving();
  const busy = filmCard.isBusy();

  const handleLayoutCard = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width <= 0 || height <= 0) {
      return;
    }

    const ratio = height / width;

    // cardWidth가 cardRatio에서 나오고 onLayout이 다시 cardRatio를 갱신하는 되먹임 구조다.
    // 텍스트 레이아웃 반올림으로 ±ε 진동하면 렌더 루프가 되므로 그 폭의 변화는 무시한다.
    setCardRatio(previous =>
      Math.abs(previous - ratio) < CARD_RATIO_EPSILON ? previous : ratio
    );
  };

  // 이벤트 핸들러가 아니라 모델에 넘기는 캡처 콜백이다.
  const captureCard = useCallback(async () => {
    return await captureRef(cardRef, {
      format: 'png',
      result: 'tmpfile',
      ...getCaptureSize(cardRatio),
    });
  }, [cardRatio]);

  const handlePressPhoto = () => {
    void filmCard.pickPhoto();
  };

  const handlePressShare = () => {
    void filmCard.share(captureCard);
  };

  const handlePressSave = () => {
    void filmCard.save(captureCard);
  };

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        IS_IOS ? { paddingTop: insets.top + IOS_HEADER_BAR_HEIGHT } : null,
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '필름 카드',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePressBack}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel='뒤로가기'
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            필름 카드
          </PretendardText>
        </View>
      )}
      <View style={styles.content}>
        <BagFilmCardCanvasView
          filmCard={filmCard}
          cardRef={cardRef}
          width={cardWidth}
          onPressPhoto={handlePressPhoto}
          onLayoutCard={handleLayoutCard}
        />
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePressPhoto}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel={
            filmCard.hasPhoto() ? '사진 다시 고르기' : '사진 고르기'
          }
        >
          <Ionicons
            name='images-outline'
            size={16}
            color={Color.textSecondary}
          />
          <PretendardText style={styles.photoButtonText} weight='medium'>
            {filmCard.hasPhoto() ? '사진 다시 고르기' : '사진 고르기'}
          </PretendardText>
        </TouchableOpacity>
      </View>
      <View style={styles.ctaArea}>
        <TouchableOpacity
          style={[styles.shareButton, busy ? styles.buttonDisabled : null]}
          onPress={handlePressShare}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel='공유하기'
        >
          {sharing ? (
            <ActivityIndicator size='small' color={Color.background} />
          ) : (
            <PretendardText style={styles.shareButtonText} weight='semibold'>
              공유하기
            </PretendardText>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handlePressSave}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel='갤러리에 저장'
        >
          {saving ? (
            <ActivityIndicator size='small' color={Color.textSecondary} />
          ) : (
            <PretendardText style={styles.saveButtonText} weight='medium'>
              갤러리에 저장
            </PretendardText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  photoButtonText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  ctaArea: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 8,
    gap: 4,
  },
  shareButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontSize: 16,
    color: Color.background,
  },
  saveButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
});

export default observer(BagFilmCardView);
