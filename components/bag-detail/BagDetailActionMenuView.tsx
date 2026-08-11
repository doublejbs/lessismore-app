import { ComponentProps, FC } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { setBagShareContext } from '@/model/bag-detail/BagShareHandoff';
import { setBagFilmCardContext } from '@/model/bag-film-card/BagFilmCardHandoff';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import { Liquid, LiquidLayout, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
  /**
   * 메뉴가 시작하는 y = 크롬 바닥. 플랫폼마다 크롬을 그리는 주체가 달라(LG-1: iOS는
   * 네이티브 투명 헤더, Android·Web은 유리 크롬) 호출부가 재서 넘긴다.
   */
  top: number;
  onClose: () => void;
}

// 웹은 캡처·네이티브 공유 시트가 없어 필름 카드 진입점을 노출하지 않는다(BS-1).
const IS_WEB = Platform.OS === 'web';

// 라벨 두 낱말(`필름 카드`)이 한 줄에 들어가는 폭.
const MENU_WIDTH = 184;

interface MenuItem {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

/**
 * BD-1 헤더 보조 액션 메뉴 (Liquid Depth).
 *
 * 복사·공유·필름 카드 **아이콘 셋을 오버플로 하나(⋯)로 접은 뒤 펼치는 메뉴**다
 * (2026-08-11 개정). 아이콘만 나란히 두면 세 개 중 어느 것도 무엇을 하는지 말하지 않고,
 * 특히 필름(`film-outline`)은 기능을 짐작할 수 없었다 — 여기서는 아이콘 옆에 **텍스트
 * 라벨**이 붙는다.
 *
 * 공용 `formSheet` 라우트(정렬 시트 계열)로 만들지 않은 이유는 그 프레젠테이션을
 * `app/_layout.tsx`가 정하기 때문이다 — 이 화면 하나를 위해 전역 라우트 스택을 건드리지
 * 않고, 화면 안 오버레이로 둔다. iOS 네이티브 헤더는 JS 뷰가 덮지 못하므로(패킹 완료
 * 카드와 같은 제약) 배경을 어둡히지 않는다 — 헤더만 안 어두워지면 더 어색하다.
 */
const BagDetailActionMenuView: FC<Props> = ({ bagDetail, top, onClose }) => {
  const router = useRouter();

  const handlePressCopy = () => {
    onClose();
    router.push({
      pathname: '/bag-copy',
      params: {
        sourceId: bagDetail.getId(),
        sourceName: bagDetail.getName(),
        entrySource: 'detail',
      },
    });
  };

  const handlePressShare = () => {
    onClose();
    app.getAnalyticsManager()?.logClick('bag_share');
    setBagShareContext(bagDetail);
    router.push('/bag-share');
  };

  const handlePressFilmCard = () => {
    onClose();
    app.getAnalyticsManager()?.logClick('film_card_open');
    setBagFilmCardContext(bagDetail);
    router.push('/bag-film-card');
  };

  const items: MenuItem[] = [
    { icon: 'copy-outline', label: '복사', onPress: handlePressCopy },
    { icon: 'share-outline', label: '공유', onPress: handlePressShare },
    ...(IS_WEB
      ? []
      : [
          {
            icon: 'film-outline' as const,
            label: '필름 카드',
            onPress: handlePressFilmCard,
          },
        ]),
  ];

  return (
    <View style={styles.overlay}>
      {/* 바깥을 눌러 닫는다. 스크린리더에도 나가는 길이 있어야 하므로 버튼으로 읽힌다. */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole='button'
        accessibilityLabel='메뉴 닫기'
      />
      <LiquidCard
        tone='paper'
        radius='tile'
        padding={0}
        clip
        style={[styles.card, { top }]}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.row, index > 0 && styles.rowDivided]}
            onPress={item.onPress}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel={item.label}
          >
            <Ionicons name={item.icon} size={19} color={Liquid.ink} />
            <PretendardText weight='medium' style={styles.rowLabel}>
              {item.label}
            </PretendardText>
          </TouchableOpacity>
        ))}
      </LiquidCard>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  card: {
    position: 'absolute',
    right: LiquidLayout.screenH,
    width: MENU_WIDTH,
  },
  row: {
    minHeight: LiquidLayout.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  rowDivided: {
    borderTopWidth: 0.5,
    borderTopColor: Liquid.hairline,
  },
  rowLabel: {
    fontSize: 15,
    color: Liquid.ink,
  },
});

export default observer(BagDetailActionMenuView);
