import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AiGearFill from '@/model/ai-gear-fill/AiGearFill';
import AiGearFillItem from '@/model/ai-gear-fill/AiGearFillItem';
import AiGearFillNoticeView from './AiGearFillNoticeView';
import AiGearFillNotesView from './AiGearFillNotesView';
import AiGearFillMissingView from './AiGearFillMissingView';
import AiGearFillRowView from './AiGearFillRowView';

interface Props {
  aiGearFill: AiGearFill;
  onDismissNotice: () => void;
  onSearch: () => void;
}

// 결과(AS-14): 첫 사용 안내 → 대상 줄 → 근거 한 줄 → `필수`/`추천` 섹션 → 창고에 없는 필수 줄 → 참고.
const AiGearFillResultView: FC<Props> = ({
  aiGearFill,
  onDismissNotice,
  onSearch,
}) => {
  const l10n = app.getL10n();
  const tripLine = [aiGearFill.getTripName(), aiGearFill.getTripPeriod()]
    .filter(Boolean)
    .join(l10n.t('common.metaSeparator'));
  const headline = aiGearFill.getHeadline();
  // 지난 여행(§6)은 근거 줄 앞에 알린다 — 기록용 담기는 그대로 허용한다.
  const reasonLine = aiGearFill.isPastTrip()
    ? [l10n.t('aiGearFill.pastTrip'), headline]
        .filter(Boolean)
        .join(l10n.t('common.metaSeparator'))
    : headline;

  const renderSection = (titleKey: string, items: AiGearFillItem[]) => {
    // 비어 있는 섹션은 그리지 않는다.
    if (items.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <AcgSectionHeaderView
          title={l10n.t(titleKey)}
          subtitle={l10n.t('aiGearFill.sectionCount', { count: items.length })}
        />
        {items.map((item, index) => (
          <AiGearFillRowView
            key={item.getGearId()}
            aiGearFill={aiGearFill}
            item={item}
            divided={index > 0}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        {aiGearFill.isNoticeVisible() ? (
          <AiGearFillNoticeView onDismiss={onDismissNotice} />
        ) : null}
        {tripLine ? (
          <PretendardText style={styles.trip} numberOfLines={1}>
            {tripLine}
          </PretendardText>
        ) : null}
        {aiGearFill.getWeatherLine() ? (
          <PretendardText style={styles.trip} numberOfLines={1}>
            {aiGearFill.getWeatherLine()}
          </PretendardText>
        ) : null}
        {reasonLine ? (
          <PretendardText style={styles.headline}>{reasonLine}</PretendardText>
        ) : null}
      </View>
      {renderSection('aiGearFill.essential', aiGearFill.getEssentialItems())}
      {renderSection(
        'aiGearFill.recommended',
        aiGearFill.getRecommendedItems()
      )}
      <AiGearFillMissingView
        groups={aiGearFill.getMissingGroups()}
        onPress={onSearch}
      />
      <AiGearFillNotesView notes={aiGearFill.getNotes()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  intro: {
    gap: 4,
  },
  trip: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  headline: {
    ...AcgType.body,
    color: Acg.ink,
  },
  section: {
    gap: 0,
  },
});

export default observer(AiGearFillResultView);
