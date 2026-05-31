import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SSLCommerzSession {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  storeBanner?: string;
  storelogo?: string;
  desc?: string[];
}

@Injectable()
export class SSLCommerzService {
  private readonly logger = new Logger(SSLCommerzService.name);

  constructor(private configService: ConfigService) {}

  private get baseUrl(): string {
    return this.configService.get<string>('payment.sslcommerz.baseUrl')!;
  }

  async initPayment(params: {
    amount: number;
    currency: string;
    tranId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    productName: string;
    productCategory: string;
  }): Promise<SSLCommerzSession> {
    const storeId = this.configService.get<string>('payment.sslcommerz.storeId');
    const storePassword = this.configService.get<string>('payment.sslcommerz.storePassword');

    const data = new URLSearchParams({
      store_id: storeId!,
      store_passwd: storePassword!,
      total_amount: params.amount.toString(),
      currency: params.currency,
      tran_id: params.tranId,
      success_url: this.configService.get<string>('payment.sslcommerz.successUrl')!,
      fail_url: this.configService.get<string>('payment.sslcommerz.failUrl')!,
      cancel_url: this.configService.get<string>('payment.sslcommerz.cancelUrl')!,
      cus_name: params.customerName,
      cus_email: params.customerEmail,
      cus_phone: params.customerPhone,
      product_name: params.productName,
      product_category: params.productCategory,
      product_profile: 'non-physical-goods',
      shipping_method: 'NO',
      num_of_item: '1',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
    });

    try {
      const response = await axios.post<SSLCommerzSession>(
        `${this.baseUrl}/gwprocess/v4/api.php`,
        data.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return response.data;
    } catch (error) {
      this.logger.error('SSLCommerz init payment failed', error);
      throw error;
    }
  }

  async validatePayment(valId: string): Promise<boolean> {
    const storeId = this.configService.get<string>('payment.sslcommerz.storeId');
    const storePassword = this.configService.get<string>('payment.sslcommerz.storePassword');

    try {
      const response = await axios.get(
        `${this.baseUrl}/validator/api/validationserverAPI.php`,
        {
          params: {
            val_id: valId,
            store_id: storeId,
            store_passwd: storePassword,
            format: 'json',
          },
        },
      );
      return response.data.status === 'VALID' || response.data.status === 'VALIDATED';
    } catch {
      return false;
    }
  }
}
