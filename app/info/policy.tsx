import { useLocalSearchParams } from 'expo-router';
import InfoPolicyView from '@/components/info/InfoPolicyView';
import PolicyTab from '@/components/info/PolicyTab';

// AU-4: 개인정보 처리방침 · 이용약관 화면. 정보 탭의 어느 행으로 들어왔는지를
// `?tab=` 으로 받아 해당 문서를 먼저 보여준다(값이 없거나 모르면 처리방침).
const PolicyPage = () => {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab =
    tab === PolicyTab.Terms ? PolicyTab.Terms : PolicyTab.Privacy;

  return <InfoPolicyView initialTab={initialTab} />;
};

export default PolicyPage;
