import { FC, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import WarehouseDetailBrandPreviewView from './WarehouseDetailBrandPreviewView';
import { Acg, AcgFontSize, AcgLayout } from '@/constants/DesignTokens';
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

  // 쿠팡 행 — 종이 면 위 좌측 정렬 행(ACG, 2026-08-04 디자인 리뷰).
  // 외부로 나가는 링크라 후기 카드와 같은 open-outline 기호를 쓴다.
  const renderLink = (label: string, onPress: () => void): ReactNode => (
    <TouchableOpacity
      style={styles.link}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole='link'
      accessibilityLabel={`${label}, 외부 브라우저로 이동`}
    >
      <PretendardText style={styles.linkText} weight='medium'>
        {label}
      </PretendardText>
      <Ionicons name='open-outline' size={16} color={Acg.textMuted} />
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
  // 섹션 자체는 종이 면을 두지 않는다(ACG) — 미리보기 카드·쿠팡 행이 각자 면을 갖고 있어
  // 종이 위에 종이를 얹으면 후기 섹션과 같은 무게로 읽힌다.
  container: {
    paddingHorizontal: AcgLayout.screenH,
    marginBottom: 22,
    gap: 12,
  },
  title: {
    fontSize: AcgFontSize.rowTitle,
    color: Acg.ink,
  },
  coupangGroup: {
    gap: 8,
  },
  /**
   * 종이 면 행(ACG). 이 화면의 다른 요소가 전부 좌측 정렬인데 이 블록만 가운데 정렬이라
   * 페이지 축에서 떨어져 나왔고, 면도 테두리도 없어 누를 수 있는 것으로 읽히지 않았다
   * (2026-08-04 디자인 리뷰). 잉크 버튼으로 세우지는 않는다 — 시안에서도 조용한 고지다.
   *
   * 세로 패딩으로 44pt 터치 타깃을 만든다(고정 높이는 Dynamic Type에서 잘린다).
   */
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    backgroundColor: Acg.controlFill,
  },
  linkText: {
    fontSize: 14,
    color: Acg.ink,
  },
  // 고지는 조용히 둔다 — 면 밖, 좌측 정렬.
  disclaimerText: {
    fontSize: AcgFontSize.meta,
    lineHeight: 15,
    color: Acg.textMuted,
  },
});

export default observer(WarehouseDetailPurchaseView);
