import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, Prisma, Pack } from '@card-hive/shared-database';
import { CreatePackRequest, GetPacksQueryParams, UpdatePackRequest } from '@card-hive/shared-types';

@Injectable()
export class PacksService {
  constructor(private readonly prisma: PrismaService) {}

  async listPacks(query: GetPacksQueryParams) {
    const {
      packType,
      sportType,
      isActive,
      page = 1,
      limit = 20,
      order = 'desc',
    } = query;

    const where: Prisma.PackWhereInput = {};
    if (packType) {
      where.packType = packType;
    }
    if (sportType) {
      where.sportType = sportType;
    }
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    return this.prisma.paginate<Pack>(this.prisma.pack, {
      page,
      limit,
      where,
      orderBy: { createdAt: order },
    });
  }

  async getPack(id: string) {
    const pack = await this.prisma.pack.findUnique({ where: { id } });
    if (!pack) {
      throw new NotFoundException('Pack not found');
    }
    return pack;
  }

  async createPack(dto: CreatePackRequest) {
    return this.prisma.pack.create({
      data: {
        packType: dto.packType,
        sportType: dto.sportType,
        description: dto.description,
        imageUrl: dto.imageUrl,
        bannerUrl: dto.bannerUrl,
        price: new Prisma.Decimal(dto.price),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePack(id: string, dto: UpdatePackRequest) {
    await this.ensurePackExists(id);

    const data: Prisma.PackUpdateInput = {};
    if (dto.packType) {
      data.packType = dto.packType;
    }
    if (dto.sportType) {
      data.sportType = dto.sportType;
    }
    if (dto.description) {
      data.description = dto.description;
    }
    if (dto.imageUrl) {
      data.imageUrl = dto.imageUrl;
    }
    if (dto.bannerUrl) {
      data.bannerUrl = dto.bannerUrl;
    }
    if (dto.price) {
      data.price = new Prisma.Decimal(dto.price);
    }
    if (typeof dto.isActive === 'boolean') {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required when updating a pack');
    }

    return this.prisma.pack.update({
      where: { id },
      data,
    });
  }

  async deletePack(id: string) {
    await this.ensurePackExists(id);
    await this.prisma.pack.delete({ where: { id } });
  }

  private async ensurePackExists(id: string) {
    const exists = await this.prisma.pack.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Pack not found');
    }
  }
}
