import { useEffect } from 'react';
import AiGearFill from '@/model/ai-gear-fill/AiGearFill';

/**
 * 시트 생명주기(AS-8): 열리면 곧바로 1회 호출한다.
 * 닫히면 늦게 온 응답을 버린다(로딩 중 닫아도 호출은 이미 세어졌다 — 안내하지 않는다, AS-14).
 */
const useAiGearFillScreenState = (aiGearFill: AiGearFill) => {
  useEffect(() => {
    aiGearFill.activate();
    void aiGearFill.load();

    return () => {
      aiGearFill.dispose();
    };
  }, [aiGearFill]);

  const handleClose = () => {
    aiGearFill.close();
  };

  const handleApply = () => {
    void aiGearFill.apply();
  };

  const handleRetry = () => {
    void aiGearFill.retry();
  };

  const handleReload = () => {
    void aiGearFill.load();
  };

  const handleSearch = () => {
    aiGearFill.goToSearch();
  };

  return {
    handleClose,
    handleApply,
    handleRetry,
    handleReload,
    handleSearch,
  };
};

export default useAiGearFillScreenState;
