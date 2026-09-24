import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import GroupInviteActionTone from '@/components/group/invite/GroupInviteActionTone';
import GroupInviteActionView from '@/components/group/invite/GroupInviteActionView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Group from '@/model/group/Group';

interface Props {
  group: Group;
}

/**
 * 혼자일 때 초대 카드 (GRP-11). 멤버가 방장 혼자인 그룹에서 할 일은 초대라, 하단 초대 섹션 대신
 * 헤더 바로 아래에 둔다 — 두 자리가 동시에 보이지 않게 고르는 것은 `GroupDetailView`다.
 *
 * - 면: 연회색 채움 + 모서리 12 + 그림자 없음(HM-8 면 규칙). 카드 자체는 눌리지 않는다.
 * - 버튼: 공용 `GroupInviteActionView`(링크 조립·잠금 표시·복사 토스트의 단일 소스)를 흰 채움으로.
 *   **라임을 쓰지 않는다** — 박지가 연결된 그룹은 지도 밴드에 라임 박지 핀(앱 공통 핀)이 선다.
 *   카드까지 라임이면 한 화면에 라임이 둘이고(라임은 화면당 하나), 박지 유무로 버튼 색을 바꾸면
 *   같은 버튼이 그룹마다 달라 보인다.
 * - 초대 잠금(`inviteEnabled=false`)이면 하단 초대 섹션과 같이 버튼이 `초대가 마감됐어요` +
 *   자물쇠로 막힌다(`GroupInviteActionView`가 그린다). 여는 곳은 헤더 `⋯` 메뉴다.
 */
const GroupDetailSoloInviteView: FC<Props> = ({ group }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <PretendardText weight='medium' style={styles.title}>
          {l10n.t('group.detail.soloTitle')}
        </PretendardText>
        <PretendardText style={styles.description}>
          {l10n.t('group.detail.inviteDescription')}
        </PretendardText>
      </View>
      <GroupInviteActionView
        group={group}
        tone={GroupInviteActionTone.OnSurface}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 16,
    gap: 12,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  text: {
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  description: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
});

export default observer(GroupDetailSoloInviteView);
