import { FC, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import WarehouseDetailBrandPreviewView from './WarehouseDetailBrandPreviewView';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import { getBrandLinkLabel } from '../../model/gear/GearBrandLink';

interface Props {
  warehouseDetail: WarehouseDetail;
}

/**
 * 외부 링크 섹션(GD-5) — 브랜드 공식몰 · 쿠팡 파트너스.
 *
 * 차례는 **브랜드 → 쿠팡**이다. 실데이터 커버리지가 90.8% 대 0.1%라 브랜드 행이 사실상
 * 기본이고 쿠팡은 예외다 — 기본을 위에 두지 않으면 대다수 장비에서 섹션 첫 줄이 빈다.
 *
 * 브랜드 행은 링크 미리보기 카드로 낸다(GD-5a).
 */
const WarehouseDetailPurchaseView: FC<Props> = ({ warehouseDetail }) => {
  const coupangUrl = warehouseDetail.getCoupangUrl();
  const productUrl = warehouseDetail.getProductUrl();

  // 둘 다 없으면 섹션 자체를 그리지 않는다.
  if (!coupangUrl && !productUrl) {
    return null;
  }

  const gear = warehouseDetail.getGear();
  // 링크 대상이 공식몰인지 편집숍인지에 따라 라벨이 갈린다 — 더 기어샵 같은 편집숍을
  // `{브랜드} 공식몰`이라 부르면 사실이 아니다.
  const brandLabel = getBrandLinkLabel(
    productUrl,
    gear?.getCompany(),
    gear?.getDisplayCompany()
  );

  const renderLink = (label: string, onPress: () => void): ReactNode => (
    <TouchableOpacity
      style={styles.link}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole='link'
      accessibilityLabel={`${label}, 상품 페이지 열기`}
    >
      <PretendardText style={styles.linkText}>{label}</PretendardText>
      <Ionicons name='chevron-forward' size={14} color={Acg.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <PretendardText weight='semibold' style={styles.title}>
        공식 링크
      </PretendardText>

      {/* 브랜드 행은 링크 미리보기 카드로 낸다(GD-5a). */}
      {productUrl ? (
        <WarehouseDetailBrandPreviewView
          warehouseDetail={warehouseDetail}
          label={brandLabel}
          productUrl={productUrl}
          imageUrl={warehouseDetail.getProductImageUrl()}
          loading={warehouseDetail.getIsProductImageLoading()}
        />
      ) : null}

      {/* 파트너스 고지는 **쿠팡 행에만** 딸린다 — 브랜드 링크는 수수료와 무관해서
          고지가 그 아래로 내려가면 사실과 다르다. */}
      {coupangUrl ? (
        <View style={styles.coupangGroup}>
          {renderLink('쿠팡에서 최저가 보기', () =>
            warehouseDetail.openCoupangUrl()
          )}
          <PretendardText style={styles.disclaimerText}>
            쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
            제공받습니다.
          </PretendardText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 이 섹션만은 종이 면을 두지 않는다(ACG) — 미리보기 카드가 이미 면을 갖고 있어
  // 종이 위에 종이를 얹으면 후기 섹션과 같은 무게로 읽힌다.
  container: {
    paddingHorizontal: AcgLayout.screenH,
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 17,
    color: Acg.ink,
  },
  coupangGroup: {
    paddingBottom: 12,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // 텍스트 높이(≈20pt)만으로는 HIG 최소 터치 타깃에 못 미친다. 고정 높이가 아니라
    // minHeight라 Dynamic Type으로 글자가 커져도 잘리지 않는다.
    minHeight: 44,
  },
  linkText: {
    fontSize: 14,
    color: Acg.textTertiary,
  },
  disclaimerText: {
    fontSize: 11,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
});

export default observer(WarehouseDetailPurchaseView);
