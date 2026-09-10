import { FC, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import CommunityDetailView from './CommunityDetailView';

const CommunityDetailWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail] = useState(() => CommunityDetail.from(router, id ?? ''));

  return <CommunityDetailView detail={detail} />;
};

export default observer(CommunityDetailWrapper);
