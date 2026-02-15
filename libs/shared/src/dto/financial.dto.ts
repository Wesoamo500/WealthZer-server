import { IsEnum, IsNumber, IsOptional, IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { TransactionCategory, AccountType, AssetType } from '../enums';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @IsEnum(AccountType)
  account: AccountType;

  @IsString()
  @IsOptional()
  note?: string;

  @IsOptional()
  isAiSuggested?: boolean;
}

export class CreateAssetDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  symbol: string;

  @IsNumber()
  amount: number;

  @IsEnum(AssetType)
  type: AssetType;

  @IsNumber()
  purchasePrice: number;
}

export class UpdateAssetValueDto {
  @IsUUID()
  assetId: string;

  @IsNumber()
  currentValue: number;
}
