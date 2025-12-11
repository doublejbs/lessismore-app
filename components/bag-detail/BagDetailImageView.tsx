import { FC, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import LoadingIconView from '@/components/ui/LoadingIconView';

interface Props {
  imageUrl: string;
  shadow?: boolean;
}

const BagDetailImageView: FC<Props> = ({ imageUrl, shadow }) => {
  const [loading, setLoading] = useState(
    !!imageUrl && String(imageUrl) !== 'true'
  );

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <LoadingIconView />
        </View>
      )}
      {imageUrl && String(imageUrl) !== 'true' && (
        <Image
          source={{ uri: imageUrl }}
          onLoad={handleLoad}
          onError={handleError}
          style={[
            styles.image,
            {
              opacity: loading ? 0 : shadow ? 0.5 : 1,
            },
          ]}
          resizeMode='contain'
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default BagDetailImageView;
