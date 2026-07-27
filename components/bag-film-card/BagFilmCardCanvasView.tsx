import { FC, ReactNode, RefObject } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { ComposedGesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import FilmCardElement from '@/model/bag-film-card/FilmCardElement';
import BagFilmCardPolaroidView from '@/components/bag-film-card/BagFilmCardPolaroidView';
import BagFilmCardSpecLabelView from '@/components/bag-film-card/BagFilmCardSpecLabelView';
import PretendardText from '@/components/PretendardText';

/**
 * 캔버스에 얹을 요소 하나(BS-7·BS-9).
 *
 * 이동·확대·회전 상태와 탭 동작은 화면(BagFilmCardView)의 훅이 요소마다 하나씩 들고 있고,
 * 이 컴포넌트는 받은 제스처·스타일을 적용해 그리기만 한다.
 */
export interface FilmCardCanvasElement {
  element: FilmCardElement;
  gesture: ComposedGesture;
  style: StyleProp<AnimatedStyle<ViewStyle>>;
  onLayout: (event: LayoutChangeEvent) => void;
}

interface Props {
  filmCard: BagFilmCard;
  // 캡처 대상 View의 ref. observer 래핑 컴포넌트라 ref를 명시 prop으로 받는다.
  cardRef: RefObject<View | null>;
  width: number;
  height: number;
  polaroidWidth: number;
  // 영수증 종이 폭(pt)과 본문에 싣는 장비 수(BS-8).
  receiptWidth: number;
  receiptItemLimit: number;
  // 켜져 있는 요소만, **켠 순서대로** 들어온다 — 나중에 켠 것이 위에 온다(BS-7).
  elements: readonly FilmCardCanvasElement[];
  onPressPhoto: () => void;
}

// 사진을 고르지 않았을 때 캔버스를 채우는 단색(BS-2). 사진 없이도 카드를 완성할 수 있다.
const EMPTY_PHOTO_COLOR = '#151515';
// 위 짙은 배경 위에 얹히는 `사진 고르기` 안내 색(화면 전용 — 캡처 시에는 감춘다).
const PLACEHOLDER_COLOR = '#FFFFFF';

/**
 * 요소를 사진에서 띄우는 그림자(BS-3·BS-8).
 *
 * **네이티브 그림자 속성을 쓰지 않는 이유**: Android 캡처는 `view.draw(new Canvas(bitmap))`
 * (ViewShot.java) — 소프트웨어 캔버스다. `elevation` 그림자는 하드웨어 RenderNode가 그리므로
 * 소프트웨어 캔버스에는 **찍히지 않는다**. 화면 프리뷰에는 보이는데 내보낸 PNG에서만 사라지는
 * 조용한 불일치가 생긴다. 그래서 실제로 그려지는 View를 겹쳐 그림자를 만든다 —
 * 두 플랫폼이 같은 결과를 내고 캡처에도 그대로 들어간다.
 *
 * 검정 알파 합성은 바닥(사진)을 곱셈으로 어둡게 만들어 색조를 그대로 보존한다 —
 * 사진 색에 맞춰 그림자 색을 조색할 필요가 없다.
 */
const SHADOW_LAYER_COUNT = 8;

interface ShadowSpec {
  // 기준 폭 대비 총 확산 폭.
  spreadRatio: number;
  // 레이어당 알파. 안쪽일수록 겹쳐 쌓이므로 누적값은 이 값 × 레이어 수다.
  layerAlpha: number;
  // 위에서 빛이 오는 느낌을 주려고 그림자를 아래로 내리는 양(기준 폭 대비).
  offsetRatio: number;
}

/**
 * 폴라로이드 그림자(BS-3). 폴라로이드 폭 대비 0.055 × 0.56 ≈ 캔버스 폭의 3.1%,
 * 누적 알파 20%(0.025 × 8).
 *
 * **[이력] 값을 다시 잡은 이유**: 예전에는 폴라로이드가 크림 배경(#E6E0D4) 위에 놓여
 * **경계를 배경색이 만들었기 때문에** 그림자를 누적 4.4%로 아주 옅게 썼다. 배경이 사진으로
 * 바뀌면서 그 전제가 사라졌다 — 사진은 밝기·색이 제각각이라 색만으로는 인화물의 경계가
 * 서지 않는다. 아래 영수증 종이가 같은 이유로 이미 누적 11%를 쓰고 있었고, 폴라로이드는
 * 흰 인화지라 밝은 사진 위에서 종이보다 더 묻히므로 그보다 진하게 잡았다.
 * 사진을 어둡게 덮는 스크림을 걷어낸 만큼(BS-10 "사진이 주인공") 대비는 이 그림자가 전담한다.
 */
const POLAROID_SHADOW: ShadowSpec = {
  spreadRatio: 0.055,
  layerAlpha: 0.025,
  offsetRatio: 0.012,
};

/**
 * 영수증 종이 그림자(BS-8). 종이가 사진에서 떠 보이도록 누적 11%로 준다.
 * 폴라로이드보다 옅은 것은 종이가 오프화이트라 흰 인화지보다 밝은 사진에 덜 묻히고,
 * 종이 자체에 구김 질감이 있어 경계가 조금 더 서기 때문이다.
 */
const PAPER_SHADOW: ShadowSpec = {
  spreadRatio: 0.05,
  layerAlpha: 0.014,
  offsetRatio: 0.01,
};

const renderShadowLayers = (baseWidth: number, spec: ShadowSpec) => {
  const step = (baseWidth * spec.spreadRatio) / SHADOW_LAYER_COUNT;
  const offset = baseWidth * spec.offsetRatio;

  return Array.from({ length: SHADOW_LAYER_COUNT }, (_unused, index) => {
    const spread = step * (index + 1);

    return (
      <View
        key={index}
        // 그림자가 요소 드래그를 가로채지 않게 한다.
        pointerEvents='none'
        style={[
          styles.shadowLayer,
          {
            top: -spread + offset,
            bottom: -spread - offset,
            left: -spread,
            right: -spread,
            borderRadius: spread * 0.6,
            backgroundColor: `rgba(0, 0, 0, ${spec.layerAlpha})`,
          },
        ]}
      />
    );
  });
};

/**
 * 캡처 대상 캔버스(BS-2, BS-5, BS-10).
 *
 * **캔버스는 언제나 사진이다** — 고른 사진이 `cover`로 화면을 채우고(없으면 단색),
 * 그 위에 켜져 있는 요소(폴라로이드·영수증)를 켠 순서대로 얹는다. 이 View 전체가 캡처된다.
 *
 * **사진 위에 스크림을 깔지 않는다.** 예전 영수증 템플릿은 22% 검정 스크림으로 종이를
 * 분리했지만, 사진이 주인공이라는 원칙(BS-10)과 충돌한다 — 요소 대비는 각자의 그림자가 맡는다.
 */
const BagFilmCardCanvasView: FC<Props> = ({
  filmCard,
  cardRef,
  width,
  height,
  polaroidWidth,
  receiptWidth,
  receiptItemLimit,
  elements,
  onPressPhoto,
}) => {
  const photoUri = filmCard.getPhotoUri();
  const capturing = filmCard.isCapturing();

  // 요소는 자기 그림자와 함께 한 덩어리로 그려진다 — 그림자 레이어를 내용보다 먼저 선언해
  // 뒤에 깔리게 한다(RN은 웹과 달리 absolute 자식을 자동으로 위로 올리지 않는다).
  const renderElementContent = (element: FilmCardElement): ReactNode => {
    if (element === FilmCardElement.Polaroid) {
      return (
        <View style={styles.elementHolder}>
          {renderShadowLayers(polaroidWidth, POLAROID_SHADOW)}
          <BagFilmCardPolaroidView filmCard={filmCard} width={polaroidWidth} />
        </View>
      );
    }

    return (
      <View style={styles.elementHolder}>
        {renderShadowLayers(receiptWidth, PAPER_SHADOW)}
        <BagFilmCardSpecLabelView
          filmCard={filmCard}
          width={receiptWidth}
          itemLimit={receiptItemLimit}
        />
      </View>
    );
  };

  return (
    <View
      ref={cardRef}
      style={[styles.canvas, { width, height }]}
      // Android가 캡처 대상 View를 레이아웃에서 합쳐 없애지 않도록 한다.
      collapsable={false}
    >
      {/* 배경(요소가 없는 자리) 탭 = **배경 사진** 다시 고르기. 요소보다 **먼저** 선언해
          아래에 깔리게 한다 — 요소를 탭했을 때는 이 영역이 아니라 요소가 터치 대상이라
          여기로 새지 않는다. 폴라로이드 탭은 폴라로이드 사진 피커를 열고, 영수증 탭은
          아무 일도 일어나지 않는다(BS-9 — 탭 동작은 요소의 제스처가 들고 있다).
          프리뷰 오버레이에 같은 동작의 레이블된 아이콘 버튼이 있어 스크린 리더에는
          중복 노출하지 않는다(BS-10). */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.85}
        onPress={onPressPhoto}
        disabled={filmCard.isBusy()}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photo}
            resizeMode='cover'
          />
        ) : null}
        {/* 사진을 아직 안 골랐으면 캔버스 전체가 안내가 된다 — 어디를 탭해도 피커가 열린다(BS-2).
            안내는 화면용이라 캡처 프레임에서는 감춘다(사진 없이도 단색 배경으로 완성된다). */}
        {!photoUri && !capturing ? (
          <View style={styles.placeholder} pointerEvents='none'>
            <Ionicons
              name='image-outline'
              size={32}
              color={PLACEHOLDER_COLOR}
            />
            <PretendardText style={styles.placeholderText} weight='medium'>
              사진 고르기
            </PretendardText>
          </View>
        ) : null}
      </TouchableOpacity>
      {elements.map(item => (
        // 캔버스를 덮는 투명 레이어로 요소를 가운데에 세운다. `box-none`이라 요소 바깥의
        // 탭은 아래 사진 영역으로 그대로 통과하고, 레이어끼리도 서로를 막지 않는다.
        <View
          key={item.element}
          style={styles.elementLayer}
          pointerEvents='box-none'
        >
          <GestureDetector gesture={item.gesture}>
            <Animated.View style={item.style}>
              {/* `onLayout`은 `Animated.View`가 아니라 **안쪽 일반 View**에 건다 —
                  `GestureDetector`가 감싼 reanimated 뷰에서는 콜백이 오지 않는다. */}
              <View onLayout={item.onLayout}>
                {renderElementContent(item.element)}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: EMPTY_PHOTO_COLOR,
    // 옮긴 요소와 그 그림자가 캔버스를 넘어 화면 배경으로 새지 않게 자른다.
    overflow: 'hidden',
  },
  photo: {
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
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: PLACEHOLDER_COLOR,
  },
  elementLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 요소 크기에 맞춰 자동으로 잡히는 기준 박스. 그림자 레이어가 이 박스 바깥으로
  // 음수 인셋만큼 퍼진다(overflow를 걸지 않아야 그림자가 보인다).
  elementHolder: {
    position: 'relative',
  },
  shadowLayer: {
    position: 'absolute',
  },
});

export default observer(BagFilmCardCanvasView);
