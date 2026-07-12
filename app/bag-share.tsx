import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import BagShareContent from '@/components/bag-detail/BagShareContent';
import {
  clearBagShareContext,
  getBagShareContext,
} from '@/model/bag-detail/BagShareHandoff';

// BD-1: 배낭 공유 시트 — 네이티브 formSheet 라우트.
// 공유 대상 BagDetail은 BagShareHandoff로 전달받는다(배낭 생성/복사/정보수정과 동일한 폼 UI).
const BagShareScreen = () => {
  const router = useRouter();
  const bagDetailRef = useRef(getBagShareContext());
  const bagDetail = bagDetailRef.current;

  // 컨텍스트 없이 열리면(딥링크 등) 조용히 닫는다. 시트가 닫히면 핸드오프를 정리한다.
  useEffect(() => {
    if (!bagDetail) {
      router.back();
    }

    return () => {
      clearBagShareContext();
    };
  }, [bagDetail, router]);

  if (!bagDetail) {
    return null;
  }

  return <BagShareContent bagDetail={bagDetail} />;
};

export default BagShareScreen;
