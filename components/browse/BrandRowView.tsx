import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BrandRankData } from '@/model/search/BrandRankStore';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  brand: BrandRankData;
  onPress: () => void;
  selected?: boolean;
  showCount?: boolean;
}

// 선택 행 우측에 노출하는 검정 체크(✓) 아이콘 — BrowseSortButtonView의 CheckIcon 패턴 재사용.
const CheckIcon = () => (
  <Svg width={20} height={20} viewBox='0 0 20 20' fill='none'>
    <Path
      d='M4 10.5L8 14.5L16 5.5'
      stroke={Color.textPrimary}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

// 브랜드 디렉토리와 탐색 홈 브랜드 미리보기가 공유하는 브랜드 행.
// 이름 + (옵션)`제품 n` 보조 라벨 + 하단 구분선으로 밀도를 통일한다.
// `showCount`가 false면 제품 수를 숨긴다(피드 브랜드 필터 시트).
// 보유 수(ownerCount)는 정렬 키로만 쓰고 노출하지 않는다.
// selected는 피드 필터 시트에서 현재 선택된 브랜드 행을 강조하는 용도(기본 미강조).
// 선택 시 은은한 배경 + 브랜드명 bold + 우측 검정 체크(✓)로 대비를 준다.
// 브랜드 디렉토리(단일 화면)는 selected를 넘기지 않으므로 기존 동작에 영향이 없다.
const BrandRowView: FC<Props> = ({
  brand,
  onPress,
  selected = false,
  showCount = true,
}) => {
  const name = brand.companyKorean || brand.company;
  const meta =
    showCount && typeof brand.gearCount === 'number'
      ? `제품 ${brand.gearCount}`
      : '';

  return (
    <TouchableOpacity
      style={[styles.brandItem, selected && styles.brandItemSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.brandInfo}>
        <PretendardText
          style={[styles.brandName, selected && styles.brandNameSelected]}
          weight={selected ? 'bold' : 'semibold'}
        >
          {name}
        </PretendardText>
        {meta.length > 0 ? (
          <PretendardText style={styles.brandMeta}>{meta}</PretendardText>
        ) : null}
      </View>
      {selected ? <CheckIcon /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: -12,
    borderRadius: Radius.card,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
    gap: 8,
  },
  brandItemSelected: {
    backgroundColor: Color.surfaceMuted,
    borderBottomColor: 'transparent',
  },
  brandInfo: {
    flex: 1,
    gap: 4,
  },
  brandName: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  brandNameSelected: {
    color: Color.textPrimary,
  },
  brandMeta: {
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default BrandRowView;
