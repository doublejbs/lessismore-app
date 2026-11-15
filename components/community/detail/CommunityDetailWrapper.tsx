import { FC, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import CommunityDetailView from './CommunityDetailView';

const CommunityDetailWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail] = useState(() => CommunityDetail.from(router, id ?? ''));

  // CM-17: 보이는 댓글이 차단 필터로 비면 다음 페이지를 이어 받는다.
  useEffect(() => detail.watchBlockedEmpty(), [detail]);

  return <CommunityDetailView detail={detail} />;
};

export default observer(CommunityDetailWrapper);
