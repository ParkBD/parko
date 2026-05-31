import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @CurrentUser('sub') userId: string,
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refreshTokens(userId, dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
