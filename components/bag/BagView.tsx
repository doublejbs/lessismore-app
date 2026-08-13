import { useCallback, useEffect, useState } from 'react';
import { Alert, View, ScrollView, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import BagItemView from './BagItemView';
import { groupBagsByTripSection } from '@/model/bag/BagTripSection';
import BagAddView from './BagAddView';
import BagListSkeletonView from './BagListSkeletonView';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import { useFocusEffect } from 'expo-router/react-navigation';
import Layout from '../Layout';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import app from '@/model/app/App';
import BagViewSegment from '@/model/bag/BagViewSegment';
import BagTemplate from '@/model/bag/BagTemplate';
import BagTemplateItemView from './BagTemplateItemView';
import BagTemplateListSkeletonView from './BagTemplateListSkeletonView';
import CategoryChipView from '@/components/browse/CategoryChipView';

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const [segment, setSegment] = useState(BagViewSegment.Bags);
  const [templates, setTemplates] = useState<BagTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();
  const isTemplateSegment = segment === BagViewSegment.Templates;

  const loadTemplates = useCallback(async () => {
    if (!isLoggedIn) {
      setTemplates([]);
      setTemplatesLoading(false);

      return;
    }

    setTemplatesLoading(true);

    try {
      setTemplates((await app.getBagTemplateStore()!.getList()) ?? []);
    } catch (error) {
      console.error('템플릿 목록 조회 중 오류 발생:', error);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      void bag.getList();
      void loadTemplates();
    }, [bag, loadTemplates])
  );

  // Bag이 로그인 상태 reaction을 들고 있으므로 언마운트 시 정리한다.
  useEffect(() => {
    return () => {
      bag.dispose();
    };
  }, [bag]);

  const handleSelectOrder = (option: OrderOption) => {
    app
      .getAnalyticsManager()
      ?.logClick('bag_sort', { order: option.getName() });
  };

  const handleDeleteTemplate = async (template: BagTemplate) => {
    try {
      await app.getBagTemplateStore()!.delete(template.getID());
      await loadTemplates();
    } catch (error) {
      console.error('템플릿 삭제 중 오류 발생:', error);
      Alert.alert(
        '오류',
        '템플릿 삭제 중 문제가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  const renderSegment = () => (
    <View style={styles.segmentContainer}>
      <CategoryChipView
        label='배낭'
        selected={!isTemplateSegment}
        onPress={() => setSegment(BagViewSegment.Bags)}
      />
      <CategoryChipView
        label='템플릿'
        selected={isTemplateSegment}
        onPress={() => setSegment(BagViewSegment.Templates)}
      />
    </View>
  );

  const renderHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <PretendardText weight='semibold' style={styles.headerText}>
          {isTemplateSegment
            ? templatesLoading
              ? '템플릿'
              : `템플릿 ${templates.length}개`
            : isLoading
              ? '배낭'
              : `배낭 ${bags.length}개`}
        </PretendardText>
        {!isTemplateSegment && !isLoading && !isEmpty && (
          <OrderButtonView
            order={bag.getOrder()}
            onSelectOption={handleSelectOrder}
          />
        )}
      </View>
      {renderSegment()}
    </>
  );

  const renderBagContent = () => {
    switch (true) {
      case isLoading: {
        return <BagListSkeletonView />;
      }
      case isEmpty: {
        return (
          <View style={styles.emptyContainer}>
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              아직 만든 배낭이 없어요
            </PretendardText>
            <PretendardText style={styles.emptySubtitle}>
              첫 배낭을 만들면 여기에 쌓여요
            </PretendardText>
          </View>
        );
      }
      default: {
        return (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {groupBagsByTripSection(bags).map(group => (
              <View key={group.section} style={styles.section}>
                <AcgSectionHeaderView title={group.label} />
                {group.bags.map((bagItem: BagItem) => (
                  <BagItemView
                    key={bagItem.getID()}
                    bag={bag}
                    bagItem={bagItem}
                  />
                ))}
              </View>
            ))}
            <View
              style={{
                minHeight: Platform.select({
                  ios: insets.bottom + AcgLayout.scrollBottom,
                  android: AcgLayout.scrollBottom,
                  default: AcgLayout.scrollBottom,
                }),
              }}
            />
          </ScrollView>
        );
      }
    }
  };

  const renderTemplateContent = () => {
    if (templatesLoading) {
      return <BagTemplateListSkeletonView />;
    }

    if (!templates.length) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText weight='semibold' style={styles.emptyTitle}>
            저장한 템플릿이 없어요
          </PretendardText>
          <PretendardText style={styles.emptySubtitle}>
            배낭 카드의 ⋯ 메뉴에서 템플릿으로 저장할 수 있어요
          </PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {templates.map((template, index) => (
          <BagTemplateItemView
            key={template.getID()}
            template={template}
            onDelete={handleDeleteTemplate}
            divided={index > 0}
          />
        ))}
        <View
          style={{
            minHeight: Platform.select({
              ios: insets.bottom + AcgLayout.scrollBottom,
              android: AcgLayout.scrollBottom,
              default: AcgLayout.scrollBottom,
            }),
          }}
        />
      </ScrollView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout
        edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
        paddingHorizontal={AcgLayout.screenPadding}
        /**
         * 목록 화면은 순백이다 — 지형 그래픽은 홈에만 둔다(2026-08-11 사용자 결정).
         * 목록이 빽빽한 화면에서 지면 무늬는 행 사이 헤어라인·글자와 섞여 지저분해진다.
         */
        background={<View style={styles.ground} />}
      >
        {renderHeader()}
        {isTemplateSegment ? renderTemplateContent() : renderBagContent()}
        {/* 로딩 중에는 띄우지 않는다(BAG-1). 탭이 막 마운트된 첫 프레임에는 네이티브 탭바 몫이
            반영되기 전이라 `insets.bottom`이 작게 잡혀 버튼이 **탭바 뒤로 내려간다.**
            목록이 온 뒤(= inset 정착 후)에 노출하면 위치가 정확하고, 로딩 위에 CTA가 겹치지도
            않는다 — 피드(FD-2)가 같은 이유로 같은 처리를 한다. */}
        {!isLoading && !isTemplateSegment && <BagAddView bag={bag} />}
      </Layout>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
  container: {
    position: 'relative',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: AcgLayout.chipGap,
    paddingTop: 8,
    paddingBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    // 플로팅 `배낭 추가` 버튼과 겹치지 않도록 살짝 위로 올린다.
    paddingBottom: 80,
  },
  emptyTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  emptySubtitle: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  // 좌: 개수 텍스트 / 우: 정렬 드롭다운 (창고 컨트롤 행과 같은 문법, BAG-6)
  // gap은 좁은 화면에서 텍스트가 접혔을 때 드롭다운과 맞닿지 않게 한다.
  headerContainer: {
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    flexShrink: 1,
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // 구간 사이는 넉넉히 벌려 제목이 앞 구간 끝에 붙지 않게 한다.
  section: {
    marginBottom: 26,
  },
});

export default observer(BagView);
