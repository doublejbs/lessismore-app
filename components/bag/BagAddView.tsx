import React, { FC, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import BagFormModalView from './BagFormModalView';
import BagAddActionSheetView from './BagAddActionSheetView';
import BagCopySourceModalView from './BagCopySourceModalView';
import BagCopyModalView from './BagCopyModalView';
import useBagCopyState from './useBagCopyState';
import PendingModalType from './PendingModalType';

interface Props {
  bag: Bag;
}

const BagAddView: FC<Props> = ({ bag }) => {
  const [shouldShowAdd, setShouldShowAdd] = useState(false);
  const [shouldShowActionSheet, setShouldShowActionSheet] = useState(false);
  const [shouldShowSource, setShouldShowSource] = useState(false);
  const [pendingModal, setPendingModal] = useState<PendingModalType | null>(
    null
  );
  const [pendingSource, setPendingSource] = useState<BagItem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const router = useRouter();
  const {
    visible: copyVisible,
    inputValue: copyInputValue,
    startDate: copyStartDate,
    endDate: copyEndDate,
    isCopying,
    open: openCopy,
    handleChangeName: handleCopyChangeName,
    handleStartDateChange: handleCopyStartDateChange,
    handleEndDateChange: handleCopyEndDateChange,
    handleConfirm: handleCopyConfirm,
    handleCancel: handleCopyCancel,
  } = useBagCopyState();

  const handlePressAdd = () => {
    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    if (bag.isEmpty()) {
      setShouldShowAdd(true);
    } else {
      setShouldShowActionSheet(true);
    }
  };

  const openPendingModal = (next: PendingModalType | null, source?: BagItem) => {
    if (!next) {
      return;
    }

    if (next === PendingModalType.Create) {
      setShouldShowAdd(true);
    } else if (next === PendingModalType.Source) {
      setShouldShowSource(true);
    } else if (next === PendingModalType.Copy) {
      const target = source ?? pendingSource;

      if (target) {
        openCopy({
          id: target.getID(),
          name: target.getName(),
        });
        setPendingSource(null);
      }
    }
  };

  const flushPendingModal = () => {
    const next = pendingModal;

    setPendingModal(null);
    openPendingModal(next);
  };

  const transitionTo = (
    next: PendingModalType,
    closeCurrent: () => void,
    source?: BagItem
  ) => {
    if (Platform.OS === 'ios') {
      if (source) {
        setPendingSource(source);
      }

      setPendingModal(next);
      closeCurrent();
    } else {
      closeCurrent();
      openPendingModal(next, source);
    }
  };

  const handleSelectCreate = () => {
    transitionTo(PendingModalType.Create, () =>
      setShouldShowActionSheet(false)
    );
  };

  const handleSelectCopy = () => {
    transitionTo(PendingModalType.Source, () =>
      setShouldShowActionSheet(false)
    );
  };

  const handleCloseActionSheet = () => {
    setShouldShowActionSheet(false);
  };

  const handleSelectSource = (bagItem: BagItem) => {
    transitionTo(
      PendingModalType.Copy,
      () => setShouldShowSource(false),
      bagItem
    );
  };

  const handleCloseSource = () => {
    setShouldShowSource(false);
  };

  const handleChange = (text: string) => {
    setInputValue(text);
  };

  const handleClickConfirm = async () => {
    try {
      if (!startDate || !endDate) {
        Alert.alert('오류', '날짜를 선택해주세요');

        return;
      }

      const bagID = await bag.add(inputValue, startDate, endDate);

      if (bagID) {
        setInputValue('');
        setShouldShowAdd(false);
        setStartDate(dayjs());
        setEndDate(dayjs());
        router.push(`/bag/${bagID}`);
      }
    } catch (error) {
      console.error('배낭 추가 중 오류 발생:', error);
      Alert.alert(
        '오류',
        '배낭 추가 중 문제가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  const handleClickCancel = () => {
    setInputValue('');
    setShouldShowAdd(false);
  };

  const handleStartDateChange = (date: dayjs.Dayjs) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handlePressAdd}
        activeOpacity={0.8}
      >
        <PretendardText style={styles.buttonText}>배낭 추가</PretendardText>
      </TouchableOpacity>
      <BagAddActionSheetView
        visible={shouldShowActionSheet}
        onCreate={handleSelectCreate}
        onCopy={handleSelectCopy}
        onClose={handleCloseActionSheet}
        onDismiss={flushPendingModal}
      />
      <BagCopySourceModalView
        visible={shouldShowSource}
        bags={bag.getBags()}
        onSelect={handleSelectSource}
        onClose={handleCloseSource}
        onDismiss={flushPendingModal}
      />
      <BagFormModalView
        visible={shouldShowAdd}
        inputValue={inputValue}
        startDate={startDate}
        endDate={endDate}
        onChangeName={handleChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onConfirm={handleClickConfirm}
        onCancel={handleClickCancel}
      />
      <BagCopyModalView
        visible={copyVisible}
        inputValue={copyInputValue}
        startDate={copyStartDate}
        endDate={copyEndDate}
        isCopying={isCopying}
        onChangeName={handleCopyChangeName}
        onStartDateChange={handleCopyStartDateChange}
        onEndDateChange={handleCopyEndDateChange}
        onConfirm={handleCopyConfirm}
        onCancel={handleCopyCancel}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: Platform.select({
      ios: 80,
      android: 0,
      default: 80,
    }),
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'black',
    height: 48,
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 127,
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    textAlignVertical: 'center',
  },
});

export default BagAddView;
