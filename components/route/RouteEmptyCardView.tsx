import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { getRouteDrawEntitlementMetaKey } from '@/model/route-draw/RouteDrawEntitlementMeta';

interface Props {
  // `이 여행의 코스를 그려 보세요`(배낭) / `그룹 코스를 그려 보세요`(그룹).
  title: string;
  onDraw: () => void;
  onImport: () => void;
  // GPX를 올리는 중 — 두 액션을 막고 보조 버튼 라벨이 `올리는 중`으로 바뀐다.
  isUploading: boolean;
  disabled: boolean;
  // 카드 높이(위 여백 포함)를 잰다 — 시트 접힘 단이 이 값으로 카드를 다 담는다(Dynamic Type 대응).
  onMeasure?: ((height: number) => void) | undefined;
}

/**
 * 코스 0개 빈 상태 카드 (RD-9 #1) — 배낭 코스 화면(BD-11)과 그룹 지도(GRP-10) 시트의 `코스` 세그먼트가 같은 것을 쓴다.
 *
 * 제목(섹션 제목 단) + 설명 + 라임 `지도에서 그리기`와 흰 보조 알약 `GPX 가져오기`를 같은 높이로 나란히(폭이 모자라거나
 * 큰 글자면 줄바꿈해 세로로 쌓인다) + 그 아래 권한 한 줄(RD-8, `코스 추가` 메뉴와 같은 판단). 메뉴를 거치지 않고 바로
 * 그리기·가져오기로 간다. 라임은 이 카드가 보이는 동안 그 화면의 주
 * 액션이다 — 같은 화면의 다른 라임(배낭 시트 푸터 `코스 추가` · 그룹 `포인트 추가`)은 호출부가 그동안 걷거나 흰
 * 보조로 내린다(HM-8 라임은 화면당 하나).
 *
 * 면은 시트 지면과 한 단 갈리는 연회색 채움 + 모서리 12, 그림자 없음(HM-8 — 콘텐츠 면이다).
 */
const RouteEmptyCardView: FC<Props> = ({
  title,
  onDraw,
  onImport,
  isUploading,
  disabled,
  onMeasure,
}) => {
  const l10n = app.getL10n();
  const metaKey = getRouteDrawEntitlementMetaKey();
  const drawLabel = l10n.t('routeDraw.menuDraw');
  const meta = metaKey ? l10n.t(metaKey) : null;
  const importLabel = l10n.t(
    isUploading ? 'bag.route.uploading' : 'routeDraw.emptyCardImport'
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    onMeasure?.(event.nativeEvent.layout.height);
  };

  return (
    <View style={styles.wrap} onLayout={handleLayout}>
      <View style={styles.card}>
        <View style={styles.textWrap}>
          <PretendardText weight='semibold' style={styles.title}>
            {title}
          </PretendardText>
          <PretendardText style={styles.description}>
            {l10n.t('routeDraw.emptyCardDescription')}
          </PretendardText>
        </View>
        <View style={styles.actionsWrap}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.drawButton, disabled && styles.disabled]}
              onPress={onDraw}
              disabled={disabled}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel={meta ? `${drawLabel}, ${meta}` : drawLabel}
              accessibilityState={{ disabled }}
            >
              <Ionicons name='create-outline' size={20} color={Acg.ink} />
              <PretendardText weight='semibold' style={styles.buttonLabel}>
                {drawLabel}
              </PretendardText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importButton, disabled && styles.disabled]}
              onPress={onImport}
              disabled={disabled}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel={importLabel}
              accessibilityState={{ disabled, busy: isUploading }}
            >
              <Ionicons name='document-outline' size={20} color={Acg.ink} />
              <PretendardText weight='semibold' style={styles.buttonLabel}>
                {importLabel}
              </PretendardText>
            </TouchableOpacity>
          </View>
          {meta ? (
            <PretendardText
              style={styles.meta}
              accessibilityElementsHidden
              importantForAccessibility='no'
            >
              {meta}
            </PretendardText>
          ) : null}
        </View>
      </View>
    </View>
  );
};

// 라임·흰 알약이 같은 높이·패딩을 쓴다(Dynamic Type — 고정 높이 대신 minHeight + 세로 패딩).
const PILL = {
  minHeight: 48,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: Radius.pill,
} as const;

const styles = StyleSheet.create({
  // 위 여백까지 한 번에 잰다(시트 단 계산이 이 높이를 그대로 쓴다).
  wrap: {
    paddingTop: 12,
  },
  card: {
    padding: 16,
    gap: 14,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  textWrap: {
    gap: 4,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
  },
  description: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  actionsWrap: {
    gap: 8,
  },
  // 두 알약을 가로로 — 폭이 모자라거나 큰 글자면 줄바꿈해 세로로 쌓인다.
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AcgLayout.chipGap + 2,
  },
  // 이 화면의 주 액션 — 라임 알약(HM-8). 글자는 잉크다.
  drawButton: {
    ...PILL,
    backgroundColor: Acg.lime,
  },
  // 보조 액션 — 흰 알약. 연회색 카드 면 위라 헤어라인 테두리로 면을 가른다(콘텐츠 면 위라 그림자 없음).
  importButton: {
    ...PILL,
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
  },
  buttonLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.meta,
    color: Acg.textMuted,
    paddingLeft: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default observer(RouteEmptyCardView);
