import AssistantWrapper from '@/components/assistant/AssistantWrapper';

// AS-3: `AI로 계획하기` — 대화로 여행을 계획해 만드는 화면. `presentation: 'modal'`(pageSheet)이라
// OS 그래버가 없어 화면이 SheetGrabberView + 닫기 ×를 그린다. 닫으면 대화·미결 카드는 버린다(AS-7).
const AssistantRoute = () => {
  return <AssistantWrapper />;
};

export default AssistantRoute;
