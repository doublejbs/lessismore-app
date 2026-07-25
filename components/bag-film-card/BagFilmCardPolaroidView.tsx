import { FC, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import PretendardText from '@/components/PretendardText';

interface Props {
  filmCard: BagFilmCard;
  // 폴라로이드 렌더 폭(pt). 내부 치수는 모두 이 값에서 비례 계산한다.
  width: number;
  onPressPhoto: () => void;
}

// 아래 치수의 기준이 되는 폴라로이드 폭. 목업 수치를 이 폭 기준으로 잡았다.
const BASE_WIDTH = 300;

// 캡션 손글씨 폰트(BS-3). 캡션은 영문·숫자 전용이라 이 폰트 하나만 쓴다.
// 카드는 앱 디자인 토큰이 아니라 내보내기 캔버스 팔레트를 따르므로 PretendardText·Color
// 토큰 대신 폰트·색을 직접 지정한다(CLAUDE.md 내보내기 캔버스 예외).
const LATIN_FONT = 'PermanentMarker_400Regular';

/**
 * 인화지 텍스처(BS-3). 그레인·섬유질 얼룩·가장자리 음영·광택이 이미 구워져 있는 1080×1352
 * 이미지로, 카드 배경에 깔린다. 사진 창이 뚫려 있지 않아 좌표 하드코딩이 필요 없고
 * 사진·캡션은 그 위에 그대로 렌더된다.
 *
 * 텍스처 비율 1352/1080 = 1.2519로 카드 비율(약 1.25)과 사실상 같아 `cover`로 깔아도
 * 잘리는 양이 0.2% 미만이다 — `stretch`와 달리 왜곡이 전혀 없어 `cover`를 쓴다.
 */
const PAPER_TEXTURE = require('@/assets/images/film-frame-paper.jpg');

const INK_COLOR = '#000000';

// 인화지는 완벽한 직각이 아니다 — 아주 작게만 둥글린다(과하면 스티커처럼 보인다).
// 텍스처가 알파 없는 사각 이미지라 모서리는 RN이 잘라줘야 한다(card의 overflow: 'hidden').
const FRAME_RADIUS = 2;
// 사진을 고르지 않아도 카드가 완성되도록 하는 단색 배경(BS-2). 앱 브랜드 톤의 짙은 회색.
const EMPTY_PHOTO_COLOR = '#151515';
// 위 짙은 배경 위에 얹히는 `사진 고르기` 안내 색(화면 전용 — 캡처 시에는 감춘다).
const PLACEHOLDER_COLOR = '#FFFFFF';
// 사진과 인화지 사이 경계. 눈에 띄면 안 되는 수준으로만 둔다.
const PHOTO_EDGE_COLOR = 'rgba(0, 0, 0, 0.07)';

/**
 * 필름(폴라로이드) 카드 — 흰 프레임 안에 정사각 사진, 아래 좌·우 2열 캡션(BS-3).
 * 좌우 여백보다 아래 여백이 넓어 폴라로이드 비율(대략 4:5)이 된다.
 */
const BagFilmCardPolaroidView: FC<Props> = ({
  filmCard,
  width,
  onPressPhoto,
}) => {
  const styles = useMemo(() => createStyles(width), [width]);
  const scale = width / BASE_WIDTH;
  const photoUri = filmCard.getPhotoUri();
  const capturing = filmCard.isCapturing();
  const distanceText = filmCard.getDistanceText();
  const speedText = filmCard.getSpeedText();

  // BS-4: 운동 기록이 있으면 거리·속도, 없으면 우측 열을 비운다(좌측 날짜·무게만 있는 카드).
  const renderRightColumn = () => {
    if (!filmCard.hasActivity() || !distanceText) {
      return null;
    }

    return (
      <View style={styles.rightColumn}>
        <Text style={[styles.bigText, styles.rightText]}>{distanceText}</Text>
        {speedText ? (
          <Text style={[styles.smallText, styles.rightText, styles.speedText]}>
            {speedText}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* 인화지 텍스처 — 사진·캡션보다 먼저 선언해 그 아래에 깔린다(사진은 원본 그대로 유지).
          사진 창이 뚫린 프레임이 아니라 종이 전체 텍스처라 좌표를 맞출 필요가 없다. */}
      <Image source={PAPER_TEXTURE} style={styles.paper} resizeMode='cover' />
      {/* 캡처·공유 중 탭을 막는다 — 캡처 도중 피커가 뜨면 빈/잘린 이미지가 나가거나
          공유된 이미지와 화면이 어긋난다. 화면 하단에 같은 동작의 레이블된 버튼이
          따로 있어, 스크린 리더에는 이 영역을 중복 노출하지 않는다. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressPhoto}
        disabled={filmCard.isBusy()}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
      >
        <View style={styles.photo}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoImage}
              resizeMode='cover'
            />
          ) : null}
          {/* 안내는 화면용이라 캡처 프레임에서는 감춘다 — 사진 없이도 단색 배경으로 완성된다(BS-2). */}
          {!photoUri && !capturing ? (
            <View style={styles.placeholder}>
              <Ionicons
                name='image-outline'
                size={Math.round(28 * scale)}
                color={PLACEHOLDER_COLOR}
              />
              <PretendardText style={styles.placeholderText} weight='medium'>
                사진 고르기
              </PretendardText>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <View style={styles.caption}>
        <View style={styles.leftColumn}>
          <Text style={styles.bigText}>{filmCard.getDateText()}</Text>
          <Text style={styles.smallText}>{filmCard.getWeightText()}</Text>
        </View>
        {renderRightColumn()}
      </View>
    </View>
  );
};

const createStyles = (width: number) => {
  const scale = width / BASE_WIDTH;
  // 캡션에는 소문자가 없고 숫자·대문자뿐이라 x-height가 아니라 **cap-height**로 크기를 맞춘다.
  // Permanent Marker는 cap-height/em 0.7402로 Caveat 700(0.610)보다 커서, 같은 pt면 더 크게
  // 보인다. 이전 시각 크기를 유지하도록 실측 비(0.610/0.7402)만큼 줄였다(25→21, 18→15).
  const big = 21 * scale;
  const small = 15 * scale;

  return StyleSheet.create({
    card: {
      width,
      borderRadius: FRAME_RADIUS * scale,
      // 알파 없는 사각 텍스처가 둥근 모서리 밖으로 삐져나오지 않게 한다.
      // 그림자 레이어는 이 카드의 자식이 아니라 형제(캔버스 쪽)라 여기에 걸려도 잘리지 않는다.
      overflow: 'hidden',
      paddingHorizontal: 15 * scale,
      paddingTop: 15 * scale,
      // 좌우보다 넓은 하단 여백이 폴라로이드의 정체성이다. 이 값으로 카드 비율이
      // 1.2505가 되어 텍스처 비율(1.2519)과 맞아떨어진다(cover 잘림 0.2% 미만).
      paddingBottom: 20 * scale,
    },
    paper: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: undefined,
      height: undefined,
    },
    photo: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: EMPTY_PHOTO_COLOR,
      overflow: 'hidden',
      // 사진과 흰 프레임 사이의 아주 옅은 경계 — 실물 인화지에서 유제면이 종이보다
      // 살짝 들어가 보이는 느낌. 밝은 사진이 프레임과 뭉개지는 것도 막아준다.
      borderWidth: Math.max(StyleSheet.hairlineWidth, 0.6 * scale),
      borderColor: PHOTO_EDGE_COLOR,
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8 * scale,
    },
    placeholderText: {
      fontSize: 13 * scale,
      color: PLACEHOLDER_COLOR,
    },
    caption: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10 * scale,
      paddingTop: 17 * scale,
      paddingHorizontal: 5 * scale,
      paddingBottom: 4 * scale,
    },
    leftColumn: {
      flexShrink: 0,
    },
    rightColumn: {
      flexShrink: 1,
      alignItems: 'flex-end',
    },
    bigText: {
      fontFamily: LATIN_FONT,
      fontSize: big,
      lineHeight: big * 1.15,
      color: INK_COLOR,
    },
    smallText: {
      fontFamily: LATIN_FONT,
      fontSize: small,
      lineHeight: small * 1.2,
      marginTop: 7 * scale,
      color: INK_COLOR,
    },
    rightText: {
      textAlign: 'right',
    },
    // 이 손글씨체의 슬래시가 세로줄에 가까워 `KM/H`가 `KMIH`로 읽히기 쉬워,
    // 자간을 벌려 슬래시를 글자가 아닌 구분자로 읽히게 한다.
    speedText: {
      letterSpacing: 1.6 * scale,
    },
  });
};

export default observer(BagFilmCardPolaroidView);
