import React, { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import BagFormContent from '@/components/bag/BagFormContent';
import {
  clearBagInfoEditContext,
  getBagInfoEditContext,
} from '@/model/bag-detail/BagInfoEditHandoff';

// BD-1: 배낭 이름·여행 날짜 수정 폼 — 네이티브 formSheet 라우트.
// 현재값·저장 콜백은 BagInfoEditHandoff로 전달받는다(bag-new/bag-copy와 동일한 폼 UI).
const BagInfoEditScreen = () => {
  const router = useRouter();
  // 열리는 시점의 컨텍스트 스냅샷 — 리렌더에 흔들리지 않게 ref로 고정한다.
  const contextRef = useRef(getBagInfoEditContext());
  const context = contextRef.current;

  const [inputValue, setInputValue] = useState(context?.name ?? '');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    context?.startDate ?? null
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    context?.endDate ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  // 컨텍스트 없이 열리면(딥링크 등) 조용히 닫는다. 시트가 닫히면 핸드오프를 정리한다.
  useEffect(() => {
    if (!context) {
      router.back();
    }

    return () => {
      clearBagInfoEditContext();
    };
  }, [context, router]);

  if (!context) {
    return null;
  }

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
      await context.onSave(name, startDate, endDate);
      router.back();
    } catch (error) {
      console.error('배낭 정보 수정 중 오류 발생:', error);
      Alert.alert('오류', '수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BagFormContent
      title='배낭 정보 수정'
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      confirmText='저장'
      disabled={submitting}
      onChangeName={setInputValue}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onConfirm={handleConfirm}
      onCancel={() => router.back()}
    />
  );
};

export default BagInfoEditScreen;
