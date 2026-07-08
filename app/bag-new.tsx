import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagFormContent from '@/components/bag/BagFormContent';

// BAG-2: 배낭 생성 폼 — 네이티브 formSheet 라우트. 상태를 직접 소유하고 BagStore로 생성한다.
const BagNewScreen = () => {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) {
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

    setSubmitting(true);

    try {
      const bagID = await app.getBagStore()!.add(name, startDate, endDate);

      if (bagID) {
        app.getAnalyticsManager()?.logClick('bag_create_confirm');
        router.replace(`/bag/${bagID}`);
        router.push(`/bag/${bagID}/edit`);
      }
    } catch (error) {
      console.error('배낭 추가 중 오류 발생:', error);
      Alert.alert('오류', '배낭 추가 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BagFormContent
      title='새 배낭'
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      confirmText='확인'
      disabled={submitting}
      onChangeName={setInputValue}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onConfirm={handleConfirm}
      onCancel={() => router.back()}
    />
  );
};

export default BagNewScreen;
