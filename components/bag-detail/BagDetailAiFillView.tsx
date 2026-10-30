import { FC } from 'react';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import AiSparkleIconView from '@/components/ai-gear-fill/AiSparkleIconView';
import SecondaryPillButtonView from '@/components/ui/SecondaryPillButtonView';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AiGearFillEntrySource from '@/model/ai-gear-fill/AiGearFillEntrySource';
import BagDetail from '@/model/bag-detail/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

// 빈 배낭 안내 블록 아래 보조 알약 `AI로 채우기`(BD-13, AS §2 진입 1). 라임 주 액션은 하단 바에
// 그대로 있다 — 이건 흰 면 + 잉크 테두리. 오프라인 저장본·읽기 전용(연결 없음)이면 그리지 않는다.
const BagDetailAiFillView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();

  if (bagDetail.isSnapshot() || bagDetail.isReadOnly()) {
    return null;
  }

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('ai_gear_fill_open', {
      from: AiGearFillEntrySource.EmptyBag,
    });
    router.push(`/ai-gear-fill?bagId=${bagDetail.getId()}`);
  };

  return (
    <SecondaryPillButtonView
      label={app.getL10n().t('bagDetail.aiFill')}
      onPress={handlePress}
      leadingIcon={<AiSparkleIconView size={16} color={Acg.ink} />}
    />
  );
};

export default observer(BagDetailAiFillView);
