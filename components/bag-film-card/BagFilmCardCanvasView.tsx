import { FC, RefObject } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import BagFilmCardPolaroidView from '@/components/bag-film-card/BagFilmCardPolaroidView';

interface Props {
  filmCard: BagFilmCard;
  // 캡처 대상 View의 ref. observer 래핑 컴포넌트라 ref를 명시 prop으로 받는다.
  cardRef: RefObject<View | null>;
  width: number;
  // 배경 캔버스 높이(pt). 폴라로이드 단독 출력은 내용이 높이를 정하므로 null.
  height: number | null;
  polaroidWidth: number;
  onPressPhoto: () => void;
  onLayoutCanvas: (event: LayoutChangeEvent) => void;
}

// 4:5 / 9:16 배경색(BS-3). 내보내기 캔버스 팔레트라 디자인 토큰 예외 대상이다.
// 크림 — 순검정은 인화지의 따뜻한 톤과 부딪혀 앱 UI처럼 보였다.
// 인화지(#F2F0EB)보다 확실히 어두운 값을 쓴다: 카드 경계를 **색**이 만들어야 그림자를
// 은은하게 둘 수 있다. 더 밝게 잡으면 경계가 전부 그림자에 실려 그림자가 과해진다.
const CANVAS_COLOR = '#E6E0D4';

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
// 폴라로이드 폭 대비 총 확산 폭(0.030 × 0.66 ≈ 캔버스 폭의 2.0%). 경계는 배경색이
// 만들고 그림자는 띄우는 역할만 하므로 좁게 둔다. 캔버스 여백(4:5 사방 17%, 9:16 좌우 16%)
// 안에 충분히 들어와 캡처 경계에서 잘리지 않는다.
const SHADOW_SPREAD_RATIO = 0.03;
// 레이어당 알파. 배경을 인화지보다 충분히 어둡게(#E6E0D4) 잡아 카드 경계는 색이 만들므로,
// 그림자는 바닥에 닿은 자리만 아주 옅게 앉히는 역할이다 — 누적 4.4%.
// (경계까지 그림자에 맡기려고 알파를 올리면 그림자가 과해 보인다.)
const SHADOW_LAYER_ALPHA = 0.0055;
// 위에서 빛이 오는 느낌을 주려고 그림자를 아래로 살짝 내린다.
const SHADOW_OFFSET_RATIO = 0.006;

const renderShadowLayers = (polaroidWidth: number) => {
  const step = (polaroidWidth * SHADOW_SPREAD_RATIO) / SHADOW_LAYER_COUNT;
  const offset = polaroidWidth * SHADOW_OFFSET_RATIO;

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
            backgroundColor: `rgba(0, 0, 0, ${SHADOW_LAYER_ALPHA})`,
          },
        ]}
      />
    );
  });
};

/**
 * 캡처 대상 캔버스(BS-3, BS-5).
 *
 * 폴라로이드 단독 출력이면 폴라로이드 자체가 캔버스이고, 4:5·9:16이면
 * 크림 배경 위 가운데에 폴라로이드를 얹는다. 어느 쪽이든 이 View 전체가 캡처된다.
 */
const BagFilmCardCanvasView: FC<Props> = ({
  filmCard,
  cardRef,
  width,
  height,
  polaroidWidth,
  onPressPhoto,
  onLayoutCanvas,
}) => {
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
        {hasBackground ? renderShadowLayers(polaroidWidth) : null}
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
  shadowLayer: {
    position: 'absolute',
  },
});

export default observer(BagFilmCardCanvasView);
