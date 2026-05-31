import { Body, Controller, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('bookings/:bookingId/initiate')
  initiate(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentService.initiatePayment(bookingId, userId);
  }

  @Public()
  @Post('sslcommerz/success')
  sslcommerzSuccess(
    @Query('val_id') valId: string,
    @Body('tran_id') tranId: string,
  ) {
    return this.paymentService.handlePaymentSuccess(valId, tranId);
  }

  @Public()
  @Post('sslcommerz/fail')
  sslcommerzFail() {
    return { message: 'Payment failed' };
  }

  @Public()
  @Post('sslcommerz/cancel')
  sslcommerzCancel() {
    return { message: 'Payment cancelled' };
  }
}
