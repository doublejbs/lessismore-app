import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripView from './OnboardingTripView';

// 첫 여행 만들기 가이드(OB). 도메인 객체를 1회만 만들어 화면에 넘긴다(앱 공통 3단 래퍼 패턴).
const OnboardingTripWrapper: FC = () => {
  const [trip] = useState(() => OnboardingTrip.new());

  return <OnboardingTripView trip={trip} />;
};

export default observer(OnboardingTripWrapper);
