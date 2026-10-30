import { FC } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Props {
  size: number;
  color: string;
}

// `AI로 계획하기` 아이콘(§5) — iOS SF Symbol `sparkles`, Android·웹 Ionicons `sparkles-outline`.
// IconSymbol의 비 iOS 폴백은 Material Icons라 Ionicons를 직접 쓴다.
const AssistantSparkleIconView: FC<Props> = ({ size, color }) => {
  if (Platform.OS === 'ios') {
    return <IconSymbol name='sparkles' size={size} color={color} />;
  }

  return <Ionicons name='sparkles-outline' size={size} color={color} />;
};

export default AssistantSparkleIconView;
