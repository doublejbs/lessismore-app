import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import app from '@/model/app/App';
import GroupCreate from '@/model/group-create/GroupCreate';
import GroupCreateDispatcher from '@/model/group-create/GroupCreateDispatcher';
import GroupCreateView from './GroupCreateView';

/**
 * 그룹 만들기 화면의 상태 수명을 담당한다 (GRP-2).
 * 그룹은 로그인 전제라, 비로그인으로 진입하면 전역 로그인 모달을 띄우고 화면을 닫는다.
 * 배낭 상세의 일행 초대 한 줄로 들어오면 `bagId`를 받아 그 배낭 값으로 미리 채운다(GRP-13).
 */
const GroupCreateWrapper: FC = () => {
  const router = useRouter();
  const { bagId: bagIdParam } = useLocalSearchParams<{
    bagId?: string | string[];
  }>();
  const bagId =
    typeof bagIdParam === 'string' && bagIdParam ? bagIdParam : null;
  const [groupCreate] = useState(() =>
    GroupCreate.from(GroupCreateDispatcher.new(), bagId)
  );
  const isLoggedIn = app.getFirebase().isLoggedIn();

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    void groupCreate.prefill();
  }, [groupCreate, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      return;
    }

    app.getLogInAlertManager()?.show();
    router.back();
  }, [isLoggedIn, router]);

  return <GroupCreateView groupCreate={groupCreate} />;
};

export default observer(GroupCreateWrapper);
