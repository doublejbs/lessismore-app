import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Color } from '@/constants/DesignTokens';
import CommunityImagePicker from '@/model/community-image/CommunityImagePicker';
import CommunityImagePipelineError from '@/model/community-image/CommunityImagePipelineError';
import CommunityImageUploadState from '@/model/community-image/CommunityImageUploadState';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import { COMMUNITY_IMAGE_MAX_COUNT } from '@/model/community/CommunityLimits';
import app from '@/model/app/App';

interface Props {
  write: CommunityWrite;
}

/**
 * 커뮤니티 공개 사진 선택·순서·상태 View다(CM-6, CM-11, DM-9, DM-28).
 * 사진 선택은 게시글 전용 세션에만 넣고 개인 장비 사진 경로와 분리한다.
 */
const CommunityWriteImagesView = ({ write }: Props) => {
  const l10n = app.getL10n();
  const [picker] = useState(() => new CommunityImagePicker());
  const [sourceMenuVisible, setSourceMenuVisible] = useState(false);
  const imageSession = write.getImageSession();
  const total = imageSession.images.length;
  const canAdd = total < COMMUNITY_IMAGE_MAX_COUNT;

  const handleAlbum = async () => {
    setSourceMenuVisible(false);

    try {
      const images = await picker.pickFromAlbum(COMMUNITY_IMAGE_MAX_COUNT - total);
      if (images) {
        imageSession.add(images);
        write.markImagesDirty();
      }
    } catch (error) {
      if (error instanceof CommunityImagePipelineError) {
        app.getToastManager()?.show({
          message: l10n.t('community.write.image.failed'),
        });
      }
    }
  };

  const handleCamera = async () => {
    setSourceMenuVisible(false);

    try {
      const image = await picker.captureWithCamera();
      if (image) {
        imageSession.add([image]);
        write.markImagesDirty();
      }
    } catch (error) {
      if (error instanceof CommunityImagePipelineError) {
        app.getToastManager()?.show({
          message: l10n.t('community.write.image.failed'),
        });
      }
    }
  };

  const handleRemove = (localId: string) => {
    if (write.getIsSubmitting()) {
      return;
    }

    imageSession.remove(localId);
    write.markImagesDirty();
  };

  const handleMove = (from: number, to: number) => {
    if (write.getIsSubmitting()) {
      return;
    }

    imageSession.move(from, to);
    write.markImagesDirty();
  };

  const handleRetry = async (localId: string) => {
    try {
      await imageSession.retry(localId);
    } catch {
      app.getToastManager()?.show({
        message: l10n.t('community.write.image.failed'),
      });
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <PretendardText style={styles.label} weight='semibold'>
          {l10n.t('community.write.image.section')}
        </PretendardText>
        <PretendardText style={styles.counter}>
          {l10n.t('community.write.counter', { count: total, max: COMMUNITY_IMAGE_MAX_COUNT })}
        </PretendardText>
      </View>
      <View style={styles.row}>
        {imageSession.images.map((image, index) => (
          <View key={image.localId} style={styles.thumbnailWrap}>
            <Image
              source={{ uri: image.sourceUri }}
              style={styles.thumbnail}
              contentFit='cover'
              accessibilityLabel={l10n.t('community.write.image.label', {
                count: index + 1,
                total,
              })}
              accessibilityRole='image'
              accessibilityActions={[
                ...(index > 0 ? [{ name: 'move-forward' }] : []),
                ...(index < total - 1 ? [{ name: 'move-backward' }] : []),
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'move-forward' && index > 0) {
                  handleMove(index, index - 1);
                } else if (
                  event.nativeEvent.actionName === 'move-backward' &&
                  index < total - 1
                ) {
                  handleMove(index, index + 1);
                }
              }}
            />
            {index === 0 && (
              <View style={styles.representativeBadge}>
                <PretendardText style={styles.representativeText}>
                  {l10n.t('community.write.image.representative')}
                </PretendardText>
              </View>
            )}
            {image.state === CommunityImageUploadState.Uploading && (
              <View style={styles.statusOverlay}>
                <PretendardText style={styles.statusText}>
                  {`${l10n.t('community.write.image.uploading')} ${Math.round(image.progress * 100)}%`}
                </PretendardText>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${image.progress * 100}%` }]} />
                </View>
              </View>
            )}
            {image.state === CommunityImageUploadState.Failed && (
              <View style={styles.statusOverlay}>
                <PretendardText style={styles.statusText}>
                  {l10n.t('community.write.image.failed')}
                </PretendardText>
              </View>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleRemove(image.localId)}
              disabled={write.getIsSubmitting()}
              accessibilityLabel={l10n.t('community.write.image.remove', {
                count: index + 1,
              })}
              accessibilityRole='button'
              hitSlop={8}
            >
              <Ionicons name='close-circle' size={22} color={Acg.paper} />
            </TouchableOpacity>
            <View style={styles.actions}>
              <View style={styles.moveActions}>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => handleMove(index, index - 1)}
                    disabled={write.getIsSubmitting()}
                    accessibilityLabel={l10n.t('community.write.image.moveForward')}
                    accessibilityRole='button'
                    accessibilityActions={[{ name: 'move-forward' }]}
                    onAccessibilityAction={() => handleMove(index, index - 1)}
                  >
                    <Ionicons name='chevron-back' size={16} color={Acg.ink} />
                  </TouchableOpacity>
                )}
                {index < total - 1 && (
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => handleMove(index, index + 1)}
                    disabled={write.getIsSubmitting()}
                    accessibilityLabel={l10n.t('community.write.image.moveBackward')}
                    accessibilityRole='button'
                    accessibilityActions={[{ name: 'move-backward' }]}
                    onAccessibilityAction={() => handleMove(index, index + 1)}
                  >
                    <Ionicons name='chevron-forward' size={16} color={Acg.ink} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {image.state === CommunityImageUploadState.Failed && (
              <View style={styles.failedActions}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void handleRetry(image.localId)}
                  disabled={write.getIsSubmitting()}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('community.write.image.retry')}
                >
                  <PretendardText style={styles.retryText}>
                    {l10n.t('community.write.image.retry')}
                  </PretendardText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {canAdd && (
          <TouchableOpacity
            style={styles.addTile}
            onPress={() => setSourceMenuVisible(true)}
            disabled={write.getIsSubmitting()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('community.write.image.addLabel')}
          >
            <Ionicons name='add' size={28} color={Acg.ink} />
            <PretendardText style={styles.addText}>
              {l10n.t('community.write.image.addLabel')}
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
      <PretendardText style={styles.notice}>
        {l10n.t('community.write.image.notice')}
      </PretendardText>
      <BottomMenuModalView
        visible={sourceMenuVisible}
        onClose={() => setSourceMenuVisible(false)}
        menuItems={[
          {
            icon: 'images-outline',
            text: l10n.t('community.write.image.album'),
            onPress: () => void handleAlbum(),
          },
          ...(picker.isCameraAvailable()
            ? [
                {
                  icon: 'camera-outline' as const,
                  text: l10n.t('community.write.image.camera'),
                  onPress: () => void handleCamera(),
                },
              ]
            : []),
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  counter: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnailWrap: {
    width: 78,
    gap: 4,
  },
  thumbnail: {
    width: 78,
    height: 78,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  representativeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Acg.ink,
    borderRadius: AcgRadius.chip,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  representativeText: {
    ...AcgType.meta,
    color: Acg.paper,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFill,
    top: 0,
    bottom: 28,
    backgroundColor: Color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AcgRadius.thumb,
  },
  statusText: {
    ...AcgType.meta,
    color: Acg.paper,
  },
  progressTrack: {
    width: 56,
    height: 4,
    marginTop: 4,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: Acg.ink,
  },
  actions: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveActions: {
    flexDirection: 'row',
  },
  smallButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.chip,
  },
  failedActions: {
    alignItems: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  retryText: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  addTile: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    gap: 2,
  },
  addText: {
    ...AcgType.meta,
    color: Acg.ink,
    textAlign: 'center',
  },
  notice: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default observer(CommunityWriteImagesView);
