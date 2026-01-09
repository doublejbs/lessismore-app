import React, { FC, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import LoadingIconView from '@/components/ui/LoadingIconView';

interface Props {
  imageUrl: string;
}

const GearImageView: FC<Props> = ({ imageUrl }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return null;
  }

  if (!!imageUrl && String(imageUrl) !== 'true') {
    return (
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingContainer}>
            <LoadingIconView />
          </View>
        )}
        <Image
          source={{ uri: imageUrl }}
          onLoad={handleLoad}
          onError={handleError}
          style={[styles.image, { opacity: loading ? 0 : 1 }]}
          resizeMode='contain'
        />
      </View>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
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

export default GearImageView;
