import CommunityError from './CommunityError';
import {
  CommunityPostCreateInput,
  CommunityPollInputOption,
  CommunityPostImage,
} from './CommunityData';
import CommunityValidationError from './CommunityValidationError';
import {
  COMMUNITY_BODY_MAX_LENGTH,
  COMMUNITY_BODY_MIN_LENGTH,
  COMMUNITY_COMMENT_MAX_LENGTH,
  COMMUNITY_COMMENT_MIN_LENGTH,
  COMMUNITY_IMAGE_MAX_COUNT,
  COMMUNITY_POLL_MAX_OPTIONS,
  COMMUNITY_POLL_MIN_OPTIONS,
  COMMUNITY_POLL_OPTION_MAX_LENGTH,
  COMMUNITY_POLL_OPTION_MIN_LENGTH,
  COMMUNITY_TITLE_MAX_LENGTH,
  COMMUNITY_TITLE_MIN_LENGTH,
} from './CommunityLimits';

class CommunityValidator {
  public static validateTitle(title: string) {
    const length = title.trim().length;

    if (length < COMMUNITY_TITLE_MIN_LENGTH || length > COMMUNITY_TITLE_MAX_LENGTH) {
      throw new CommunityError(CommunityValidationError.TitleLength);
    }
  }

  public static validateBody(hasAttachment: boolean, body: string) {
    const length = body.trim().length;
    const minimum = hasAttachment ? 0 : COMMUNITY_BODY_MIN_LENGTH;

    if (length < minimum || length > COMMUNITY_BODY_MAX_LENGTH) {
      throw new CommunityError(CommunityValidationError.BodyLength);
    }
  }

  public static validatePollOptions(options: CommunityPollInputOption[]) {
    if (options.length < COMMUNITY_POLL_MIN_OPTIONS || options.length > COMMUNITY_POLL_MAX_OPTIONS) {
      throw new CommunityError(CommunityValidationError.PollOptionCount);
    }

    const texts = options.map(option => option.text.trim());

    if (texts.some(text => text.length < COMMUNITY_POLL_OPTION_MIN_LENGTH || text.length > COMMUNITY_POLL_OPTION_MAX_LENGTH)) {
      throw new CommunityError(CommunityValidationError.PollOptionLength);
    }

    if (new Set(texts).size !== texts.length) {
      throw new CommunityError(CommunityValidationError.PollOptionDuplicate);
    }
  }

  public static validateImages(images: CommunityPostImage[]) {
    if (images.length > COMMUNITY_IMAGE_MAX_COUNT) {
      throw new CommunityError(CommunityValidationError.ImageCount);
    }
  }

  public static validateComment(body: string) {
    const length = body.trim().length;

    if (length < COMMUNITY_COMMENT_MIN_LENGTH || length > COMMUNITY_COMMENT_MAX_LENGTH) {
      throw new CommunityError(CommunityValidationError.CommentLength);
    }
  }

  public static validatePost(input: CommunityPostCreateInput) {
    if (
      input.hasBagSnapshot !== !!input.bagSnapshot ||
      input.hasPoll !== !!input.poll
    ) {
      throw new CommunityError(CommunityValidationError.AttachmentMismatch);
    }

    this.validateTitle(input.title);
    this.validateBody(input.hasBagSnapshot || input.hasPoll, input.body);
    this.validateImages(input.images);

    if (input.poll) {
      this.validatePollOptions(input.poll.options);
    }
  }
}

export default CommunityValidator;
