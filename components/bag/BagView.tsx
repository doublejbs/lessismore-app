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
import Order from '@/model/order/Order';
import { createBagTemplateOrderOptions } from '@/model/order/BagTemplateOrderOptions';
import { getBagTemplateComparator } from '@/model/order/BagTemplateComparators';
import GroupList from '@/model/group-list/GroupList';
import GroupListDispatcher from '@/model/group-list/GroupListDispatcher';
import GroupListView from '@/components/group/list/GroupListView';

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const [segment, setSegment] = useState(BagViewSegment.Bags);
  const [templates, setTemplates] = useState<BagTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateOrder] = useState(() =>
    Order.new('bagTemplateList', createBagTemplateOrderOptions())
  );
  const [templateOrderInitialized, setTemplateOrderInitialized] =
    useState(false);
  // 그룹 목록(GRP-1)은 이 화면의 세 번째 세그먼트다 — 별도 라우트가 아니라서
  // 도메인 객체를 여기서 1회 만들고 제목·본문이 같은 인스턴스를 본다.
  const [groupList] = useState(() =>
    GroupList.from(GroupListDispatcher.new())
  );
  const insets = useSafeAreaInsets();
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();
  const isBagSegment = segment === BagViewSegment.Bags;
  const isTemplateSegment = segment === BagViewSegment.Templates;
  const isGroupSegment = segment === BagViewSegment.Groups;

  const loadTemplates = useCallback(async () => {
    if (!isLoggedIn) {
      setTemplates([]);
      setTemplatesLoading(false);

      return;
    }

    setTemplatesLoading(true);

    try {
      if (!templateOrderInitialized) {
        await templateOrder.initialize();
        setTemplateOrderInitialized(true);
      }

      setTemplates((await app.getBagTemplateStore()!.getList()) ?? []);
    } catch (error) {
      console.error('템플릿 목록 조회 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [isLoggedIn, templateOrder, templateOrderInitialized]);

  useFocusEffect(
    useCallback(() => {
      void bag.getList();
      void loadTemplates();

      // 그룹 목록은 세그먼트를 열었을 때만 읽는다 — 첫 조회·포커스 갱신은
      // `GroupListView`가 맡으므로, 그룹을 보지 않는 사용자에게 역인덱스 쿼리를 보내지 않는다.
      if (isGroupSegment) {
        void groupList.initialize();
      }
    }, [bag, groupList, isGroupSegment, loadTemplates])
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
      console.error('템플릿 삭제 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      Alert.alert(
        app.getL10n().t('common.error'),
        app.getL10n().t('bag.templateDeleteFailed')
      );
    }
  };

  const renderSegment = () => (
    <View style={styles.segmentContainer}>
      <View style={styles.segmentChips}>
        <CategoryChipView
          label={app.getL10n().t('bag.label')}
          selected={isBagSegment}
          onPress={() => setSegment(BagViewSegment.Bags)}
        />
        <CategoryChipView
          label={app.getL10n().t('bag.template.label')}
          selected={isTemplateSegment}
          onPress={() => setSegment(BagViewSegment.Templates)}
        />
        <CategoryChipView
          label={app.getL10n().t('group.segment.label')}
          selected={isGroupSegment}
          onPress={() => setSegment(BagViewSegment.Groups)}
        />
      </View>
      {isBagSegment && !isLoading && !isEmpty && (
        <OrderButtonView
          order={bag.getOrder()}
          onSelectOption={handleSelectOrder}
        />
      )}
      {isTemplateSegment && !templatesLoading && templates.length > 0 && (
        <OrderButtonView
          order={templateOrder}
          onSelectOption={handleSelectOrder}
        />
      )}
      {/* `그룹` 세그먼트는 정렬이 출발일 고정이라 드롭다운을 렌더하지 않는다(GRP-1).
          칩(minHeight 36)이 행 높이를 잡으므로 드롭다운(minHeight 32) 유무로
          제목·칩 행이 움직이지 않는다(BT-2). */}
    </View>
  );

  // 제목은 빈 목록·로딩에서도 렌더한다 — 지금 어느 세그먼트인지 알리는 역할을 겸한다(BT-2).
  const renderHeaderTitle = () => {
    if (isGroupSegment) {
      if (!groupList.getIsInitialized() || groupList.getIsLoading()) {
        return app.getL10n().t('group.segment.label');
      }

      return app.getL10n().t('group.list.count', {
        count: groupList.getGroups().length,
      });
    }

    if (isTemplateSegment) {
      if (templatesLoading) {
        return app.getL10n().t('bag.template.label');
      }

      return app.getL10n().t('bag.template.count', {
        count: templates.length,
      });
    }

    if (isLoading) {
      return app.getL10n().t('bag.label');
    }

    return app.getL10n().t('bag.count', { count: bags.length });
  };

  const renderHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <PretendardText weight='semibold' style={styles.headerText}>
          {renderHeaderTitle()}
        </PretendardText>
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
              {app.getL10n().t('bag.emptyTitle')}
            </PretendardText>
            <PretendardText style={styles.emptySubtitle}>
              {app.getL10n().t('bag.emptySubtitle')}
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

  const renderContent = () => {
    if (isGroupSegment) {
      return <GroupListView groupList={groupList} />;
    }

    if (isTemplateSegment) {
      return renderTemplateContent();
    }

    return renderBagContent();
  };

  const renderTemplateContent = () => {
    if (templatesLoading) {
      return <BagTemplateListSkeletonView />;
    }

    if (!templates.length) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText weight='semibold' style={styles.emptyTitle}>
            {app.getL10n().t('bag.template.emptyTitle')}
          </PretendardText>
          <PretendardText style={styles.emptySubtitle}>
            {app.getL10n().t('bag.template.emptySubtitle')}
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
        {[...templates]
          .sort(getBagTemplateComparator(templateOrder.getSelectedOrderType()))
          .map((template, index) => (
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
        {renderContent()}
        {/* 로딩 중에는 띄우지 않는다(BAG-1). 탭이 막 마운트된 첫 프레임에는 네이티브 탭바 몫이
            반영되기 전이라 `insets.bottom`이 작게 잡혀 버튼이 **탭바 뒤로 내려간다.**
            목록이 온 뒤(= inset 정착 후)에 노출하면 위치가 정확하고, 로딩 위에 CTA가 겹치지도
            않는다 — 피드(FD-2)가 같은 이유로 같은 처리를 한다. */}
        {!isLoading && isBagSegment && <BagAddView bag={bag} />}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: AcgLayout.section,
  },
  segmentChips: {
    flexDirection: 'row',
    gap: AcgLayout.chipGap,
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
  // 화면 제목만 남긴 행이다. 정렬 드롭다운은 세그먼트 칩 행 우측에 둔다(BAG-6).
  headerContainer: {
    marginTop: 12,
    marginBottom: 16,
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
