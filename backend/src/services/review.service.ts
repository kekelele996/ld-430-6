import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewRecord, type ReviewRecordDocument } from '../models/reviewRecord.schema';
import { AssetStatus, ReviewResult } from '../types/enums';
import { AssetService } from './asset.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ReviewRecord.name) private readonly reviewModel: Model<ReviewRecordDocument>,
    private readonly assetService: AssetService,
  ) {}

  findAll() {
    return this.reviewModel.find().sort({ reviewedAt: -1 }).exec();
  }

  findPendingAssets() {
    return this.assetService.findAll({ status: AssetStatus.PendingReview });
  }

  findByAssetId(assetId: string) {
    return this.reviewModel.find({ assetId: new Types.ObjectId(assetId) }).sort({ reviewedAt: -1 }).exec();
  }

  async review(assetId: string, payload: { reviewerId: string; result: ReviewResult; comment?: string }) {
    const asset = await this.assetService.findOne(assetId);
    if (!asset) throw new NotFoundException('素材不存在');
    if (asset.status !== AssetStatus.PendingReview) {
      throw new BadRequestException('只有待审核状态的素材才能进行审核');
    }

    const record = await this.reviewModel.create({ ...payload, assetId: new Types.ObjectId(assetId) });

    if (payload.result === ReviewResult.Approved) {
      await this.assetService.publish(assetId);
    } else if (payload.result === ReviewResult.Rejected || payload.result === ReviewResult.NeedsRevision) {
      await this.assetService.update(assetId, { status: AssetStatus.Draft });
    }

    return record;
  }
}
