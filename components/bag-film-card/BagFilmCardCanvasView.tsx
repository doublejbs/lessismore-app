import { FC, RefObject } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { ComposedGesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import FilmCardTemplate from '@/model/bag-film-card/FilmCardTemplate';
import BagFilmCardPolaroidView from '@/components/bag-film-card/BagFilmCardPolaroidView';
import BagFilmCardSpecLabelView from '@/components/bag-film-card/BagFilmCardSpecLabelView';

interface Props {
  filmCard: BagFilmCard;
  // 캡처 대상 View의 ref. observer 래핑 컴포넌트라 ref를 명시 prop으로 받는다.
  cardRef: RefObject<View | null>;
  width: number;
  // 배경 캔버스 높이(pt). 폴라로이드 단독 출력은 내용이 높이를 정하므로 null.
  height: number | null;
  polaroidWidth: number;
  // 영수증 종이 폭(pt)과 본문에 싣는 장비 수(BS-8).
  labelWidth: number;
  labelItemLimit: number;
  // 종이 이동·확대(BS-9). 상태는 화면 쪽 훅이 들고 있고 여기서는 적용만 한다.
  labelGesture: ComposedGesture;
  labelStyle: StyleProp<AnimatedStyle<ViewStyle>>;
  onLayoutLabel: (event: LayoutChangeEvent) => void;
  onPressPhoto: () => void;
  onLayoutCanvas: (event: LayoutChangeEvent) => void;
}

// 4:5 / 9:16 배경색(BS-3). 내보내기 캔버스 팔레트라 디자인 토큰 예외 대상이다.
// 크림 — 순검정은 인화지의 따뜻한 톤과 부딪혀 앱 UI처럼 보였다.
// 인화지(#F2F0EB)보다 확실히 어두운 값을 쓴다: 카드 경계를 **색**이 만들어야 그림자를
// 은은하게 둘 수 있다. 더 밝게 잡으면 경계가 전부 그림자에 실려 그림자가 과해진다.
const CANVAS_COLOR = '#E6E0D4';

// 영수증에서 사진을 고르지 않았을 때 캔버스를 채우는 단색(BS-2·BS-8).
// 폴라로이드의 빈 사진 배경과 같은 톤이라 두 템플릿의 빈 상태가 어긋나지 않는다.
const EMPTY_PHOTO_COLOR = '#151515';

/**
 * 사진 위 스크림(BS-8). 오프화이트 종이가 밝은 사진에 묻히지 않도록 배경을 살짝 눌러
 * 종이를 분리한다. 22%보다 진하면 사진을 보여준다는 이 템플릿의 전제가 무너진다.
 * 사진이 없을 때는 이미 어두운 단색이라 덧칠하지 않는다.
 */
const PHOTO_SCRIM_COLOR = 'rgba(0, 0, 0, 0.22)';

/**
 * 폴라로이드를 배경에서 띄우는 그림자(BS-3, 4:5·9:16 전용).
 *
 * **네이티브 그림자 속성을 쓰지 않는 이유**: Android 캡처는 `view.draw(new Canvas(bitmap))`
 * (ViewShot.java) — 소프트웨어 캔버스다. `elevation` 그림자는 하드웨어 RenderNode가 그리므로
 * 소프트웨어 캔버스에는 **찍히지 않는다**. 화면 프리뷰에는 보이는데 내보낸 PNG에서만 사라지는
 * 조용한 불일치가 생긴다. 그래서 실제로 그려지는 View를 겹쳐 그림자를 만든다 —
 * 두 플랫폼이 같은 결과를 내고 캡처에도 그대로 들어간다.
 *
 * **밝은 광휘가 아니라 어두운 그림자인 이유**: 배경이 순검정이던 시절에는 검은 그림자가
 * 원리상 보이지 않아 흰 광휘를 썼다. 배경을 크림으로 바꾸면서 그 전제가 뒤집혀 반전했다 —
 * 밝은 배경 위의 흰 광휘는 보이지 않거나 뿌옇게 지저분해진다.
 * **배경색을 다시 건드릴 때는 이 그림자 방향도 함께 검토해야 한다.**
 *
 * 검정 알파 합성은 배경을 곱셈으로 어둡게 만들어 색조(따뜻한 크림)를 그대로 보존한다 —
 * 색을 따로 warm 톤으로 조색할 필요가 없다.
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
 * 폴라로이드 그림자(BS-3). 폴라로이드 폭 대비 0.030 × 0.66 ≈ 캔버스 폭의 2.0%.
 * 경계는 배경색(#E6E0D4)이 만들고 그림자는 바닥에 닿은 자리만 아주 옅게 앉히는
 * 역할이라 누적 4.4%로 좁고 얕게 둔다 — 알파를 올리면 그림자가 과해 보인다.
 * 캔버스 여백(4:5 사방 17%, 9:16 좌우 16%) 안에 들어와 캡처 경계에서 잘리지 않는다.
 */
const POLAROID_SHADOW: ShadowSpec = {
  spreadRatio: 0.03,
  layerAlpha: 0.0055,
  offsetRatio: 0.006,
};

/**
 * 영수증 종이 그림자(BS-8). 폴라로이드와 달리 바닥이 **사진**이라 배경색이 경계를
 * 만들어 주지 않는다 — 종이가 사진에서 떠 보이도록 조금 더 넓고 진하게(누적 11%) 준다.
 * 스크림과 이 그림자가 함께 종이를 분리한다.
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
        // 그림자가 사진 영역 탭을 가로채지 않게 한다.
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
 * 캡처 대상 캔버스(BS-3, BS-5, BS-8).
 *
 * 템플릿에 따라 두 가지를 그린다.
 * - 폴라로이드: 단독 출력이면 폴라로이드 자체가 캔버스이고, 4:5·9:16이면
 *   크림 배경 위 가운데에 폴라로이드를 얹는다.
 * - 영수증: 사진이 캔버스를 꽉 채우고(`cover`) 그 위에 스크림 + 영수증 종이를 얹는다.
 *
 * 어느 쪽이든 이 View 전체가 캡처된다.
 */
const BagFilmCardCanvasView: FC<Props> = ({
  filmCard,
  cardRef,
  width,
  height,
  polaroidWidth,
  labelWidth,
  labelItemLimit,
  labelGesture,
  labelStyle,
  onLayoutLabel,
  onPressPhoto,
  onLayoutCanvas,
}) => {
  const isLabel = filmCard.getTemplate() === FilmCardTemplate.Label;
  const photoUri = filmCard.getPhotoUri();

  if (isLabel) {
    return (
      <View
        ref={cardRef}
        style={[
          styles.labelCanvas,
          // 라벨은 항상 고정 규격(4:5·9:16)이라 높이가 들어오지만, 타입상 null을 허용하므로
          // 정사각으로 떨어뜨려 크기가 비는 프레임이 생기지 않게 한다.
          { width, height: height ?? width },
        ]}
        onLayout={onLayoutCanvas}
        // Android가 캡처 대상 View를 레이아웃에서 합쳐 없애지 않도록 한다.
        collapsable={false}
      >
        {/* 사진 영역 탭 = 사진 다시 고르기. 종이보다 **먼저** 선언해 아래에 깔리게 한다 —
            종이를 탭했을 때는 이 영역이 아니라 종이가 터치 대상이 되어 피커가 열리지 않는다(BS-9).
            화면 하단에 같은 동작의 레이블된 버튼이 있어 스크린 리더에는 중복 노출하지 않는다. */}
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
            <>
              <Image
                source={{ uri: photoUri }}
                style={styles.labelPhoto}
                resizeMode='cover'
              />
              {/* 스크림은 사진 위·종이 아래에 깔린다(BS-8). 터치 영역 안에 두어
                  사진 영역 탭이 그대로 동작하게 한다. */}
              <View style={styles.photoScrim} />
            </>
          ) : null}
        </TouchableOpacity>
        <GestureDetector gesture={labelGesture}>
          <Animated.View style={labelStyle} onLayout={onLayoutLabel}>
            {/* 그림자 레이어를 종이보다 먼저 선언해 뒤에 깔리게 한다 — RN은 (웹과 달리)
                absolute 자식을 자동으로 위로 올리지 않고 선언 순서대로 그린다.
                종이 높이는 내용이 정하므로 레이어는 인셋(top/bottom/left/right)으로 잡는다. */}
            <View style={styles.paperHolder}>
              {renderShadowLayers(labelWidth, PAPER_SHADOW)}
              <BagFilmCardSpecLabelView
                filmCard={filmCard}
                width={labelWidth}
                itemLimit={labelItemLimit}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }

  const hasBackground = height !== null;

  return (
    <View
      ref={cardRef}
      style={[
        { width },
        hasBackground ? styles.background : null,
        hasBackground ? { height } : null,
      ]}
      onLayout={onLayoutCanvas}
      // Android가 캡처 대상 View를 레이아웃에서 합쳐 없애지 않도록 한다.
      collapsable={false}
    >
      {/* 그림자 레이어를 폴라로이드보다 먼저 선언해 뒤에 깔리게 한다 —
          RN은 (웹과 달리) absolute 자식을 자동으로 위로 올리지 않고 선언 순서대로 그린다. */}
      <View style={styles.polaroidHolder}>
        {hasBackground
          ? renderShadowLayers(polaroidWidth, POLAROID_SHADOW)
          : null}
        <BagFilmCardPolaroidView
          filmCard={filmCard}
          width={polaroidWidth}
          onPressPhoto={onPressPhoto}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: CANVAS_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 폴라로이드 크기에 맞춰 자동으로 잡히는 기준 박스. 그림자 레이어가 이 박스 바깥으로
  // 음수 인셋만큼 퍼진다(overflow를 걸지 않아야 캡처에 그대로 들어온다).
  polaroidHolder: {
    position: 'relative',
  },
  labelCanvas: {
    backgroundColor: EMPTY_PHOTO_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    // 사진과 옮긴 텍스트 블록이 캔버스를 넘지 않게 자른다.
    // **폴라로이드에는 절대 걸지 않는다** — 캔버스 밖으로 퍼지는 그림자 레이어가 잘린다.
    overflow: 'hidden',
  },
  labelPhoto: {
    width: '100%',
    height: '100%',
  },
  photoScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: PHOTO_SCRIM_COLOR,
  },
  // 종이 크기에 맞춰 자동으로 잡히는 기준 박스. 그림자 레이어가 이 박스 바깥으로
  // 음수 인셋만큼 퍼진다(overflow를 걸지 않아야 캡처에 그대로 들어온다).
  paperHolder: {
    position: 'relative',
  },
  shadowLayer: {
    position: 'absolute',
  },
});

export default observer(BagFilmCardCanvasView);
