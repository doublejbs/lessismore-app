import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import AcgScreenBackground from '@/components/acg/AcgScreenBackground';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFiltersView from '@/components/warehouse/WarehouseFiltersView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import useGearAddAction from '@/components/warehouse/useGearAddAction';
import WarehouseSkeletonView from '@/components/warehouse/WarehouseSkeletonView';
import { josa } from 'josa';

interface Props {
  warehouse: Warehouse;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 고정(비스크롤) 상단 콘텐츠의 시작 위치 보정용.
const NATIVE_HEADER_HEIGHT = 44;
// 헤더와 카테고리 칩 사이 숨 쉴 틈. 붙으면 뒤로가기와 필터가 한 덩어리로 뭉친다(FD-3과 동일).
const HEADER_CONTENT_GAP = 12;
// 상단 고정 영역(headerContainer)의 행 간격. 검색 행 높이를 계산할 때 함께 빼야 한다.
const HEADER_ROW_GAP = 8;
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const WarehouseView: FC<Props> = ({ warehouse }) => {
  const router = useRouter();
  const handleAddGear = useGearAddAction();
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();
  const isLoading = warehouse.isLoading();
  const insets = useSafeAreaInsets();
  const [isSearching, setIsSearching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      warehouse.refresh();

      return () => {
        warehouse.setQuery('');
        setIsSearching(false);
      };
      // setIsSearching은 setState라 안정적이지만, 빠뜨리면 React Compiler가 추론한
      // 의존성과 어긋나 이 컴포넌트 최적화를 통째로 건너뛴다.
    }, [warehouse, setIsSearching])
  );

  useEffect(() => {
    warehouse.initialize();
  }, [warehouse]);

  const renderGearItems = () => {
    if (isLoading) {
      return <WarehouseSkeletonView />;
    } else if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            장비를 추가해 주세요
          </PretendardText>
        </View>
      );
    } else if (gears.length === 0) {
      const selectedFilter = warehouse.getSelectedFilter();

      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            {warehouse.getQuery().trim()
              ? '검색 결과가 없어요'
              : `${josa(`${selectedFilter.getName()}#{가}`)} 없습니다`}
          </PretendardText>
        </View>
      );
    } else {
      return gears.map(gear => (
        <WarehouseGearView
          key={gear.getId()}
          gear={gear}
          warehouse={warehouse}
        />
      ));
    }
  };

  const renderGears = () => {
    if (isLoading || isEmpty || gears.length === 0) {
      return renderGearItems();
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderGearItems()}
        <View
          // 플로팅 `장비 추가` 버튼에 마지막 행이 가리지 않게 한다. 하단 세이프에어리어는
          // Layout이 이미 넣으므로 여기서 다시 더하지 않는다(탭 루트일 때와 달라진 점).
          style={styles.listBottomSpace}
        />
      </ScrollView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout
        edges={IS_IOS ? IOS_EDGES : undefined}
        paddingHorizontal={AcgLayout.screenH}
        background={<AcgScreenBackground />}
      >
        {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
            시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
            창고는 탭 루트가 아니라 홈에서 들어오는 푸시 화면이라(HM-0) 다른 푸시 화면과
            같은 헤더를 쓴다. 검색은 우측 바 버튼으로 옮긴다 — 탭 루트 시절 large title 행에
            검색 버튼을 나란히 두던 배치(LG-3)는 그 화면이 탭 루트일 때의 제약이었다. */}
        <Stack.Screen
          options={{
            // 검색 중에는 헤더를 내린다. 그래야 검색 행이 헤더 자리를 **차지**해
            // 아래 콘텐츠가 밀리지 않는다(원래 타이틀 행 44 ↔ 검색 행 44 맞교환이던 것을
            // 네이티브 헤더로 바꾸면서 깨졌다). `창고` 타이틀도 검색 모드에선 군더더기다.
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: '창고',
            headerBackButtonDisplayMode: 'minimal',
            // 주 액션인 `장비 추가`를 바 버튼으로 올린다(2026-07-31). 검색은 하단 우측
            // 플로팅으로 내렸다 — 창고에서 자주 하는 일은 담기지 찾기가 아니다.
            headerRight: () => (
              <TouchableOpacity
                onPress={handleAddGear}
                hitSlop={8}
                accessibilityRole='button'
                accessibilityLabel='장비 추가'
              >
                <Ionicons name='add' size={26} color={Acg.ink} />
              </TouchableOpacity>
            ),
            /**
             * iOS 26 네이티브 검색(LG-3 재검토, 2026-07-31).
             *
             * `integratedButton`은 비활성 상태를 **버튼**으로 두고 탭하면 필드로 펼친다.
             * 다만 기본값(`allowToolbarIntegration: true`)이면 iPhone에서 **하단 툴바 가운데**로
             * 내려가므로 꺼서 상단 바에 남긴다 — 캘린더 앱과 같은 모습이다.
             *
             * 이 조합이 되면서 LG-3이 커스텀 행을 택했던 이유가 사라졌다. 그때 기각 사유는
             * "large title과 같은 행에 못 둔다"였는데, 창고가 푸시 화면이 되며 large title이 없다.
             */
            ...(isEmpty
              ? {}
              : {
                  headerSearchBarOptions: {
                    placement: 'integratedButton' as const,
                    allowToolbarIntegration: false,
                    // 검색을 펼칠 때 내비게이션 바를 감추지 않는다. iOS 26은 이 값을 문맥으로
                    // 정하는데, 감추는 쪽으로 판단되면 좌측 뒤로가기가 잠깐 가려졌다 사라진다.
                    // 뒤로가기는 검색 중에도 살아 있어야 하므로 명시적으로 끈다.
                    hideNavigationBar: false,
                    placeholder: '장비 검색',
                    // `cancelButtonText`는 iOS 26부터 무시된다 — 취소 버튼이 글자 없는
                    // X 아이콘으로 바뀌었다(react-native-screens에서도 deprecated).
                    // 그래서 지우기(⊗, 필드 안)와 검색 닫기(X, 필드 밖)가 나란히 보이는데,
                    // 둘 다 시스템이 그리는 것이라 앱에서 끄거나 합칠 수 없다.
                    hideWhenScrolling: false,
                    onChangeText: (
                      event: NativeSyntheticEvent<TextInputFocusEventData>
                    ) => warehouse.setQuery(event.nativeEvent.text),
                    onClose: () => warehouse.setQuery(''),
                  },
                }),
          }}
        />
        <View
          style={[
            styles.headerContainer,
            // 투명 헤더(상태바 + 44pt) 아래에서 고정 상단 콘텐츠가 시작하게 한다.
            // 검색 중에는 헤더가 없으므로 상태바 몫만 띄운다.
            IS_IOS && {
              paddingTop:
                insets.top + NATIVE_HEADER_HEIGHT + HEADER_CONTENT_GAP,
            },
          ]}
        >
          {isSearching && !IS_IOS ? (
            <View style={[styles.searchRow, IS_IOS && styles.searchRowIos]}>
              <View style={styles.searchBox}>
                <Ionicons name='search' size={18} color={Acg.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder='장비 검색'
                  placeholderTextColor={Acg.textSecondary}
                  value={warehouse.getQuery()}
                  onChangeText={value => warehouse.setQuery(value)}
                  autoCorrect={false}
                  returnKeyType='search'
                  autoFocus
                />
                {warehouse.getQuery().length > 0 && (
                  <TouchableOpacity
                    onPress={() => warehouse.setQuery('')}
                    hitSlop={8}
                    accessibilityRole='button'
                    accessibilityLabel='검색어 지우기'
                  >
                    <Ionicons
                      name='close-circle'
                      size={18}
                      color={Acg.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsSearching(false);
                  warehouse.setQuery('');
                }}
                style={styles.cancelButton}
                hitSlop={8}
                accessibilityRole='button'
                accessibilityLabel='검색 닫기'
              >
                <PretendardText style={styles.cancelText}>취소</PretendardText>
              </TouchableOpacity>
            </View>
          ) : (
            // Android/Web 커스텀 헤더 — 뒤로가기 + 타이틀 + 우측 검색(iOS는 네이티브 바가 대신한다).
            !IS_IOS && (
              <View style={styles.titleRow}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backButton}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='뒤로 가기'
                >
                  <Ionicons name='chevron-back' size={24} color={Acg.ink} />
                </TouchableOpacity>
                <PretendardText weight='bold' style={styles.titleText}>
                  창고
                </PretendardText>
                {/* iOS는 네이티브 바가 [검색][+]를 그린다 — 여기서도 같은 순서·같은 자리에
                      둬서 플랫폼 간 배치가 어긋나지 않게 한다. */}
                {!isEmpty && (
                  <TouchableOpacity
                    onPress={() => setIsSearching(true)}
                    style={styles.circleSearchButton}
                    hitSlop={8}
                    accessibilityRole='button'
                    accessibilityLabel='장비 검색'
                  >
                    <Ionicons name='search' size={20} color={Acg.ink} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleAddGear}
                  style={styles.circleSearchButton}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='장비 추가'
                >
                  <Ionicons name='add' size={24} color={Acg.ink} />
                </TouchableOpacity>
              </View>
            )
          )}
          {!isEmpty && <WarehouseFiltersView warehouse={warehouse} />}
        </View>
        <View style={styles.contentContainer}>{renderGears()}</View>
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
    gap: HEADER_ROW_GAP,
    marginTop: 8,
  },
  // HIG 최소 터치 타깃 44×44pt.
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -10,
  },
  listBottomSpace: {
    height: 100,
  },
  // 탭 루트 타이틀 행(전 플랫폼) — HIG large title 톤(좌측 큰 제목) + 같은 행 우측 검색 버튼.
  // 검색 모드(searchRow, 44)와 높이를 맞춰 토글 시 레이아웃 점프를 없앤다.
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  /**
   * Android·Web 헤더 타이틀. 32pt는 **탭 루트 시절 large title** 크기였는데, 푸시 화면에
   * 뒤로가기 + 버튼 둘까지 한 행에 들어가면서 과해졌다(실기기 확인). 푸시 화면 톤으로 낮춘다.
   *
   * `flex: 1`로 가운데 공간을 차지해 좌측 정렬로 두고 버튼을 오른쪽 끝으로 민다 — 억지로
   * 가운데 맞추면 좌우 버튼 수가 달라(1 대 2) 실제 중앙에서 어긋나 보인다(iOS 네이티브 바는
   * 시스템이 진짜 중앙에 놓으므로 그쪽과 다르게 가도 된다 — 안드로이드는 좌측 정렬이 표준).
   */
  titleText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    color: Acg.ink,
    marginLeft: 4,
  },
  // 원형 검색 버튼 — 시스템 바 버튼(44pt 원형)과 동일한 지오메트리.
  circleSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.paper,
  },
  searchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  /**
   * iOS에서 검색 행은 **네이티브 헤더가 비운 자리를 정확히 채운다**.
   *
   * 높이를 눈대중으로 맞추면 토글할 때마다 아래 콘텐츠가 몇 pt씩 튄다(실제로 그랬다).
   * 헤더를 감출 때 사라지는 높이가 `NATIVE_HEADER_HEIGHT + HEADER_CONTENT_GAP`이므로
   * 그 값을 그대로 행 높이로 준다 — 계산이 아니라 구조로 같아진다.
   */
  searchRowIos: {
    // 검색 행이 생기면 컨테이너의 `gap`이 한 번 더 들어가므로 그만큼 빼야 정확히 상쇄된다.
    height: NATIVE_HEADER_HEIGHT + HEADER_CONTENT_GAP - HEADER_ROW_GAP,
    marginBottom: 0,
  },
  cancelButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: Acg.ink,
  },
  // 지면 위 각진 종이 면 인풋(ACG) — 회색 채움은 지면과 붙어 입력 영역이 안 보인다.
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Acg.paper,
    borderRadius: 0,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
    padding: 0,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  // 행이 각자 종이 면이라 홈·배낭 목록과 같은 8px 간격을 준다(ACG).
  scrollContent: {
    flexDirection: 'column',
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: Acg.textSecondary,
  },
});

export default observer(WarehouseView);
