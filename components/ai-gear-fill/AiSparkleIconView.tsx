import { FC } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Props {
  size: number;
  color: string;
}

// AI 액션 아이콘(AS §5) — iOS SF Symbol `sparkles`, Android·웹 Ionicons `sparkles-outline`.
// IconSymbol의 비 iOS 폴백은 Material Icons라 Ionicons를 직접 쓴다.
const AiSparkleIconView: FC<Props> = ({ size, color }) => {
  if (Platform.OS === 'ios') {
    return <IconSymbol name='sparkles' size={size} color={color} />;
  }

  return <Ionicons name='sparkles-outline' size={size} color={color} />;
};

export default AiSparkleIconView;
