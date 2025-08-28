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

  if (
    !!imageUrl &&
    (String(imageUrl).includes('.com') || String(imageUrl).includes('.net'))
  ) {
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
          resizeMode='cover'
        />
      </View>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
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
    width: 80,
    height: 80,
  },
});

export default GearImageView;
