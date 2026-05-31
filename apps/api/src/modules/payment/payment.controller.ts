import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Public()
  @Post('callback')
  @ApiOperation({ summary: 'Payment gateway callback' })
  callback(@Body() data: any) {
    return this.paymentService.handleGatewayCallback(data);
  }
}
