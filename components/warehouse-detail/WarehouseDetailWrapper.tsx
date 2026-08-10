import { FC, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import WarehouseDetailView from './WarehouseDetailView';
import WarehouseDetailSkeletonView from './WarehouseDetailSkeletonView';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDispatcher from '../../model/warehouse/WarehouseDispatcher';
import Layout from '../Layout';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidHeaderChrome from '@/components/liquid/LiquidHeaderChrome';

interface Props {}

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;
const IS_IOS = Platform.OS === 'ios';

const WarehouseDetailWrapper: FC<Props> = ({}) => {
  const navigate = useRouter();
  const [warehouseDetail] = useState(() =>
    WarehouseDetail.new(navigate, WarehouseDispatcher.new())
  );
  const { id = '', bagId } = useLocalSearchParams<{
    id: string;
    bagId?: string;
  }>();
  const initialized = warehouseDetail.isInitialized();

  const handlePressBack = () => {
    warehouseDetail.close();
  };

  useEffect(() => {
    // GE-8: 배낭 장비 추가 검색에서 들어오면 그 배낭 컨텍스트로 담기 버튼을 전환한다.
    if (bagId) {
      warehouseDetail.setBagContext(bagId);
    }

    warehouseDetail.initialize(id);
  }, [id, bagId]);

  // 사용 여부 기록(`/useless/{id}`)·배낭 편집·리뷰 작성에서 돌아오면 기록도 여행 목록도
  // 바뀌어 있을 수 있어 통째로 다시 읽는다. 첫 진입에서는 위 initialize가 이미 읽으므로
  // reload가 초기화 전에는 아무것도 하지 않는다.
  useFocusEffect(
    useCallback(() => {
      void warehouseDetail.reload();
    }, [warehouseDetail])
  );

  return (
    <Layout
      paddingHorizontal={0}
      edges={IS_IOS ? IOS_EDGES : undefined}
      // 지형 없이 좌측 라임 글로우만 있는 지면(목업 §9) — 여기는 읽을 지형이 아니라
      // 장비 하나를 판단하는 화면이다.
      background={<LiquidBackdrop screen='none' glowPosition='leftMid' />}
    >
      {initialized ? (
        <WarehouseDetailView warehouseDetail={warehouseDetail} />
      ) : (
        <>
          {/* 로딩 구간에도 유리 back은 살아 있어야 한다 — 조회가 늦거나 실패해도
              화면을 빠져나갈 수 있다(§6 엣지 케이스). iOS는 네이티브 투명 헤더가, Android·Web은
              본 화면과 같은 유리 크롬이 그 back을 낸다. 액션(공유·수정)은 아직 장비를 몰라
              넘기지 않고 — 그러면 크롬이 캡슐 자체를 그리지 않는다 — 타이틀도 비운다. */}
          <Stack.Screen
            options={{
              headerShown: IS_IOS,
              headerTransparent: true,
              headerTitle: '',
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
          {!IS_IOS && <LiquidHeaderChrome onPressBack={handlePressBack} />}
          <WarehouseDetailSkeletonView />
        </>
      )}
    </Layout>
  );
};

export default observer(WarehouseDetailWrapper);
