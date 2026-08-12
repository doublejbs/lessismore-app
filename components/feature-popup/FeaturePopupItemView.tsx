import { FC, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';

// 부모(FeaturePopupSheetView)가 넘기는 아이템 shape. re-export 금지라 여기서 로컬로 선언한다.
type FeaturePopupItem = {
  imageUrl?: string;
  title: string;
  description?: string;
  link?: string;
};

type Props = {
  item: FeaturePopupItem;
  onPress: () => void;
  // 그룹 리스트의 행 사이 구분선. 마지막 행에는 긋지 않는다.
  showDivider: boolean;
  // 강제 모드(FP-7)에서 탭 비활성 — link가 있어도 정보 표시만 하고 chevron을 숨긴다.
  disabled?: boolean;
};

const THUMBNAIL_SIZE = 48;

// 신기능 팝업 아이템 한 행([썸네일 | 제목 + 설명 | (링크 시)chevron], FP-3).
// 앱의 그룹 리스트 톤(흰 배경 + 행 사이 구분선)을 따른다. props로만 받으므로 순수 FC.
const FeaturePopupItemView: FC<Props> = ({
  item,
  onPress,
  showDivider,
  disabled = false,
}) => {
  // imageUrl 로드 실패 시 빈 썸네일 박스로 대체한다(FP-3, 크래시·깨짐 금지).
  const [hasError, setHasError] = useState(false);

  const handleImageError = () => {
    setHasError(true);
  };

  const showImage = Boolean(item.imageUrl) && !hasError;
  // 강제 모드(disabled)면 link가 있어도 탭 비활성 — 정보 표시만(FP-7).
  const isTappable = Boolean(item.link) && !disabled;

  const content = (
    <>
      {showImage ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumbnail}
          onError={handleImageError}
        />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}

      <View style={styles.textArea}>
        <PretendardText weight='semibold' style={styles.title}>
          {item.title}
        </PretendardText>

        {item.description ? (
          <PretendardText weight='regular' style={styles.description}>
            {item.description}
          </PretendardText>
        ) : null}
      </View>

      {/* 링크가 있는 아이템만 이동 가능 표시(chevron). */}
      {isTappable ? (
        <Ionicons
          name='chevron-forward'
          size={18}
          color={Color.iconMuted}
          style={styles.chevron}
        />
      ) : null}
    </>
  );

  const rowStyle = [styles.row, showDivider ? styles.rowDivider : null];

  // link가 있을 때만 탭 가능한 행으로 만든다(FP-3). 없으면 정보 표시용 View.
  if (isTappable) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole='button'
        accessibilityLabel={item.title}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={rowStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.item,
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: Spacing.item + 4,
  } as ViewStyle,
  // 그룹 안 행 사이 얇은 구분선(앱 리스트 톤).
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  } as ViewStyle,
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.card,
    backgroundColor: Color.thumbBg,
  } as ImageStyle,
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.card,
    backgroundColor: Color.thumbBg,
  } as ViewStyle,
  textArea: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  title: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  description: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  chevron: {
    marginLeft: 2,
  },
});

export default FeaturePopupItemView;
