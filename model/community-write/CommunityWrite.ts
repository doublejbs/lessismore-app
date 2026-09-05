import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import {
  CommunityBagSnapshot as CommunityBagSnapshotType,
  CommunityPollInput,
  CommunityPostCreateInput,
  CommunityPostPatch,
} from '@/model/community/CommunityData';
import CommunityError from '@/model/community/CommunityError';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityValidator from '@/model/community/CommunityValidator';
import CommunityValidationError from '@/model/community/CommunityValidationError';
import CommunityBagSnapshotBuilder from '@/model/community/CommunityBagSnapshotBuilder';
import { createCommunityId } from '@/model/community/CommunityId';
import {
  COMMUNITY_DAY_IN_MILLISECONDS,
  COMMUNITY_POLL_MAX_OPTIONS,
  COMMUNITY_POLL_MIN_OPTIONS,
} from '@/model/community/CommunityLimits';
import type BagItem from '@/model/bag/BagItem';
import CommunityImageSession from '@/model/community-image/CommunityImageSession';
import CommunityImageError from '@/model/community-image/CommunityImageError';
import CommunityImagePipelineError from '@/model/community-image/CommunityImagePipelineError';
import CommunityImageUpload from '@/model/community-image/CommunityImageUpload';
import CommunityPendingImage from '@/model/community-image/CommunityPendingImage';
import CommunityWriteDispatcher from './CommunityWriteDispatcher';
import CommunityWriteField from './CommunityWriteField';
import CommunityWriteMode from './CommunityWriteMode';

/**
 * 커뮤니티 글쓰기·수정 도메인 모델이다(CM-2, CM-3, CM-4, CM-5, CM-6, CM-9).
 * 글의 공개 사진은 개인 장비 사진 경로와 분리된 CommunityImageSession만 사용한다.
 */
class CommunityWrite {
  private title = '';
  private body = '';
  private readonly imageSession: CommunityImageSession;
  private selectedBag: BagItem | null = null;
  private bagSnapshot: CommunityBagSnapshotType | null = null;
  private pollOptions: string[] = ['', ''];
  private pollOptionIds: string[] = [createCommunityId(), createCommunityId()];
  private pollAttached = false;
  private pollAllowMultiple = false;
  private pollExpiresAt: Date | null = null;
  private pollExpiryDays = 0;
  private isSubmitting = false;
  private isDirty = false;
  private readonly fieldErrors = new Map<
    CommunityWriteField,
    CommunityValidationError
  >();

  private readonly mode: CommunityWriteMode;
  private readonly postId: string | null;
  private readonly dispatcher: CommunityWriteDispatcher;
  private readonly imageUpload: CommunityImageUpload;
  private existingPost: CommunityPost | null = null;
  private readonly existingStoragePaths = new Set<string>();
  private bags: BagItem[] = [];
  private bagsLoaded = false;
  private bagChanged = false;
  private pollChanged = false;
  private initialized = false;
  private reservedPostId = '';

  public constructor(
    mode: CommunityWriteMode,
    postId: string | null,
    dispatcher: CommunityWriteDispatcher,
    imageSession: CommunityImageSession,
    imageUpload: CommunityImageUpload
  ) {
    this.mode = mode;
    this.postId = postId;
    this.dispatcher = dispatcher;
    this.imageSession = imageSession;
    this.imageUpload = imageUpload;

    makeAutoObservable(this);
  }

  public static create(
    dispatcher: CommunityWriteDispatcher = CommunityWriteDispatcher.new(),
    imageSession: CommunityImageSession = CommunityImageSession.from(
      app.getFirebase()
    )
  ): CommunityWrite {
    return new CommunityWrite(
      CommunityWriteMode.Create,
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
    this.setTitleValue(post.getTitle());
    this.setBodyValue(post.getBody());
    this.setBagSnapshot(post.getBagSnapshot() ?? null);

    const poll = post.getPoll();

    if (poll) {
      this.setPollAttached(true);
      this.setPollOptions(poll.options.map((option) => option.text));
      this.setPollOptionIds(poll.options.map((option) => option.id));
      this.setPollAllowMultiple(poll.allowMultiple);
      this.setPollExpiresAtValue(poll.expiresAt ?? null);
      this.setPollExpiryDaysValue(
        poll.expiresAt ? this.getPresetExpiryDays(poll.expiresAt) : 0
      );
    }

    for (const image of post.getImages()) {
      const localImage = new CommunityPendingImage(
        createCommunityId(),
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

  public hasBagSnapshot(): boolean {
    return this.bagSnapshot !== null;
  }

  public hasPoll(): boolean {
    return this.pollAttached;
  }

  public getTitle(): string {
    return this.title;
  }

  public getBody(): string {
    return this.body;
  }

  public getImageSession(): CommunityImageSession {
    return this.imageSession;
  }

  public getSelectedBag(): BagItem | null {
    return this.selectedBag;
  }

  public getBagSnapshot(): CommunityBagSnapshotType | null {
    return this.bagSnapshot;
  }

  public getPollOptions(): string[] {
    return this.pollOptions;
  }

  public getPollOptionId(index: number): string {
    return this.pollOptionIds[index] ?? `poll-option-${index}`;
  }

  public getPollExpiresAt(): Date | null {
    return this.pollExpiresAt;
  }

  public getPollAllowMultiple(): boolean {
    return this.pollAllowMultiple;
  }

  public getPollExpiryDays(): number {
    return this.pollExpiryDays;
  }

  public getIsSubmitting(): boolean {
    return this.isSubmitting;
  }

  public getIsDirty(): boolean {
    return this.isDirty;
  }

  public getFieldErrors(): Map<CommunityWriteField, CommunityValidationError> {
    return this.fieldErrors;
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

  public setTitle(value: string) {
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

  public removeBagSnapshot() {
    this.setSelectedBag(null);
    this.setBagSnapshot(null);
    this.setBagChanged(true);
    this.markDirty();
  }

  public attachPoll() {
    if (!this.canEditPollStructure()) {
      return;
    }

    if (!this.pollAttached) {
      this.setPollOptions(['', '']);
      this.setPollOptionIds([createCommunityId(), createCommunityId()]);
      this.setPollAllowMultiple(false);
      this.setPollExpiresAtValue(null);
      this.setPollExpiryDaysValue(0);
    }

    this.setPollAttached(true);
    this.setPollChanged(true);
    this.markDirty();
  }

  public removePoll() {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setPollAttached(false);
    this.setPollChanged(true);
    this.markDirty();
  }

  public async loadBags(): Promise<void> {
    if (this.bagsLoaded) {
      return;
    }

    const bags = await this.dispatcher.getBags();
    this.setBags(bags);
    this.setBagsLoaded(true);
  }

  public getBags(): BagItem[] {
    return this.bags;
  }

  public addPollOption() {
    if (
      this.pollOptions.length >= COMMUNITY_POLL_MAX_OPTIONS
      || !this.canEditPollStructure()
    ) {
      return;
    }

    this.setPollOptions([...this.pollOptions, '']);
    this.setPollOptionIds([...this.pollOptionIds, createCommunityId()]);
    this.setPollChanged(true);
    this.markDirty();
  }

  public removePollOption(index: number) {
    if (
      this.pollOptions.length <= COMMUNITY_POLL_MIN_OPTIONS ||
      index < 0 ||
      index >= this.pollOptions.length ||
      !this.canEditPollStructure()
    ) {
      return;
    }

    this.setPollOptions(
      this.pollOptions.filter((_, optionIndex) => optionIndex !== index)
    );
    this.setPollOptionIds(
      this.pollOptionIds.filter((_, optionIndex) => optionIndex !== index)
    );
    this.setPollChanged(true);
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
    this.setPollChanged(true);
    this.markDirty();
  }

  public setPollExpiresAt(value: Date | null) {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setPollExpiresAtValue(value);
    this.setPollExpiryDaysValue(0);
    this.setPollChanged(true);
    this.markDirty();
  }

  public setPollAllowMultiple(value: boolean) {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setPollAllowMultipleValue(value);
    this.setPollChanged(true);
    this.markDirty();
  }

  public setPollExpiryDays(days: number) {
    if (!this.canEditPollStructure()) {
      return;
    }

    this.setPollExpiryDaysValue(days);
    this.setPollExpiresAtValue(
      days ? new Date(Date.now() + days * COMMUNITY_DAY_IN_MILLISECONDS) : null
    );
    this.setPollChanged(true);
    this.markDirty();
  }

  public markImagesDirty() {
    this.markDirty();
  }

  public async cleanupForDiscard(userId: string): Promise<void> {
    if (this.mode === CommunityWriteMode.Create) {
      const failures = await this.imageSession.cleanupUploaded(userId);

      if (failures.length > 0) {
        console.error('커뮤니티 사진 정리 실패:', failures); // l10n-ignore: 개발자 로그
      }

      return;
    }

    const newStoragePaths = this.imageSession
      .getUploadedInOrder()
      .filter((image) => !this.existingStoragePaths.has(image.storagePath))
      .map((image) => image.storagePath);

    if (newStoragePaths.length > 0) {
      const failures = await this.imageUpload.deleteMany(newStoragePaths, userId);

      if (failures.length > 0) {
        console.error('커뮤니티 사진 정리 실패:', failures); // l10n-ignore: 개발자 로그
      }
    }
  }

  public canEditPollStructure(): boolean {
    return this.existingPost?.hasPoll()
      ? this.existingPost.canEditPollStructure()
      : true;
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
      CommunityValidator.validateBody(this.hasBagSnapshot() || this.hasPoll(), this.body);

      if (this.hasPoll() && this.canEditPollStructure()) {
        CommunityValidator.validatePollOptions(
          this.pollOptions.map((text, index) => ({
            id: `option-${index}`,
            text,
          }))
        );
      }

      CommunityValidator.validateImages(
        this.imageSession.getUploadedInOrder()
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
    const postId = this.reservedPostId || this.dispatcher.createPostId();
    this.setReservedPostId(postId);

    await this.imageSession.uploadAll(userId, postId);
    this.ensureAllImagesUploaded();

    try {
      await this.dispatcher.createPost(postId, this.buildCreateInput());
    } catch (error) {
      const failures = await this.imageSession.cleanupUploaded(userId);

      if (failures.length > 0) {
        console.error('커뮤니티 사진 정리 실패:', failures); // l10n-ignore: 개발자 로그
      }

      throw error;
    }

    app.getAnalyticsManager()?.logClick('click_community_publish', {
      has_packing: this.hasBagSnapshot(),
      has_poll: this.hasPoll(),
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
      const failures = await this.imageUpload.deleteMany(removedStoragePaths, userId);

      if (failures.length > 0) {
        console.error('커뮤니티 사진 정리 실패:', failures); // l10n-ignore: 개발자 로그
      }
    }

    this.setDirty(false);

    return this.postId;
  }

  private buildCreateInput(): CommunityPostCreateInput {
    const input: CommunityPostCreateInput = {
      type: CommunityPostType.Post,
      hasBagSnapshot: this.hasBagSnapshot(),
      hasPoll: this.hasPoll(),
      title: this.title,
      body: this.body,
      images: this.imageSession.getUploadedInOrder(),
    };

    if (this.bagSnapshot) {
      input.bagSnapshot = this.bagSnapshot;
    }

    if (this.hasPoll()) {
      input.poll = this.buildPollInput();
    }

    return input;
  }

  private buildPatch(): CommunityPostPatch {
    const patch: CommunityPostPatch = {
      body: this.body,
      images: this.imageSession.getUploadedInOrder(),
      title: this.title,
    };

    if (this.bagChanged) {
      patch.hasBagSnapshot = this.hasBagSnapshot();
      patch.bagSnapshot = this.bagSnapshot;
    }

    if (this.pollChanged && this.canEditPollStructure()) {
      patch.hasPoll = this.hasPoll();

      if (this.hasPoll()) {
        const poll = this.buildPollInput();

        patch.poll = {
          ...poll,
          expiresAt: this.pollExpiresAt ?? null,
          allowMultiple: this.pollAllowMultiple,
        };
      } else {
        patch.poll = null;
      }
    }

    return patch;
  }

  private buildPollInput(): CommunityPollInput {
    const poll: CommunityPollInput = {
      options: this.pollOptions.map((text, index) => ({
        id: this.getPollOptionId(index),
        text: text.trim(),
      })),
      allowMultiple: this.pollAllowMultiple,
    };

    if (this.pollExpiresAt) {
      poll.expiresAt = this.pollExpiresAt;
    }

    return poll;
  }

  private getPresetExpiryDays(expiresAt: Date): number {
    const remaining = expiresAt.getTime() - Date.now();
    const presets = [1, 3, 7];
    const matchingPreset = presets.find(days =>
      Math.abs(remaining - days * COMMUNITY_DAY_IN_MILLISECONDS)
      <= COMMUNITY_DAY_IN_MILLISECONDS / 24
    );

    return matchingPreset ?? -1;
  }

  private ensureAllImagesUploaded() {
    if (this.imageSession.isAllUploaded()) {
      return;
    }

    const imageStates = this.imageSession.images.map((image) => ({
      localId: image.localId,
      state: image.state,
      error: image.error,
      sourceUri: image.sourceUri,
    }));

    console.error('커뮤니티 사진 미완료 상태:', imageStates); // l10n-ignore: 개발자 로그

    throw new CommunityImagePipelineError(CommunityImageError.UploadFailed);
  }

  private fieldForValidation(
    error: CommunityValidationError
  ): CommunityWriteField {
    switch (error) {
      case CommunityValidationError.TitleLength:
        return CommunityWriteField.Title;
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

  private setTitleValue(value: string) {
    this.title = value;
  }

  private setBodyValue(value: string) {
    this.body = value;
  }

  private setSelectedBag(value: BagItem | null) {
    this.selectedBag = value;
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  private setBagsLoaded(value: boolean) {
    this.bagsLoaded = value;
  }

  private setBagSnapshot(value: CommunityBagSnapshotType | null) {
    this.bagSnapshot = value;
  }

  private setPollOptions(value: string[]) {
    this.pollOptions = value;
  }

  private setPollOptionIds(value: string[]) {
    this.pollOptionIds = value;
  }

  private setPollExpiresAtValue(value: Date | null) {
    this.pollExpiresAt = value;
  }

  private setPollAllowMultipleValue(value: boolean) {
    this.pollAllowMultiple = value;
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

  private setPollAttached(value: boolean) {
    this.pollAttached = value;
  }

  private setPollChanged(value: boolean) {
    this.pollChanged = value;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  private addExistingStoragePath(value: string) {
    this.existingStoragePaths.add(value);
  }

  private setReservedPostId(value: string) {
    this.reservedPostId = value;
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
