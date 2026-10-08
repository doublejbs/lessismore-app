import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import SearchEmptyButtonVariant from '@/model/search/SearchEmptyButtonVariant';
import app from '@/model/app/App';

interface Props {
  query: string;
  variant: SearchEmptyButtonVariant;
  // 없으면 `직접 추가` 버튼을 숨긴다 — 첫 여행 가이드 비로그인 담기 모드(OB-13, 수동 폼은 로그인 필요).
  onPressAdd?: ((query: string) => void) | undefined;
}

const BUTTON_MIN_HEIGHT = 44;

/**
 * SR-11 검색 결과 없음 빈 상태 — 제목 + 부제 + `직접 추가` 알약.
 *
 * 탐색 탭·`/search` 모달·창고·배낭 편집이 한 벌을 같이 쓴다. 자리마다 문구·버튼 모양이 갈리면
 * 같은 상황(찾는 장비가 없다)이 화면마다 다르게 읽힌다.
 * 버튼은 목록 안에 놓이는 컨트롤이라 그림자를 두지 않는다 — 그림자는 플로팅 알약 몫(HM-8).
 */
const SearchEmptyCustomAddView: FC<Props> = ({
  query,
  variant,
  onPressAdd,
}) => {
  const l10n = app.getL10n();
  const trimmedQuery = query.trim();
  const isPrimary = variant === SearchEmptyButtonVariant.Primary;
  const buttonLabel = l10n.t('search.emptyCustomAdd.button');

  const handlePressAdd = () => {
    onPressAdd?.(trimmedQuery);
  };

  return (
    <View style={styles.container}>
      <PretendardText style={styles.title} weight='medium' numberOfLines={2}>
        {l10n.t('search.emptyCustomAdd.title', { query: trimmedQuery })}
      </PretendardText>
      <PretendardText style={styles.subtitle}>
        {l10n.t(
          onPressAdd
            ? 'search.emptyCustomAdd.subtitle'
            : 'search.emptyCustomAdd.subtitleNoAdd'
        )}
      </PretendardText>
      {onPressAdd ? (
        <TouchableOpacity
          style={[
            styles.button,
            isPrimary ? styles.primaryButton : styles.secondaryButton,
          ]}
          onPress={handlePressAdd}
          activeOpacity={0.85}
          accessibilityRole='button'
          accessibilityLabel={buttonLabel}
        >
          <PretendardText style={styles.buttonLabel} weight='semibold'>
            {buttonLabel}
          </PretendardText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...AcgType.body,
    color: Acg.textMuted,
    textAlign: 'center',
  },
  // 액션은 알약(높이의 절반) — 칩(모서리 10)과 형태로 갈린다(HM-8).
  // Dynamic Type 대응으로 고정 높이 대신 최소 높이 + 세로 패딩.
  button: {
    marginTop: 14,
    minHeight: BUTTON_MIN_HEIGHT,
    borderRadius: BUTTON_MIN_HEIGHT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 라임 면 위 글자는 잉크다. 라임에는 테두리를 두지 않는다(FloatingPillButton과 같은 값).
  primaryButton: {
    backgroundColor: Acg.lime,
  },
  // 보조 액션 — 흰 면 + 잉크 테두리(FloatingPillButton secondary와 같은 값).
  secondaryButton: {
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.ink,
  },
  buttonLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default SearchEmptyCustomAddView;
