import {
  CardCondition,
  CardLocation,
  CardRarity,
  PackType,
  SportType,
} from '@card-hive/shared-database';
import { SORT_ORDER } from '../common.js';

export interface CreatePackRequest {
  packType: PackType;
  sportType: SportType;
  description?: string;
  imageUrl: string;
  bannerUrl: string;
  price: string;
  isActive?: boolean;
}

export interface UpdatePackRequest {
  name?: string;
  packType?: PackType;
  sportType?: SportType;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  price?: string;
  isActive?: boolean;
}

export interface GetPacksQueryParams {
  packType?: PackType;
  sportType?: SportType;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: PACK_SORT_BY;
  sortOrder?: SORT_ORDER;
}

export interface CreateCardRequest {
  packID: string;
  name: string;
  sportType: SportType;
  rarity: CardRarity;
  serialNumber: string;
  estimatedValue?: string;
  description?: string;
  playerName?: string;
  year?: number;
  manufacturer?: string;
  condition?: CardCondition;
  imageUrl: string;
  bannerUrl: string;
  ownerID?: string;
}

export interface UpdateCardRequest {
  name?: string;
  sportType?: SportType;
  rarity?: CardRarity;
  serialNumber?: string;
  estimatedValue?: string;
  description?: string;
  playerName?: string;
  year?: number;
  manufacturer?: string;
  condition?: CardCondition;
  imageUrl?: string;
  bannerUrl?: string;
}

export interface GetCardsQueryParams {
  packID?: string;
  sportType?: SportType;
  rarity?: CardRarity;
  serialNumber?: string;
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface CreateInventoryItemRequest {
  userID: string;
  cardID: string;
  location?: CardLocation;
  acquiredAt?: string;
  shippedAt?: string;
}

export interface UpdateInventoryItemRequest {
  location?: CardLocation;
  acquiredAt?: string;
  shippedAt?: string;
}

export interface GetInventoryItemsQueryParams {
  location?: CardLocation;
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

export const PACK_SORT_BY = {
  PACK_TYPE: 'packType',
  CREATED_AT: 'createdAt',
  PRICE: 'price',
  CARDS: 'cards'
}
export type PACK_SORT_BY = (typeof PACK_SORT_BY)[keyof typeof PACK_SORT_BY];
