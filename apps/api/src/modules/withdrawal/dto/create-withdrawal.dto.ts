import { IsInt, Min, IsString, IsIn, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AccountDetailsDto {
  @IsString() accountNumber: string;
  @IsString() accountName: string;
  @IsString() routingCode?: string;
}

export class CreateWithdrawalDto {
  @IsInt()
  @Min(500)
  amount: number;

  @IsString()
  @IsIn(['BKASH', 'NAGAD', 'BANK'])
  method: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AccountDetailsDto)
  accountDetails: AccountDetailsDto;
}
