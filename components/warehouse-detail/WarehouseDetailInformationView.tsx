import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import GearImageView from '../warehouse/GearImageView';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';

interface Props {
  gear: Gear;
  canShowSharedImages?: boolean | undefined;
  onSelectOtherImage?: () => void;
}

const WarehouseDetailInformationView: FC<Props> = ({
  gear,
  canShowSharedImages,
  onSelectOtherImage,
}) => {
  const imageUrl = gear.getImageUrl();
  // 한글 표시명 우선 — 창고/검색 리스트와 동일한 이름으로 보이게 한다(GD-1).
  const company = gear.getDisplayCompany();
  const name = gear.getDisplayName();
  const weight = gear.getWeight();
  const color = gear.getDisplayColor();
  const size = gear.getDisplaySize();
  const isAdded = gear.isAdded();
  const category = gear.getCategory();
  // 세분 카테고리 한글 라벨 우선, 매핑에 없으면 그룹(GearFilter) 라벨 폴백(GD-1, DM-4). 카테고리 없으면 항목 생략.
  const categoryLabel = category
    ? gear.getFineCategoryLabel() || GEAR_FILTER_NAMES[gear.getGroupCategory()]
    : '';
  // 카테고리 · 색상 · 사이즈 메타 라인 — 빈 항목 생략, 모두 없으면 라인 미노출
  const metaLine = [categoryLabel, color, size].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <View style={styles.imageWrapper}>
            <GearImageView imageUrl={imageUrl} />
          </View>
        ) : (
          // 사진 없는 장비 — thumbBg 플레이스홀더 박스로 레이아웃 높이를 유지한다(GD-1).
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name='camera-outline'
              size={32}
              color={Color.textSecondary}
            />
          </View>
        )}
        {canShowSharedImages && isAdded && (
          <TouchableOpacity
            style={styles.selectOtherImageButton}
            onPress={onSelectOtherImage}
            accessibilityLabel='대표 사진 변경'
            accessibilityRole='button'
          >
            <Ionicons
              name='images-outline'
              size={20}
              color={Color.textPrimary}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.infoSection}>
        <View style={styles.productInfo}>
          <PretendardText style={styles.companyText}>{company}</PretendardText>
          <PretendardText
            weight='bold'
            style={styles.nameText}
            lineBreakStrategyIOS='hangul-word'
          >
            {name}
          </PretendardText>
          {metaLine ? (
            <PretendardText style={styles.metaText}>{metaLine}</PretendardText>
          ) : null}
        </View>
        <View style={styles.weightContainer}>
          <PretendardText style={styles.weightCaption}>무게</PretendardText>
          <PretendardText weight='bold' style={styles.weightText}>
            {weight}g
          </PretendardText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  imageWrapper: {
    height: 180,
    width: '100%',
  },
  imagePlaceholder: {
    height: 180,
    width: '100%',
    borderRadius: Radius.card,
    backgroundColor: Color.thumbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOtherImageButton: {
    // 이미지 영역 우하단 오버레이 원형 버튼 (HIG 44pt 터치 타깃)
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  companyText: {
    fontSize: 13,
    color: Color.textPrimary,
  },
  nameText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  metaText: {
    fontSize: 13,
    color: Color.textSecondary,
    marginTop: 4,
  },
  weightContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  weightCaption: {
    fontSize: 11,
    color: Color.textSecondary,
    marginBottom: 2,
  },
  weightText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
});

export default observer(WarehouseDetailInformationView);
