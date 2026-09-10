type CommunityPostDeletedListener = (postId: string) => void;

const listeners = new Set<CommunityPostDeletedListener>();

export const subscribeCommunityPostDeleted = (
  listener: CommunityPostDeletedListener
): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const notifyCommunityPostDeleted = (postId: string): void => {
  listeners.forEach(listener => listener(postId));
};
