import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Roles(RoleType.DRIVER)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit review for a completed booking' })
  createReview(@CurrentUser('id') authorId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(authorId, dto);
  }

  @Public()
  @Get('space/:spaceId')
  @ApiOperation({ summary: 'Get reviews for a parking space' })
  getSpaceReviews(@Param('spaceId') spaceId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.reviewsService.getSpaceReviews(spaceId, +page, +limit);
  }

  @Roles(RoleType.OWNER)
  @Post(':id/respond')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Owner response to review' })
  respond(@Param('id') reviewId: string, @CurrentUser('id') ownerId: string, @Body() body: { response: string }) {
    return this.reviewsService.respondToReview(reviewId, ownerId, body.response);
  }
}
