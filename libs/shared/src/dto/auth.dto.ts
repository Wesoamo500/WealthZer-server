import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  @IsOptional()
  acceptTerms?: boolean;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class TwoFactorVerifyDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export enum SocialProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE'
}

export class SocialLoginDto {
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsNotEmpty()
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class VerifyResetOtpDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  code: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  advisorMode?: string;

  @IsOptional()
  @IsString()
  aiInsightsFrequency?: string;

  @IsOptional()
  isBiometricsEnabled?: boolean;

  @IsOptional()
  pushNotificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  preferredCurrency?: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
