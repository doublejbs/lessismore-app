import FeedContentType from './FeedContentType';
import { CampSpot } from '../camp-site/CampSpotTypes';
import Gear from '../gear/Gear';

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

export interface RecommendedGear {
  content: FeedContentData;
  gear: Gear;
}
