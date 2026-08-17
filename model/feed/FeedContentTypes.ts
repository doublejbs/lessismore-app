import FeedContentType from './FeedContentType';
import ImageLicense from './ImageLicense';
import { CampSpot } from '../camp-site/CampSpotTypes';

export interface FeedContentData {
  type: FeedContentType;
  title: string;
  summary: string;
  relatedSpotId?: string;
  relatedGearId?: string;
  publishedAt: string;
  published: boolean;
  imageUrl?: string;
  imageSource?: string;
  imageLicense?: ImageLicense;
  imageAttribution?: string;
  imageContentId?: string;
  imageUpdatedAt?: string;
}

export interface RecommendedSpot {
  content: FeedContentData;
  spot: CampSpot;
}
