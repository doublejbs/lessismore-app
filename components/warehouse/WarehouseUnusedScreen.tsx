import { FC, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseCategoryChipsView from '@/components/warehouse/WarehouseCategoryChipsView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import WarehouseSkeletonView from '@/components/warehouse/WarehouseSkeletonView';

interface Props {
  warehouse: Warehouse;
}

const SCREEN_TITLE = '안 쓴 장비';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 고정(비스크롤) 상단 콘텐츠의 시작 위치 보정용.
const NATIVE_HEADER_HEIGHT = 44;
// 헤더와 콘텐츠 사이 숨 쉴 틈(창고·인기 순위와 같은 값).
const HEADER_CONTENT_GAP = 12;
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

/**
 * WH-2-1 `안 쓴 장비` 전용 화면.
 *
 * 창고에서 필터를 켜던 것을 화면으로 분리했다(2026-08-13) — **제목이 무엇이 걸려 있는지를
 * 말해 준다.** 행은 창고와 같은 `WarehouseGearView`(삭제 스와이프 포함)라, 여기서 지운
 * 장비는 창고에서도 사라진다.
 *
 * **1차 카테고리 칩 행을 둔다**(2026-08-13 사용자 결정) — 창고와 공용
 * `WarehouseCategoryChipsView`이고, 창고에서 보던 카테고리를 `?category=`로 승계해
 * 선택된 채 열린다. 세분(2차) 칩·정렬·검색은 두지 않는다: 이 화면은 이미 사용률 축으로
 * 좁혀진 부분집합이라 모수가 작고, 축을 더하면 창고와 같은 화면이 된다.
 */
const WarehouseUnusedScreen: FC<Props> = ({ warehouse }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gears = warehouse.getGears();
  const isLoading = warehouse.isLoading();

  useEffect(() => {
    warehouse.initialize();
  }, [warehouse]);

  // 장비 상세에서 사용 기록이 바뀌면 판정이 달라진다 — 돌아올 때 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      warehouse.refresh();
    }, [warehouse])
  );

  const handleBack = () => {
    router.back();
  };

  const renderContent = () => {
    if (isLoading) {
      return <WarehouseSkeletonView />;
    } else if (gears.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            안 쓴 장비가 없어요
          </PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {gears.map((gear, index) => (
          <WarehouseGearView
            key={gear.getId()}
            gear={gear}
            warehouse={warehouse}
            divided={index > 0}
          />
        ))}
        <View style={styles.listBottomSpace} />
      </ScrollView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout
        edges={IS_IOS ? IOS_EDGES : undefined}
        paddingHorizontal={AcgLayout.screenH}
      >
        {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back·scroll edge effect는 시스템에 위임한다. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: SCREEN_TITLE,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <View
          style={[
            styles.headerContainer,
            // 투명 헤더(상태바 + 44pt) 아래에서 콘텐츠가 시작하게 한다.
            IS_IOS && {
              paddingTop:
                insets.top + NATIVE_HEADER_HEIGHT + HEADER_CONTENT_GAP,
            },
          ]}
        >
          {!IS_IOS && (
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                hitSlop={8}
                accessibilityRole='button'
                accessibilityLabel='뒤로 가기'
              >
                <Ionicons name='chevron-back' size={24} color={Acg.ink} />
              </TouchableOpacity>
              <PretendardText weight='bold' style={styles.titleText}>
                {SCREEN_TITLE}
              </PretendardText>
            </View>
          )}
          {/* WH-2-1 1차 카테고리 칩 행 — 목록이 0건이어도 계속 낸다(좁혀서 비었을 때
              넓힐 방법이 화면에 남아 있어야 한다). */}
          <View style={styles.chipsRow}>
            <WarehouseCategoryChipsView
              warehouse={warehouse}
              analyticsElement='warehouse_unused_filter'
            />
          </View>
        </View>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </Layout>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'column',
    marginTop: 8,
  },
  // 창고 헤더 행과 같은 치수 — 화면을 오갈 때 제목 위치가 흔들리지 않는다.
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // HIG 최소 터치 타깃 44×44pt.
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -10,
  },
  titleText: {
    flex: 1,
    ...AcgType.screenTitle,
    color: Acg.ink,
    marginLeft: 4,
  },
  // 칩 행과 목록 사이 간격 — 창고 필터 영역과 같은 리듬으로 둔다.
  chipsRow: {
    marginBottom: 8,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'column',
    gap: 8,
  },
  // 스크롤 끝 여백. 이 화면에는 플로팅 요소가 없어 창고보다 작게 둔다.
  listBottomSpace: {
    height: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    textAlign: 'center',
    color: Acg.textMuted,
  },
});

export default observer(WarehouseUnusedScreen);
