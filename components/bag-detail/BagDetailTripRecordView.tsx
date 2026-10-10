import { FC } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import tileStyles from './BagDetailActionTileStyles';

interface Props {
  bagDetail: BagDetail;
}

/**
 * 지난 여행의 상황형 강조 카드 `여행 기록 남기기`(BD-10 2026-10-10 개정, CM-16).
 * 기록이 없을 때만 그리드 최상단에 선다 — 강조 카드 문법(검정 전체 폭 가로 카드)은 다른 강조 타일과 같다.
 */
const BagDetailTripRecordView: FC<Props> = ({ bagDetail }) => {
  const l10n = app.getL10n();
  const title = l10n.t('tripRecord.entry.title');
  const value = l10n.t('tripRecord.entry.value');

  return (
    <TouchableOpacity
      style={[tileStyles.tile, tileStyles.tileEmphasized]}
      onPress={() => bagDetail.goToTripRecord()}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={`${title}, ${value}`}
    >
      <View style={tileStyles.emphasizedLead}>
        <Ionicons name='camera-outline' size={22} color={Color.background} />
        <PretendardText
          style={[tileStyles.title, { color: Color.background }]}
          weight='medium'
        >
          {title}
        </PretendardText>
      </View>
      <View style={tileStyles.emphasizedValue}>
        <PretendardText
          style={[tileStyles.subtitle, { color: Color.iconMuted }]}
          numberOfLines={1}
        >
          {value}
        </PretendardText>
      </View>
    </TouchableOpacity>
  );
};

export default observer(BagDetailTripRecordView);
