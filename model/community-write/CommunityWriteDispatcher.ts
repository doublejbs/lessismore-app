import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import type Gear from '@/model/gear/Gear';
import CommunityPost from '@/model/community/CommunityPost';
import {
  CommunityPostCreateInput,
  CommunityPostPatch,
} from '@/model/community/CommunityData';
import CommunityStore from '@/model/store/CommunityStore';
import BagStore from '@/model/store/BagStore';

/**
 * 작성 화면의 데이터 접근을 위임한다(CM-2, CM-4, CM-5, CM-9).
 * 공개 커뮤니티 데이터와 개인 장비 사진 Storage 접근을 분리해 조립한다.
 */
class CommunityWriteDispatcher {
  public static new(): CommunityWriteDispatcher {
    return new CommunityWriteDispatcher(
      app.getCommunityStore()!,
      app.getBagStore()!
    );
  }

  private constructor(
    private readonly communityStore: CommunityStore,
    private readonly bagStore: BagStore
  ) {}

  public createPostId(): string {
    return this.communityStore.createPostId();
  }

  public async getPost(postId: string): Promise<CommunityPost | null> {
    return await this.communityStore.getPost(postId);
  }

  public async getBags(): Promise<BagItem[]> {
    return await this.bagStore.getList();
  }

  public async getBagGears(bag: BagItem): Promise<Gear[]> {
    const result = await this.bagStore.getBagWithAllFilter(bag.getID());

    return result?.gears ?? [];
  }

  public async createPost(
    postId: string,
    input: CommunityPostCreateInput
  ): Promise<string> {
    return await this.communityStore.createPost(postId, input);
  }

  public async updatePost(
    postId: string,
    patch: CommunityPostPatch
  ): Promise<void> {
    await this.communityStore.updatePost(postId, patch);
  }
}

export default CommunityWriteDispatcher;
