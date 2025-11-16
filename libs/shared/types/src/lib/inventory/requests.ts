import {
  CardCondition,
  CardLocation,
  CardRarity,
  PackType,
  SportType,
} from '@card-hive/shared-database';

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
  order?: 'asc' | 'desc';
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
