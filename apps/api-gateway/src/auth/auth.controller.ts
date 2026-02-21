import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RegisterDto, LoginDto, TwoFactorVerifyDto, SocialLoginDto, Public, ForgotPasswordDto, VerifyResetOtpDto, ResetPasswordDto } from '@wealthzer/shared';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'register' }, registerDto));
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'login' }, loginDto));
  }

  @Public()
  @Post('verify-2fa')
  async verify2fa(@Body() verifyDto: TwoFactorVerifyDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'verify-2fa' }, verifyDto));
  }

  @Public()
  @Post('resend-otp')
  async resendOtp(@Body() data: { email: string }) {
    return firstValueFrom(this.authClient.send({ cmd: 'resend-otp' }, data));
  }

  @Public()
  @Post('social-login')
  async socialLogin(@Body() socialDto: SocialLoginDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'social-login' }, socialDto));
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'forgot-password' }, dto));
  }

  @Public()
  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'verify-reset-otp' }, dto));
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'reset-password' }, dto));
  }
}
