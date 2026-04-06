import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { RegisterDto, LoginDto, TwoFactorVerifyDto, SocialLoginDto, SocialProvider, ForgotPasswordDto, VerifyResetOtpDto, ResetPasswordDto } from '@wealthzer/shared';
import * as argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
  }

  async socialLogin(socialDto: SocialLoginDto) {
    let email: string;
    let fullName: string | undefined = socialDto.fullName;

    if (socialDto.provider === SocialProvider.GOOGLE) {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: socialDto.idToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }
      email = payload.email;
      fullName = fullName || payload.name;
    } else {
      // Apple Verification (Simulated as it requires complex JWKS setup usually handled by a library or native Apple SDK)
      // In a real production app, we would use 'apple-auth' or 'jwks-rsa' to verify the idToken
      this.googleClient.verifyIdToken({ idToken: 'test', audience: 'test' }).catch(() => {}); // Dummy to keep import
      
      // For MVP/Demo purposes, we extract the email if possible or assume verification passed for now
      // WARNING: In production, MUST verify the signature against Apple's public keys
      email = 'user@apple.example.com'; 
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create user if not exists (Passwordless for social)
      user = await this.prisma.user.create({
        data: {
          email,
          fullName,
          passwordHash: 'SOCIAL_AUTH_NO_PASSWORD',
          isEmailVerified: true,
        },
      });
    }

    return this.generateTokens(user, socialDto.deviceId);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(registerDto.password);
    const fullName = registerDto.fullName || `${registerDto.firstName} ${registerDto.lastName}`.trim();

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        fullName,
        preferredCurrency: registerDto.currency || 'GHS',
      },
    });

    return {
      userId: user.id,
      email: user.email,
      requires2fa: user.isTwoFactorEnabled,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (user.failedLoginAttempts >= 5 && user.status === 'LOCKED') {
      throw new UnauthorizedException('Account is locked due to multiple failed attempts');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      
      if (user.failedLoginAttempts + 1 >= 5) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'LOCKED' },
        });
      }
      
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0 },
    });

    if (user.isTwoFactorEnabled) {
      // Trigger OTP generation and sending
      await this.resendOtp(user.email);
      
      // Issue temporary 2FA token
      const tempToken = await this.jwtService.signAsync({
        userId: user.id,
        sub: user.id,
        isTemp: true,
      }, { expiresIn: '5m' });

      return {
        requires2fa: true,
        tempToken,
      };
    }

    return this.generateTokens(user, loginDto.deviceId);
  }

  async verifyTwoFactor(verifyDto: TwoFactorVerifyDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: verifyDto.email },
      include: { otpCodes: { where: { isUsed: false, expiresAt: { gt: new Date() } } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const otp = user.otpCodes.find(o => o.type === 'LOGIN');

    if (!otp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (otp.attempts >= 5) {
      throw new UnauthorizedException('Too many failed attempts');
    }

    const isOtpValid = await argon2.verify(otp.codeHash, verifyDto.code);

    if (!isOtpValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    return this.generateTokens(user, verifyDto.deviceId);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Return success even if user not found for security (mitigate email enumeration)
      return { success: true, message: 'If an account exists, a reset code has been sent.' };
    }

    // Generate 6-digit OTP for password reset
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(code);

    // Invalidate old RESET_PASSWORD OTPs
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, type: 'RESET_PASSWORD', isUsed: false },
      data: { isUsed: true },
    });

    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash,
        type: 'RESET_PASSWORD',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Notify user
    this.notificationClient.emit('send-otp', { 
      email: user.email, 
      code, 
      subject: 'Password Reset Code' 
    }).subscribe();

    return { success: true, message: 'Verification code sent to your email.' };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { 
        otpCodes: { 
          where: { 
            type: 'RESET_PASSWORD', 
            isUsed: false, 
            expiresAt: { gt: new Date() } 
          } 
        } 
      },
    });

    if (!user || user.otpCodes.length === 0) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const otp = user.otpCodes[0];
    const isOtpValid = await argon2.verify(otp.codeHash, dto.code);

    if (!isOtpValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid reset code');
    }

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { 
        otpCodes: { 
          where: { 
            type: 'RESET_PASSWORD', 
            isUsed: false, 
            expiresAt: { gt: new Date() } 
          } 
        } 
      },
    });

    if (!user || user.otpCodes.length === 0) {
      throw new UnauthorizedException('Invalid or expired reset session');
    }

    const otp = user.otpCodes[0];
    const isOtpValid = await argon2.verify(otp.codeHash, dto.code);

    if (!isOtpValid) {
       throw new UnauthorizedException('Invalid reset code');
    }

    // Hash new password
    const passwordHash = await argon2.hash(dto.newPassword);

    // Update user and invalidate OTP
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { 
          passwordHash,
          failedLoginAttempts: 0,
          status: 'ACTIVE' // Unlock if it was locked
        },
      }),
      this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { isUsed: true },
      }),
    ]);

    return { success: true, message: 'Password has been reset successfully.' };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return { success: true }; // Silent fail for security

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(code);

    // Invalidate old OTPs
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, type: 'LOGIN', isUsed: false },
      data: { isUsed: true },
    });

    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash,
        type: 'LOGIN',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Updated to 10 minutes as per design
      },
    });

    this.notificationClient.emit('send-otp', { email, code }).subscribe({
      next: () => console.log(`[AuthService] Event 'send-otp' emitted successfully`),
      error: (err) => console.error(`[AuthService] Error emitting event:`, err),
    });
    
    return { success: true };
  }

  private async generateTokens(user: any, deviceId?: string) {
    const payload = { 
      userId: user.id, 
      sub: user.id, 
      role: user.role, 
      version: user.tokenVersion 
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    // Store hashed refresh token
    const refreshTokenHash = await argon2.hash(refreshToken);
    
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceId: deviceId || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        preferredCurrency: user.preferredCurrency,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        advisorMode: true,
        aiInsightsFrequency: true,
        isBiometricsEnabled: true,
        pushNotificationsEnabled: true,
        preferredCurrency: true,
        createdAt: true,
      } as any,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        advisorMode: dto.advisorMode,
        aiInsightsFrequency: dto.aiInsightsFrequency,
        isBiometricsEnabled: dto.isBiometricsEnabled,
        pushNotificationsEnabled: dto.pushNotificationsEnabled,
        preferredCurrency: dto.preferredCurrency,
      } as any,
    });

    return {
      id: user.id,
      email: (user as any).email,
      fullName: (user as any).fullName,
      avatarUrl: (user as any).avatarUrl,
      advisorMode: (user as any).advisorMode,
      aiInsightsFrequency: (user as any).aiInsightsFrequency,
      isBiometricsEnabled: (user as any).isBiometricsEnabled,
      pushNotificationsEnabled: (user as any).pushNotificationsEnabled,
      preferredCurrency: (user as any).preferredCurrency,
    };
  }
}
