import WelcomeView from '@/components/welcome/WelcomeView';

// 첫 실행 환영 화면(OB-14) — 레이아웃이 이 기기 첫 판정 때 한 번 띄운다(OB-15). 공개 진입점은 없다.
const WelcomeRoute = () => {
  return <WelcomeView />;
};

export default WelcomeRoute;
