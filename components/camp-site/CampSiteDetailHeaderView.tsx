import { FC } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgFontSize,
  AcgLayout,
  AcgRadius,
} from '@/constants/DesignTokens';

type IoniconName = keyof typeof Ionicons.glyphMap;

// 즐겨찾기 등록 상태의 별 색(CS-9) — 마커 캠핑장색과 동일한 시맨틱 노랑 리터럴(브랜드 액센트 아님).
const FAVORITE_STAR_COLOR = '#FFD700';

interface Props {
  name: string;
  typeLabel: string;
  region: string;
  description: string;
  imageUrl?: string | undefined;
  // 즐겨찾기(CS-9) — 주요 기능 버튼 행 맨 앞 pill. 등록 여부로 아이콘·라벨이 토글된다.
  isFavorite: boolean;
  onPressFavorite: () => void;
  // 위치로 이동(CS-2) — 지도에서 연 시트에만 있다(공유 딥링크 진입엔 되돌릴 지도가 없어 undefined).
  onPressMoveToSpot?: (() => void) | undefined;
  onPressShare: () => void;
  onPressNaverMap: () => void;
  onPressClose: () => void;
}

interface FeatureButtonProps {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  // 기본은 텍스트색. 즐겨찾기 등록 시 별에 시맨틱 노랑을 주는 등 아이콘 색만 달리할 때 쓴다.
  iconColor?: string | undefined;
}

// 주요 기능 pill(즐겨찾기·공유·네이버 지도·위치로 이동) — 아이콘 + 라벨, 44pt 터치(CS-3).
// 라벨이 함께 있어 아이콘 전용이 아니므로 라벨을 accessibilityLabel로 그대로 쓴다.
const FeatureButton: FC<FeatureButtonProps> = ({
  icon,
  label,
  onPress,
  iconColor,
}) => {
  return (
    <TouchableOpacity
      style={styles.featureButton}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={iconColor ?? Acg.ink} />
      <PretendardText style={styles.featureLabel} weight='medium'>
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

// 박지 상세 시트의 상단 블록(CS-3) — 네이버 지도 place 상세 얼개:
// 닫기(X) 행 → 이름 → 유형 배지·지역 → 설명 → 주요 기능 버튼 행 → 대표 사진.
// 액션은 아이콘 행이 아니라 라벨 달린 pill 버튼 행으로 내려 이름·설명이 폭을 온전히 쓰게 한다.
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
          제목과 **같은 줄**에 둔다 — 즐겨찾기 시트와 형태를 맞춘다(2026-08-04 사용자 지적).
          닫기만 있는 줄을 따로 두면 시트 상단에 빈 띠가 생기기도 했다. */}
      <View style={styles.titleRow}>
        <PretendardText
          style={styles.name}
          weight='bold'
          numberOfLines={1}
          ellipsizeMode='tail'
        >
          {name}
        </PretendardText>
        <TouchableOpacity
          onPress={onPressClose}
          style={styles.closeButton}
          accessibilityLabel='닫기'
          accessibilityRole='button'
        >
          <Ionicons name='close' size={24} color={Acg.ink} />
        </TouchableOpacity>
      </View>

      {/* 유형·지역을 `·`로 이어 붙인 메타 한 줄 — 배지를 걷었다(목록 행과 같은 규칙). */}
      <View style={styles.metaRow}>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {[typeLabel, region].filter(Boolean).join(' · ')}
        </PretendardText>
      </View>

      {/* 설명 — "어떤 곳인지"가 사진·탭보다 먼저 읽히도록 이름 바로 아래에 둔다. 비면 생략(CS-3). */}
      {description ? (
        <PretendardText style={styles.description}>
          {description}
        </PretendardText>
      ) : null}

      {/* 주요 기능 버튼 행 — 넘치면 가로 스크롤. 좌우 패딩을 상쇄해 화면 폭을 온전히 쓴다(CS-3). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.featureScrollBleed}
        contentContainerStyle={styles.featureRow}
      >
        {/* 즐겨찾기(CS-9) — 주요 기능 행 맨 앞. 등록 시 채운 별 + 시맨틱 노랑, 라벨은 '즐겨찾기됨'. */}
        <FeatureButton
          icon={isFavorite ? 'star' : 'star-outline'}
          iconColor={isFavorite ? FAVORITE_STAR_COLOR : undefined}
          label={isFavorite ? '즐겨찾기됨' : '즐겨찾기'}
          onPress={onPressFavorite}
        />
        <FeatureButton
          icon='share-outline'
          label='공유'
          onPress={onPressShare}
        />
        {/* 외부 길찾기 성격이라 조준 아이콘(위치로 이동)과 구분되는 방향 화살표를 쓴다(CS-3). */}
        <FeatureButton
          icon='navigate-outline'
          label='네이버 지도'
          onPress={onPressNaverMap}
        />
        {onPressMoveToSpot ? (
          <FeatureButton
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
    paddingHorizontal: AcgLayout.screenPadding,
    // 시트 상단엔 네이티브 그래버가 그려진다 — 여유를 안 주면 제목·닫기가 그래버에 붙는다.
    paddingTop: 12,
    paddingBottom: 12,
  },
  // 제목 + 닫기 한 줄(즐겨찾기 시트와 같은 형태).
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    // 아이콘의 시각 중심을 화면 여백에 맞추려 컨테이너를 바깥으로 당긴다.
    marginRight: -10,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시트 제목 — 화면 제목·즐겨찾기 시트와 같은 층.
  name: {
    flex: 1,
    fontSize: AcgFontSize.screenTitle,
    lineHeight: 30,
    color: Acg.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  /**
   * 유형은 **배지가 아니라 메타 글자**다(2026-08-12). 목록·행에서 배지를 걷은 것과 같은 이유로,
   * 값 하나 때문에 제목 아래 작은 사각형을 만들지 않는다. 지역과 `·`로 이어 붙인다.
   */
  meta: {
    flexShrink: 1,
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  description: {
    marginTop: 10,
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 22,
    color: Acg.ink,
  },
  featureScrollBleed: {
    marginTop: 14,
    marginHorizontal: -AcgLayout.screenPadding,
  },
  featureRow: {
    gap: AcgLayout.chipGap,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // 앱의 칩과 같은 연회색 채움 + 모서리 10 — 아웃라인은 순백 지면에서 테두리만 남았다.
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  featureLabel: {
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
  image: {
    marginTop: 16,
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
});

export default CampSiteDetailHeaderView;
