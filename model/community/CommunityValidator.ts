import CommunityError from './CommunityError';
import {
  CommunityPostCreateInput,
  CommunityPollInputOption,
  CommunityPostImage,
} from './CommunityData';
import CommunityPostType from './CommunityPostType';
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

  public static validateBody(type: CommunityPostType, body: string) {
    const length = body.trim().length;
    const minimum = type === CommunityPostType.Poll ? 0 : COMMUNITY_BODY_MIN_LENGTH;

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
    this.validateTitle(input.title);
    this.validateBody(input.type, input.body);
    this.validateImages(input.images);

    if (input.type === CommunityPostType.BagReview && !input.bagSnapshot) {
      throw new CommunityError(CommunityValidationError.BagSnapshotRequired);
    }

    if (input.type === CommunityPostType.Poll && !input.poll) {
      throw new CommunityError(CommunityValidationError.PollRequired);
    }

    if (input.type === CommunityPostType.Poll && input.poll) {
      this.validatePollOptions(input.poll.options);
    }
  }
}

export default CommunityValidator;
