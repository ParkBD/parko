import { IsNumber, Min, Max } from 'class-validator';

export class InitiateTopupDto {
  @IsNumber()
  @Min(50)
  @Max(50000)
  amount: number;
}
