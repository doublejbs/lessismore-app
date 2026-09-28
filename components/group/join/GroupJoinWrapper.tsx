import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import app from '@/model/app/App';
import GroupJoin from '@/model/group-join/GroupJoin';
import GroupJoinDispatcher from '@/model/group-join/GroupJoinDispatcher';
import GroupJoinStatus from '@/model/group-join/GroupJoinStatus';
import GroupJoinView from './GroupJoinView';

/**
 * 초대 수락 화면의 상태 수명을 담당한다 (GRP-3).
 *
 * 딥링크 파라미터는 쿼리 `groupId`다 — 라우트가 `app/group/join.tsx`(동적 세그먼트 없음)라
 * 앱 스킴은 `lessismoreapp://group/join?groupId={groupId}` 모양이 된다.
 */
const GroupJoinWrapper: FC = () => {
  const router = useRouter();
  const { groupId = '' } = useLocalSearchParams<{ groupId?: string }>();
  const [groupJoin] = useState(() => GroupJoin.from(GroupJoinDispatcher.new()));
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const status = groupJoin.getStatus();

  // 로그인 모달은 화면을 떠나지 않으므로 포커스 이벤트가 오지 않는다 — 로그인 상태가 바뀌는
  // 순간 조회를 시작한다. 그래서 로그인 뒤 같은 초대 화면에서 그대로 이어진다(GRP-3).
  useEffect(() => {
    if (!isLoggedIn) {
      groupJoin.markNeedLogin();
      app.getLogInAlertManager()?.show();

      return;
    }

    void groupJoin.initialize(groupId);
  }, [groupId, groupJoin, isLoggedIn]);

  // 이미 멤버면 참여 화면 대신 그룹 상세로 바로 보낸다(GRP-3).
  useEffect(() => {
    if (status !== GroupJoinStatus.AlreadyMember) {
      return;
    }

    router.replace({ pathname: '/group/[id]', params: { id: groupId } });
  }, [groupId, router, status]);

  return <GroupJoinView groupJoin={groupJoin} groupId={groupId} />;
};

export default observer(GroupJoinWrapper);
