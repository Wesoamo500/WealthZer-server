import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, SocialLoginDto, TwoFactorVerifyDto, ForgotPasswordDto, VerifyResetOtpDto, ResetPasswordDto } from '@wealthzer/shared';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'register' })
  async register(@Payload() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @MessagePattern({ cmd: 'login' })
  async login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern({ cmd: 'social-login' })
  async socialLogin(@Payload() socialDto: SocialLoginDto) {
    return this.authService.socialLogin(socialDto); 
  }

  @MessagePattern({ cmd: 'verify-2fa' })
  async verify2fa(@Payload() verifyDto: TwoFactorVerifyDto) {
    return this.authService.verifyTwoFactor(verifyDto);
  }

  @MessagePattern({ cmd: 'resend-otp' })
  async resendOtp(@Payload() data: { email: string }) {
    return this.authService.resendOtp(data.email);
  }

  @MessagePattern({ cmd: 'forgot-password' })
  async forgotPassword(@Payload() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @MessagePattern({ cmd: 'verify-reset-otp' })
  async verifyResetOtp(@Payload() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  @MessagePattern({ cmd: 'reset-password' })
  async resetPassword(@Payload() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @MessagePattern({ cmd: 'get-profile' })
  async getProfile(@Payload() data: { userId: string }) {
    return this.authService.getProfile(data.userId);
  }

  @MessagePattern({ cmd: 'update-profile' })
  async updateProfile(@Payload() data: { userId: string; dto: any }) {
    return this.authService.updateProfile(data.userId, data.dto);
  }
}
