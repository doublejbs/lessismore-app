import React, { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import BagItem from '@/model/bag/BagItem';
import app from '@/model/app/App';
import { IconSymbol } from '@/components/ui/IconSymbol';
import BagCopyModalView from './BagCopyModalView';
import useBagCopyState from './useBagCopyState';

interface Props {
  bagItem: BagItem;
}

const BagCopyView: FC<Props> = ({ bagItem }) => {
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

  const showCopy = () => {
    if (app.getFirebase()?.isLoggedIn()) {
      open({ id: bagItem.getID(), name: bagItem.getName() }, 'list');
    } else {
      app.getLogInAlertManager()?.show();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.copyButton}
        onPress={showCopy}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <IconSymbol name='doc.on.doc' size={18} color='#666' />
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
    height: 32,
    width: 32,
    padding: 4,
    backgroundColor: '#F1F1F1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BagCopyView;
