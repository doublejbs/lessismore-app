import { FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import AiGearFill from '@/model/ai-gear-fill/AiGearFill';
import AiGearFillPhase from '@/model/ai-gear-fill/AiGearFillPhase';
import AiGearFillHeaderView from './AiGearFillHeaderView';
import AiGearFillLoadingView from './AiGearFillLoadingView';
import AiGearFillResultView from './AiGearFillResultView';
import AiGearFillFooterView from './AiGearFillFooterView';
import AiGearFillErrorView from './AiGearFillErrorView';
import AiGearFillEmptyView from './AiGearFillEmptyView';
import useAiGearFillScreenState from './useAiGearFillScreenState';

interface Props {
  aiGearFill: AiGearFill;
}

// 시트 조립(AS-14): 머리(그래버·타이틀·×) + 단계별 본문 + 결과일 때만 하단 고정 바.
// 상단은 세이프에어리어 inset만큼 내린다 — pageSheet에서는 0이고, 시트가 전체 높이로 커지거나 콜드 스타트
// 딥링크로 전체 화면이 되면 상태바 높이다. 하단 inset은 고정 바가 직접 맡는다.
// 네이티브 `SafeAreaView`는 모달 안에서 첫 마운트에 0으로 측정된 뒤 갱신을 못 받고(DST-3 선택기 주석과
// 같은 현상, 전체 화면에서 실측), 루트 프로바이더 값은 창 기준이라 pageSheet에서도 상태바 높이가 된다.
// 그래서 시트 안에 프로바이더를 하나 더 두어 **이 화면 뷰 기준** inset을 받는다(프레임이 바뀌면 갱신된다).
const AiGearFillScreenContent: FC<Props> = observer(({ aiGearFill }) => {
  const insets = useSafeAreaInsets();
  const {
    handleClose,
    handleApply,
    handleRetry,
    handleReload,
    handleSearch,
    handleDismissNotice,
  } = useAiGearFillScreenState(aiGearFill);
  const phase = aiGearFill.getPhase();

  const renderBody = () => {
    if (phase === AiGearFillPhase.Loading) {
      return <AiGearFillLoadingView />;
    }

    if (phase === AiGearFillPhase.Error) {
      return (
        <AiGearFillErrorView
          kind={aiGearFill.getErrorKind()}
          onRetry={handleReload}
          onSearch={handleSearch}
        />
      );
    }

    if (phase === AiGearFillPhase.Empty) {
      return (
        <AiGearFillEmptyView
          warehouseEmpty={aiGearFill.isWarehouseEmpty()}
          onSearch={handleSearch}
        />
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <AiGearFillResultView
          aiGearFill={aiGearFill}
          onDismissNotice={handleDismissNotice}
          onSearch={handleSearch}
        />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AiGearFillHeaderView
        onClose={handleClose}
        disabled={aiGearFill.isApplying()}
      />
      <View style={styles.body}>{renderBody()}</View>
      {phase === AiGearFillPhase.Result ? (
        <AiGearFillFooterView
          aiGearFill={aiGearFill}
          onApply={handleApply}
          onRetry={handleRetry}
        />
      ) : null}
    </View>
  );
});

const AiGearFillScreen: FC<Props> = ({ aiGearFill }) => {
  return (
    <SafeAreaProvider style={styles.container}>
      <AiGearFillScreenContent aiGearFill={aiGearFill} />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 24,
  },
});

export default AiGearFillScreen;
