import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import {
  CommunityBagSnapshot as CommunityBagSnapshotType,
  CommunityPollInput,
  CommunityPostCreateInput,
  CommunityPostImage,
  CommunityPostPatch,
} from '@/model/community/CommunityData';
import CommunityError from '@/model/community/CommunityError';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityValidator from '@/model/community/CommunityValidator';
import CommunityValidationError from '@/model/community/CommunityValidationError';
import CommunityBagSnapshotBuilder from '@/model/community/CommunityBagSnapshotBuilder';
import type BagItem from '@/model/bag/BagItem';
import CommunityImageSession from '@/model/community-image/CommunityImageSession';
import CommunityImageError from '@/model/community-image/CommunityImageError';
import CommunityImagePipelineError from '@/model/community-image/CommunityImagePipelineError';
import CommunityImageUpload from '@/model/community-image/CommunityImageUpload';
import CommunityPendingImage from '@/model/community-image/CommunityPendingImage';
import CommunityWriteDispatcher from './CommunityWriteDispatcher';
import CommunityWriteField from './CommunityWriteField';
import CommunityWriteMode from './CommunityWriteMode';

const createLocalId = (): string => {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
};

/**
 * 커뮤니티 글쓰기·수정 도메인 모델이다(CM-2, CM-3, CM-4, CM-5, CM-6, CM-9).
 * 글의 공개 사진은 개인 장비 사진 경로와 분리된 CommunityImageSession만 사용한다.
 */
class CommunityWrite {
  public type: CommunityPostType;
  public title = '';
  public body = '';
  public readonly imageSession: CommunityImageSession;
  public selectedBag: BagItem | null = null;
  public bagSnapshot: CommunityBagSnapshotType | null = null;
  public pollOptions: string[] = ['', ''];
  public pollExpiresAt: Date | null = null;
  public pollExpiryDays = 0;
  public isSubmitting = false;
  public isDirty = false;
  public readonly fieldErrors = new Map<
    CommunityWriteField,
    CommunityValidationError
  >();

  private readonly mode: CommunityWriteMode;
  private readonly postId: string | null;
  private readonly dispatcher: CommunityWriteDispatcher;
  private readonly imageUpload: CommunityImageUpload;
  private existingPost: CommunityPost | null = null;
  private readonly existingStoragePaths = new Set<string>();
  private bagChanged = false;
  private initialized = false;
  private createPostId = '';

  public constructor(
    mode: CommunityWriteMode,
    type: CommunityPostType,
    postId: string | null,
    dispatcher: CommunityWriteDispatcher,
    imageSession: CommunityImageSession,
    imageUpload: CommunityImageUpload
  ) {
    this.mode = mode;
    this.type = type;
    this.postId = postId;
    this.dispatcher = dispatcher;
    this.imageSession = imageSession;
    this.imageUpload = imageUpload;

    makeAutoObservable(this);
  }

  public static create(
    type: CommunityPostType,
    dispatcher: CommunityWriteDispatcher = CommunityWriteDispatcher.new(),
    imageSession: CommunityImageSession = CommunityImageSession.from(
      app.getFirebase()
    )
  ): CommunityWrite {
    return new CommunityWrite(
      CommunityWriteMode.Create,
      type,
      null,
      dispatcher,
      imageSession,
      CommunityImageUpload.from(app.getFirebase())
    );
  }

  public static edit(
    postId: string,
    dispatcher: CommunityWriteDispatcher = CommunityWriteDispatcher.new(),
    imageSession: CommunityImageSession = CommunityImageSession.from(
      app.getFirebase()
    )
  ): CommunityWrite {
    return new CommunityWrite(
      CommunityWriteMode.Edit,
      CommunityPostType.Question,
      postId,
      dispatcher,
      imageSession,
      CommunityImageUpload.from(app.getFirebase())
    );
  }

  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.existingPost !== null || this.mode === CommunityWriteMode.Create;
    }

    if (this.mode === CommunityWriteMode.Create) {
      this.setInitialized(true);

      return true;
    }

    if (!this.postId) {
      this.setInitialized(true);

      return false;
    }

    const post = await this.dispatcher.getPost(this.postId);
    const userId = app.getFirebase().getUserId();

    if (!post || !userId || post.getAuthorId() !== userId) {
      this.setInitialized(true);

      return false;
    }

    this.setExistingPost(post);
    this.setType(post.getType());
    this.setTitleValue(post.getTitle());
    this.setBodyValue(post.getBody());
    this.setBagSnapshot(post.getBagSnapshot() ?? null);

    const poll = post.getPoll();

    if (poll) {
      this.setPollOptions(poll.options.map((option) => option.text));
      this.setPollExpiresAtValue(poll.expiresAt ?? null);
      this.setPollExpiryDaysValue(
        poll.expiresAt
          ? Math.max(0, Math.round((poll.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
          : 0
      );
    }

    for (const image of post.getImages()) {
      const localImage = new CommunityPendingImage(
        createLocalId(),
        image.url,
        image.width,
        image.height
      );
      localImage.markDone(image);
      this.imageSession.add([localImage]);
      this.addExistingStoragePath(image.storagePath);
    }

    this.setInitialized(true);

    return true;
  }

  public getMode(): CommunityWriteMode {
    return this.mode;
  }

  public getPostId(): string | null {
    return this.postId;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getAuthorName(): string {
    return app.getFirebase().getNickname();
  }

  public isEdit(): boolean {
    return this.mode === CommunityWriteMode.Edit;
  }

  public updateTypeIfEmpty(value: CommunityPostType): boolean {
    if (
      this.mode === CommunityWriteMode.Edit ||
      this.isDirty ||
      this.title.trim() ||
      this.body.trim() ||
      this.selectedBag ||
      this.bagSnapshot ||
      this.imageSession.images.length > 0
    ) {
      return false;
    }

    this.setType(value);

    return true;
  }

  public setTitle(value: string) {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setTitleValue(value);
    this.clearFieldError(CommunityWriteField.Title);
    this.markDirty();
  }

  public setBody(value: string) {
    this.setBodyValue(value);
    this.clearFieldError(CommunityWriteField.Body);
    this.markDirty();
  }

  public async selectBag(bag: BagItem): Promise<void> {
    const gears = await this.dispatcher.getBagGears(bag);

    this.setSelectedBag(bag);
    this.setBagSnapshot(CommunityBagSnapshotBuilder.build(bag, gears));
    this.setBagChanged(true);
    this.clearFieldError(CommunityWriteField.Bag);
    this.markDirty();
  }

  public addPollOption() {
    if (this.pollOptions.length >= 4 || !this.canEditPollStructure()) {
      return;
    }

    this.setPollOptions([...this.pollOptions, '']);
    this.markDirty();
  }

  public removePollOption(index: number) {
    if (
      this.pollOptions.length <= 2 ||
      index < 0 ||
      index >= this.pollOptions.length ||
      !this.canEditPollStructure()
    ) {
      return;
    }

    this.setPollOptions(
      this.pollOptions.filter((_, optionIndex) => optionIndex !== index)
    );
    this.markDirty();
  }

  public setPollOption(index: number, value: string) {
    if (
      index < 0 ||
      index >= this.pollOptions.length ||
      !this.canEditPollStructure()
    ) {
      return;
    }

    this.setPollOptions(
      this.pollOptions.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    );
    this.clearFieldError(CommunityWriteField.PollOptions);
    this.markDirty();
  }

  public setPollExpiresAt(value: Date | null) {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setPollExpiresAtValue(value);
    this.setPollExpiryDaysValue(0);
    this.markDirty();
  }

  public setPollExpiryDays(days: number) {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setPollExpiryDaysValue(days);
    this.setPollExpiresAtValue(
      days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null
    );
    this.markDirty();
  }

  public markImagesDirty() {
    this.markDirty();
  }

  public async cleanupForDiscard(userId: string): Promise<void> {
    if (this.mode === CommunityWriteMode.Create) {
      await this.imageSession.cleanupUploaded(userId);

      return;
    }

    const newStoragePaths = this.imageSession
      .getUploadedInOrder()
      .filter((image) => !this.existingStoragePaths.has(image.storagePath))
      .map((image) => image.storagePath);

    if (newStoragePaths.length > 0) {
      await this.imageUpload.deleteMany(newStoragePaths, userId);
    }
  }

  public canEditPollStructure(): boolean {
    if (this.type !== CommunityPostType.Poll) {
      return true;
    }

    return this.existingPost?.canEditPollStructure() ?? true;
  }

  public async submit(): Promise<string | null> {
    if (this.isSubmitting) {
      return null;
    }

    const userId = app.getFirebase().getUserId();

    if (!userId) {
      throw new CommunityError(CommunityValidationError.NotLoggedIn);
    }

    this.validate();
    this.setSubmitting(true);

    try {
      if (this.mode === CommunityWriteMode.Create) {
        return await this.submitCreate(userId);
      }

      return await this.submitEdit(userId);
    } catch (error) {
      if (error instanceof CommunityError) {
        this.setFieldError(
          this.fieldForValidation(error.code),
          error.code
        );
      }

      throw error;
    } finally {
      this.setSubmitting(false);
    }
  }

  private validate() {
    this.clearFieldErrors();

    try {
      CommunityValidator.validateTitle(this.title);
      CommunityValidator.validateBody(this.type, this.body);

      if (this.type === CommunityPostType.BagReview && !this.bagSnapshot) {
        throw new CommunityError(CommunityValidationError.BagSnapshotRequired);
      }

      if (this.type === CommunityPostType.Poll && this.canEditPollStructure()) {
        CommunityValidator.validatePollOptions(
          this.pollOptions.map((text, index) => ({
            id: `option-${index}`,
            text,
          }))
        );
      }

      CommunityValidator.validateImages(
        this.imageSession.getUploadedInOrder() as CommunityPostImage[]
      );
    } catch (error) {
      if (error instanceof CommunityError) {
        this.setFieldError(
          this.fieldForValidation(error.code),
          error.code
        );
      }

      throw error;
    }
  }

  private async submitCreate(userId: string): Promise<string> {
    const postId = this.createPostId || this.dispatcher.createPostId();
    this.setCreatePostId(postId);

    await this.imageSession.uploadAll(userId, postId);
    this.ensureAllImagesUploaded();

    try {
      await this.dispatcher.createPost(postId, this.buildCreateInput());
    } catch (error) {
      await this.imageSession.cleanupUploaded(userId);

      throw error;
    }

    app.getAnalyticsManager()?.logClick('click_community_publish', {
      type: this.type,
      image_count: this.imageSession.getUploadedInOrder().length,
    });
    this.setDirty(false);

    return postId;
  }

  private async submitEdit(userId: string): Promise<string> {
    if (!this.postId) {
      throw new CommunityError(CommunityValidationError.PostNotFound);
    }

    await this.imageSession.uploadAll(userId, this.postId);
    this.ensureAllImagesUploaded();
    const images = this.imageSession.getUploadedInOrder();
    const removedStoragePaths = Array.from(this.existingStoragePaths).filter(
      (path) => !images.some((image) => image.storagePath === path)
    );

    await this.dispatcher.updatePost(this.postId, this.buildPatch());

    if (removedStoragePaths.length > 0) {
      await this.imageUpload.deleteMany(removedStoragePaths, userId);
    }

    this.setDirty(false);

    return this.postId;
  }

  private buildCreateInput(): CommunityPostCreateInput {
    const input: CommunityPostCreateInput = {
      type: this.type,
      title: this.title,
      body: this.body,
      images: this.imageSession.getUploadedInOrder() as CommunityPostImage[],
    };

    if (this.type === CommunityPostType.BagReview && this.bagSnapshot) {
      input.bagSnapshot = this.bagSnapshot;
    }

    if (this.type === CommunityPostType.Poll) {
      input.poll = this.buildPollInput();
    }

    return input;
  }

  private buildPatch(): CommunityPostPatch {
    const patch: CommunityPostPatch = {
      body: this.body,
      images: this.imageSession.getUploadedInOrder() as CommunityPostImage[],
    };

    if (this.canEditPollStructure()) {
      patch.title = this.title;

      if (this.type === CommunityPostType.Poll) {
        const poll = this.buildPollInput();

        patch.poll = this.pollExpiresAt
          ? poll
          : { ...poll, expiresAt: null };
      }
    }

    if (this.type === CommunityPostType.BagReview && this.bagChanged && this.bagSnapshot) {
      patch.bagSnapshot = this.bagSnapshot;
    }

    return patch;
  }

  private buildPollInput(): CommunityPollInput {
    const poll: CommunityPollInput = {
      options: this.pollOptions.map((text, index) => ({
        id: `option-${index}`,
        text: text.trim(),
      })),
    };

    if (this.pollExpiresAt) {
      poll.expiresAt = this.pollExpiresAt;
    }

    return poll;
  }

  private ensureAllImagesUploaded() {
    if (this.imageSession.isAllUploaded()) {
      return;
    }

    throw new CommunityImagePipelineError(CommunityImageError.UploadFailed);
  }

  private fieldForValidation(
    error: CommunityValidationError
  ): CommunityWriteField {
    switch (error) {
      case CommunityValidationError.TitleLength:
        return CommunityWriteField.Title;
      case CommunityValidationError.BagSnapshotRequired:
        return CommunityWriteField.Bag;
      case CommunityValidationError.PollOptionCount:
      case CommunityValidationError.PollOptionLength:
      case CommunityValidationError.PollOptionDuplicate:
      case CommunityValidationError.PollOptionInvalid:
      case CommunityValidationError.PollLocked:
        return CommunityWriteField.PollOptions;
      default:
        return CommunityWriteField.Body;
    }
  }

  private markDirty() {
    this.setDirty(true);
  }

  private setType(value: CommunityPostType) {
    this.type = value;
  }

  private setTitleValue(value: string) {
    this.title = value;
  }

  private setBodyValue(value: string) {
    this.body = value;
  }

  private setSelectedBag(value: BagItem | null) {
    this.selectedBag = value;
  }

  private setBagSnapshot(value: CommunityBagSnapshotType | null) {
    this.bagSnapshot = value;
  }

  private setPollOptions(value: string[]) {
    this.pollOptions = value;
  }

  private setPollExpiresAtValue(value: Date | null) {
    this.pollExpiresAt = value;
  }

  private setPollExpiryDaysValue(value: number) {
    this.pollExpiryDays = value;
  }

  private setSubmitting(value: boolean) {
    this.isSubmitting = value;
  }

  private setDirty(value: boolean) {
    this.isDirty = value;
  }

  private setExistingPost(value: CommunityPost | null) {
    this.existingPost = value;
  }

  private setBagChanged(value: boolean) {
    this.bagChanged = value;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  private addExistingStoragePath(value: string) {
    this.existingStoragePaths.add(value);
  }

  private setCreatePostId(value: string) {
    this.createPostId = value;
  }

  private clearFieldErrors() {
    this.fieldErrors.clear();
  }

  private setFieldError(
    field: CommunityWriteField,
    error: CommunityValidationError
  ) {
    this.fieldErrors.set(field, error);
  }

  private clearFieldError(field: CommunityWriteField) {
    this.fieldErrors.delete(field);
  }
}

export default CommunityWrite;
