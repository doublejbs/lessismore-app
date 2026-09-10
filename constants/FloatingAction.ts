import { Platform } from 'react-native';

export const FLOATING_ACTION_RIGHT = 20;
export const FLOATING_ACTION_HEIGHT = 48;
export const FLOATING_ACTION_BOTTOM_OFFSET = 20;
export const FLOATING_ACTION_LIST_EXTRA = 12;

export const getFloatingActionBottom = (bottomInset: number): number => {
  return (
    Platform.select({
      ios: bottomInset + FLOATING_ACTION_BOTTOM_OFFSET,
      android: 0,
      default: 80,
    }) ?? 80
  );
};

export const getFloatingActionListBottomPadding = (
  bottomInset: number
): number => {
  return (
    getFloatingActionBottom(bottomInset) +
    FLOATING_ACTION_HEIGHT +
    FLOATING_ACTION_LIST_EXTRA
  );
};
