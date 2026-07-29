import { FC, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import BagCopySourceListView from './BagCopySourceListView';

// 원본 배낭 선택 시트(BAG-5)의 데이터·내비게이션 담당. 목록은 전역 BagStore에서 1회 조회한다.
// 현재 구조는 ListView의 ScrollView를 화면 루트로 두므로 여기서 래핑 View를 추가하지 않는다
// — 근거와 미확정 범위는 app/bag-copy-source.tsx 주석 참고.
const BagCopySourceWrapper: FC = () => {
  const router = useRouter();
  const [bags, setBags] = useState<BagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchBags = async () => {
      const list = (await app.getBagStore()?.getList()) ?? [];

      if (!mounted) {
        return;
      }

      setBags(list);
      setIsLoading(false);
    };

    void fetchBags();

    return () => {
      mounted = false;
    };
  }, []);

  // 시트를 쌓지 않고 복사 폼으로 교체한다(replace) — 이유는 라우트 파일 주석 참고.
  const handleSelect = (bagItem: BagItem) => {
    router.replace({
      pathname: '/bag-copy',
      params: {
        sourceId: bagItem.getID(),
        sourceName: bagItem.getName(),
        entrySource: 'add_sheet',
      },
    });
  };

  return (
    <BagCopySourceListView
      bags={bags}
      isLoading={isLoading}
      onSelect={handleSelect}
    />
  );
};

export default BagCopySourceWrapper;
