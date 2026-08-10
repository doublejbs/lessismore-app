import { FC } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidSemantic,
  LiquidShadow,
} from '@/constants/DesignTokens';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Props {
  name: string;
  typeLabel: string;
  region: string;
  description: string;
  imageUrl?: string | undefined;
  // 즐겨찾기(CS-9) — 액션 칩 행 맨 앞. 등록 여부로 아이콘·라벨이 토글된다.
  isFavorite: boolean;
  onPressFavorite: () => void;
  // 위치로 이동(CS-2) — 지도에서 연 시트에만 있다(공유 딥링크 진입엔 되돌릴 지도가 없어 undefined).
  onPressMoveToSpot?: (() => void) | undefined;
  onPressShare: () => void;
  onPressNaverMap: () => void;
  onPressClose: () => void;
}

interface ActionChipProps {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  // 기본은 잉크. 즐겨찾기 등록 시 별에 시맨틱 노랑을 주는 등 아이콘 색만 달리할 때 쓴다.
  iconColor?: string | undefined;
  // 켜진 상태(즐겨찾기됨) — 라벨을 한 단계 굵게 올려 상태를 글자로도 말한다.
  active?: boolean;
}

// 액션 칩 높이(목업 §10). HIG 44는 세로 여유로만 채운다: (44 − 40) / 2 = 2 → 3.
const ACTION_CHIP_HEIGHT = 40;
const ACTION_CHIP_HIT_SLOP = { top: 3, bottom: 3, left: 0, right: 0 };

// 닫기 원(목업 §10)은 36이고, HIG 44는 여유로 채운다: (44 − 36) / 2 = 4.
const CLOSE_BUTTON_SIZE = 36;
const CLOSE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

/**
 * 박지 상세 시트의 액션 칩(즐겨찾기·공유·네이버 지도·위치로 이동, CS-3).
 * 지면 위에 뜬 흰 알약이고 라벨이 함께 있어 아이콘 전용이 아니므로 라벨을 그대로 쓴다.
 */
const ActionChip: FC<ActionChipProps> = ({
  icon,
  label,
  onPress,
  iconColor,
  active = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.actionChip}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      hitSlop={ACTION_CHIP_HIT_SLOP}
      accessibilityRole='button'
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={17} color={iconColor ?? Liquid.ink} />
      <PretendardText
        weight={active ? 'semibold' : 'medium'}
        style={styles.actionLabel}
        numberOfLines={1}
      >
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

// 박지 상세 시트의 상단 블록(CS-3):
// 유형 배지·지역 → 이름 → 설명 → 액션 칩 행 → 대표 사진. 닫기(X)는 우상단 중립 배지 원이다.
const CampSiteDetailHeaderView: FC<Props> = ({
  name,
  typeLabel,
  region,
  description,
  imageUrl,
  isFavorite,
  onPressFavorite,
  onPressMoveToSpot,
  onPressShare,
  onPressNaverMap,
  onPressClose,
}) => {
  return (
    <View style={styles.header}>
      {/* 상세는 지도 위 바텀 시트(CS-2)라 뒤로 가기가 아니라 우상단 닫기(X)만 둔다.
          유형 배지 줄과 같은 높이에서 시작해 시트 상단에 빈 띠가 생기지 않는다. */}
      <View style={styles.titleRow}>
        <View style={styles.titleTexts}>
          <View style={styles.metaRow}>
            {/* 잉크 면 위 **라임 글자**는 이 자리 하나뿐이다(목업 §10) — 유형이 이 화면의
                첫 사실이라 배지를 액센트로 세운다. 하단 라임 CTA와는 면/글자로 갈린다. */}
            <View style={styles.typeBadge}>
              <PretendardText style={styles.typeBadgeText} weight='semibold'>
                {typeLabel}
              </PretendardText>
            </View>
            <PretendardText style={styles.region} numberOfLines={1}>
              {region}
            </PretendardText>
          </View>

          <PretendardText
            style={styles.name}
            weight='bold'
            numberOfLines={2}
            ellipsizeMode='tail'
          >
            {name}
          </PretendardText>
        </View>

        <TouchableOpacity
          onPress={onPressClose}
          style={styles.closeButton}
          hitSlop={CLOSE_HIT_SLOP}
          accessibilityLabel='닫기'
          accessibilityRole='button'
        >
          <Ionicons name='close' size={20} color={Liquid.ink} />
        </TouchableOpacity>
      </View>

      {/* 설명 — "어떤 곳인지"가 사진·탭보다 먼저 읽히도록 이름 바로 아래에 둔다. 비면 생략(CS-3). */}
      {description ? (
        <PretendardText style={styles.description}>
          {description}
        </PretendardText>
      ) : null}

      {/* 액션 칩 행 — 넘치면 가로 스크롤. 좌우 패딩을 상쇄해 화면 폭을 온전히 쓴다(CS-3). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.actionScrollBleed}
        contentContainerStyle={styles.actionRow}
      >
        {/* 즐겨찾기(CS-9) — 행 맨 앞. 등록 시 채운 별 + 시맨틱 노랑, 라벨은 '즐겨찾기됨'. */}
        <ActionChip
          icon={isFavorite ? 'star' : 'star-outline'}
          iconColor={isFavorite ? LiquidSemantic.favorite : undefined}
          label={isFavorite ? '즐겨찾기됨' : '즐겨찾기'}
          active={isFavorite}
          onPress={onPressFavorite}
        />
        <ActionChip icon='share-outline' label='공유' onPress={onPressShare} />
        {/* 외부 길찾기 성격이라 조준 아이콘(위치로 이동)과 구분되는 방향 화살표를 쓴다(CS-3). */}
        <ActionChip
          icon='navigate-outline'
          label='네이버 지도'
          onPress={onPressNaverMap}
        />
        {onPressMoveToSpot ? (
          <ActionChip
            icon='locate'
            label='위치로 이동'
            onPress={onPressMoveToSpot}
          />
        ) : null}
      </ScrollView>

      {/* 대표 사진(CS-3) — 있으면 표시, 없으면 생략. v1은 단일 이미지. */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit='cover'
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: LiquidLayout.screenH,
    // 시트 상단엔 네이티브 그래버가 그려진다 — 여유를 안 주면 배지·닫기가 그래버에 붙는다.
    paddingTop: 14,
  },
  // 배지·이름 블록 + 우상단 닫기. 이름이 두 줄이 되어도 닫기는 첫 줄 높이에 머문다.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleTexts: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 잘리지 않는다.
  typeBadge: {
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.ink,
  },
  typeBadgeText: {
    fontSize: 11.5,
    color: Liquid.lime,
  },
  region: {
    flexShrink: 1,
    fontSize: 13,
    color: Liquid.inkTertiary,
  },
  name: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.8,
    color: Liquid.ink,
  },
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    borderRadius: CLOSE_BUTTON_SIZE / 2,
    backgroundColor: Liquid.badgeFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: Liquid.inkSecondary,
  },
  actionScrollBleed: {
    marginTop: 16,
    marginHorizontal: -LiquidLayout.screenH,
  },
  actionRow: {
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 흰 알약 — 지면 위에 뜬 보조 액션이라 그림자로만 지면과 갈린다.
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: ACTION_CHIP_HEIGHT,
    paddingHorizontal: 15,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  actionLabel: {
    fontSize: 13.5,
    color: Liquid.ink,
  },
  image: {
    marginTop: 16,
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
});

export default CampSiteDetailHeaderView;
