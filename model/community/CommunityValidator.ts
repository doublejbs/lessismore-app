import CommunityError from './CommunityError';
import {
  CommunityPostCreateInput,
  CommunityPollInputOption,
  CommunityPostImage,
} from './CommunityData';
import CommunityPostType from './CommunityPostType';
import CommunityValidationError from './CommunityValidationError';

class CommunityValidator {
  public static validateTitle(title: string) {
    const length = title.trim().length;

    if (length < 2 || length > 80) {
      throw new CommunityError(CommunityValidationError.TitleLength);
    }
  }

  public static validateBody(type: CommunityPostType, body: string) {
    const length = body.trim().length;
    const minimum = type === CommunityPostType.Poll ? 0 : 10;

    if (length < minimum || length > 5000) {
      throw new CommunityError(CommunityValidationError.BodyLength);
    }
  }

  public static validatePollOptions(options: CommunityPollInputOption[]) {
    if (options.length < 2 || options.length > 4) {
      throw new CommunityError(CommunityValidationError.PollOptionCount);
    }

    const texts = options.map(option => option.text.trim());

    if (texts.some(text => text.length < 1 || text.length > 60)) {
      throw new CommunityError(CommunityValidationError.PollOptionLength);
    }

    if (new Set(texts).size !== texts.length) {
      throw new CommunityError(CommunityValidationError.PollOptionDuplicate);
    }
  }

  public static validateImages(images: CommunityPostImage[]) {
    if (images.length > 4) {
      throw new CommunityError(CommunityValidationError.ImageCount);
    }
  }

  public static validateComment(body: string) {
    const length = body.trim().length;

    if (length < 1 || length > 1000) {
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
