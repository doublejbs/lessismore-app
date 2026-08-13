import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgShadow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  // 안 쓴 장비 수(WH-2-1). 0이면 갈 곳이 없어 호출측이 렌더하지 않는다.
  count: number;
}

// 지도 플로팅 버튼(CS-2)과 같은 지오메트리 — 원형 46 대신 라벨을 담아 알약이 된다.
const BUTTON_HEIGHT = 46;
// 하단 여백. 부모 `Layout`이 이미 세이프에어리어를 넣으므로 여기서 다시 더하지 않는다.
const BUTTON_BOTTOM = 12;

/**
 * WH-2-1 `안 쓴 장비` 입구 — 창고 하단 우측 플로팅 버튼.
 *
 * **토글이 아니라 내비게이션이다**(2026-08-13 사용자 결정). 필터를 켠 창고는 "무엇이 걸려
 * 있는지"를 화면이 따로 말해 줘야 하는데, 전용 화면은 제목이 그 말을 대신한다. 피드
 * `인기 순위` → 전용 화면([Search.md](specs/Search.md) SR-4)과 같은 패턴이다.
 *
 * 형태는 지도 탭 플로팅 버튼의 문법(CS-2) — 흰 면 + 헤어라인 + 카드 그림자. **라임을 쓰지
 * 않는다**: 이 화면의 주 액션은 상단 바의 `장비 추가`이고 라임은 화면당 하나다(HM-8).
 * 아이콘만으로는 "안 쓴 장비"가 전달되지 않아 라벨과 개수를 함께 싣는다.
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
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole='button'
      accessibilityLabel={`안 쓴 장비 ${count}개 보기`}
    >
      <PretendardText style={styles.label} weight='medium'>
        안 쓴 장비 {count}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 위치는 창고 콘텐츠 컨테이너 기준이다 — 좌우 패딩이 이미 걸려 있어 right는 0이면 된다.
  button: {
    position: 'absolute',
    right: 0,
    bottom: BUTTON_BOTTOM,
    minHeight: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
    boxShadow: AcgShadow.card,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default WarehouseUnusedButtonView;
