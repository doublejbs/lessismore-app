import { FC } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FloatingPillButton from '@/components/FloatingPillButton';
import app from '@/model/app/App';

interface Props {
  // 안 쓴 장비 수(WH-2-1). 0이면 갈 곳이 없어 호출측이 렌더하지 않는다.
  count: number;
}

// 하단 여백. 부모 `Layout`이 이미 세이프에어리어를 넣으므로 여기서 다시 더하지 않는다.
const BUTTON_BOTTOM = 12;
// 우측 여백 — 콘텐츠 정렬선(화면 패딩 24)보다 살짝 안쪽이 아니라 그 선에 맞춘다.
const BUTTON_RIGHT = 24;

/**
 * WH-2-1 `안 쓴 장비` 입구 — 창고 하단 우측 플로팅 알약.
 *
 * **토글이 아니라 내비게이션이다**(2026-08-13 사용자 결정). 필터를 켠 창고는 "무엇이 걸려
 * 있는지"를 화면이 따로 말해 줘야 하는데, 전용 화면은 제목이 그 말을 대신한다. 피드
 * `인기 순위` → 전용 화면([Search.md](specs/Search.md) SR-4)과 같은 패턴이다.
 *
 * 비주얼도 `인기 순위`와 같은 공용 `FloatingPillButton`(라임 + 잉크 글자)이다
 * (2026-08-13 사용자 결정). 이 화면의 라임 하나(HM-8)는 이 버튼의 몫이다 — 상단 바
 * `장비 추가`는 아이콘이라 라임 면이 아니다.
 */
const WarehouseUnusedButtonView: FC<Props> = ({ count }) => {
  const router = useRouter();

  const handlePress = () => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_unused', { from: 'warehouse' });
    router.push('/warehouse-unused');
  };

  return (
    <FloatingPillButton
      label={`안 쓴 장비 ${count}`}
      onPress={handlePress}
      style={styles.position}
    />
  );
};

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    right: BUTTON_RIGHT,
    bottom: BUTTON_BOTTOM,
  },
});

export default WarehouseUnusedButtonView;
