import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { BrandRankData } from '@/model/search/BrandRankStore';
import PretendardText from '../PretendardText';

interface Props {
  brand: BrandRankData;
  onPress: () => void;
}

// 브랜드 디렉토리와 탐색 홈 브랜드 미리보기가 공유하는 브랜드 행.
// 이름 + `제품 n` 보조 라벨 + 하단 구분선으로 밀도를 통일한다.
// 보유 수(ownerCount)는 정렬 키로만 쓰고 노출하지 않는다.
const BrandRowView: FC<Props> = ({ brand, onPress }) => {
  const name = brand.companyKorean || brand.company;
  const meta =
    typeof brand.gearCount === 'number' ? `제품 ${brand.gearCount}` : '';

  return (
    <TouchableOpacity
      style={styles.brandItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <PretendardText style={styles.brandName} weight='semibold'>
        {name}
      </PretendardText>
      {meta.length > 0 ? (
        <PretendardText style={styles.brandMeta}>{meta}</PretendardText>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  brandItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 4,
  },
  brandName: {
    fontSize: 16,
    color: '#000',
  },
  brandMeta: {
    fontSize: 13,
    color: '#888',
  },
});

export default BrandRowView;
