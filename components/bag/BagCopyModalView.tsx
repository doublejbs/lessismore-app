import React, { FC } from 'react';
import dayjs from 'dayjs';
import BagFormModalView from './BagFormModalView';

interface Props {
  visible: boolean;
  inputValue: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  isCopying: boolean;
  onChangeName: (text: string) => void;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const BagCopyModalView: FC<Props> = ({
  visible,
  inputValue,
  startDate,
  endDate,
  isCopying,
  onChangeName,
  onStartDateChange,
  onEndDateChange,
  onConfirm,
  onCancel,
}) => {
  return (
    <BagFormModalView
      visible={visible}
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      onChangeName={onChangeName}
      onStartDateChange={onStartDateChange}
      onEndDateChange={onEndDateChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title='배낭 복사'
      confirmText='복사'
      disabled={isCopying}
    />
  );
};

export default BagCopyModalView;
