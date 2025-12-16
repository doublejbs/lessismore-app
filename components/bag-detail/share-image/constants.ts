import GearFilter from '@/model/gear/GearFilter';

// Canvas Dimensions (4:5 ratio for Instagram)
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350; // 4:5 ratio
export const BG_COLOR = '#F5F5F5'; // Light Grey Background
export const CARD_BG_COLOR = '#1A1A1A'; // Dark Grey Cards

// 무게 카드 색상 팔레트
export const WEIGHT_GRADIENTS: readonly [string, string][] = [
  ['#90D830', '#60C000'], // Lime Green
  ['#FF2D55', '#CC0033'], // Pink/Red
  ['#00FFD9', '#00CCA8'], // Cyan/Turquoise
  ['#FFD60A', '#CCA800'], // Yellow
  ['#30D158', '#26A346'], // Green
  ['#64D2FF', '#33AACC'], // Light Blue
  ['#BF5AF2', '#9933CC'], // Purple
  ['#FF9F0A', '#CC7F08'], // Orange
];

// Layout Constants (optimized for 4:5 Instagram ratio: 1080 x 1350)
export const PADDING = 24;
export const GAP = 20;

// Grid-based Layout System (4 columns)
export const CELL_SIZE = 243; // Base cell size
export const CELL_1x1 = CELL_SIZE;
export const CELL_2x2 = CELL_SIZE * 2 + GAP; // 243 * 2 + 20 = 506

// Chart Colors (iOS Fitness App Palette - Vibrant & Energetic)
export const CHART_COLORS = [
  '#FF2D55', // Move Ring - Pink/Red
  '#AFFC41', // Exercise Ring - Lime Green
  '#00FFD9', // Stand Ring - Cyan/Turquoise
  '#FF453A', // Red
  '#FFD60A', // Yellow
  '#30D158', // Green
  '#64D2FF', // Light Blue
  '#BF5AF2', // Purple
  '#FF9F0A', // Orange
  '#AC8E68', // Brown
];

export const DARK_TEXT_MAIN = '#FFFFFF'; // White
export const DARK_TEXT_SUB = '#999999'; // Grey

export const CATEGORY_NAME_MAP: Record<string, string> = {
  [GearFilter.Backpack]: '배낭',
  [GearFilter.Tent]: '텐트',
  [GearFilter.SleepingBag]: '침낭',
  [GearFilter.Mat]: '매트',
  [GearFilter.Lantern]: '랜턴',
  [GearFilter.Cooking]: '조리',
  [GearFilter.Clothing]: '의류',
  [GearFilter.Furniture]: '가구',
  [GearFilter.Electronic]: '전자기기',
  [GearFilter.Food]: '음식',
  [GearFilter.Etc]: '기타',
};

export type CardSize = '1x1' | '2x1' | '1x2' | '2x2';

export default {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BG_COLOR,
  CARD_BG_COLOR,
  WEIGHT_GRADIENTS,
  PADDING,
  GAP,
  CELL_SIZE,
  CELL_1x1,
  CELL_2x2,
  CHART_COLORS,
  DARK_TEXT_MAIN,
  DARK_TEXT_SUB,
  CATEGORY_NAME_MAP,
};
