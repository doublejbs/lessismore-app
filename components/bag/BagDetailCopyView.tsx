import React, { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import BagCopyModalView from './BagCopyModalView';
import useBagCopyState from './useBagCopyState';

interface Props {
  sourceId: string;
  sourceName: string;
}

const BagDetailCopyView: FC<Props> = ({ sourceId, sourceName }) => {
  const {
    visible,
    inputValue,
    startDate,
    endDate,
    isCopying,
    open,
    handleChangeName,
    handleStartDateChange,
    handleEndDateChange,
    handleConfirm,
    handleCancel,
  } = useBagCopyState();

  const handlePressCopy = () => {
    open({ id: sourceId, name: sourceName });
  };

  return (
    <>
      <TouchableOpacity
        style={styles.copyButton}
        onPress={handlePressCopy}
        activeOpacity={0.7}
        hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
      >
        <IconSymbol name='doc.on.doc' size={26} color='#333' />
      </TouchableOpacity>
      <BagCopyModalView
        visible={visible}
        inputValue={inputValue}
        startDate={startDate}
        endDate={endDate}
        isCopying={isCopying}
        onChangeName={handleChangeName}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

const styles = StyleSheet.create({
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BagDetailCopyView;
