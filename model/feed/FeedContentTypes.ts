import FeedContentType from './FeedContentType';
import { CampSpot } from '../camp-site/CampSpotTypes';

export interface FeedContentData {
  type: FeedContentType;
  title: string;
  summary: string;
  relatedSpotId?: string;
  relatedGearId?: string;
  publishedAt: string;
  published: boolean;
}

export interface RecommendedSpot {
  content: FeedContentData;
  spot: CampSpot;
}
