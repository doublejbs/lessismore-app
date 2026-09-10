import OrderOption from './OrderOption';
import OrderType from './OrderType';

export const createCommunityFeedOrderOptions = (): OrderOption[] => [
  OrderOption.fromKey('community.feed.sort.latest', OrderType.Latest),
  OrderOption.fromKey('community.feed.sort.popular', OrderType.Popular),
];
