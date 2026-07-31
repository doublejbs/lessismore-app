import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagFormContent from '@/components/bag/BagFormContent';

// BAG-4/5: 배낭 복사 폼 — 네이티브 formSheet 라우트.
// 원본 정보(sourceId/sourceName)와 진입 경로(entrySource)를 라우트 파라미터로 받는다.
const BagCopyScreen = () => {
  const router = useRouter();
  const { sourceId, sourceName, entrySource } = useLocalSearchParams<{
    sourceId: string;
    sourceName: string;
    entrySource: string;
  }>();
  const source = entrySource ?? 'list';

  const [inputValue, setInputValue] = useState(`${sourceName ?? ''} 복사본`);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    app.getAnalyticsManager()?.logClick('bag_copy', { source });
  }, [source]);

  const handleConfirm = async () => {
    if (isCopying || !sourceId) {
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('오류', '날짜를 선택해주세요');

      return;
    }

    const name = inputValue.trim();

    if (!name.length) {
      Alert.alert('배낭 이름을 입력해주세요');

      return;
    }

    setIsCopying(true);

    try {
      const bagID = await app
        .getBagStore()!
        .copy(sourceId, name, startDate, endDate);

      if (bagID) {
        app.getAnalyticsManager()?.logClick('bag_copy_confirm', { source });
        app.getToastManager()?.show({ message: '복사됐습니다' });
        // 만든 뒤 상세로만 보낸다(BAG-2) — 장비 편집 화면을 겹쳐 열지 않는다.
        router.replace(`/bag/${bagID}`);
      }
    } catch (error) {
      console.error('배낭 복사 중 오류 발생:', error);
      Alert.alert('오류', '배낭 복사 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <BagFormContent
      title='배낭 복사'
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      confirmText='복사'
      disabled={isCopying}
      onChangeName={setInputValue}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onConfirm={handleConfirm}
      onCancel={() => router.back()}
    />
  );
};

export default BagCopyScreen;
