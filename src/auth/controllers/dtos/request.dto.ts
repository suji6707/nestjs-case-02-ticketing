import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SignUpRequestDto {
	@ApiProperty({ example: 'user@example.com', description: '이메일' })
	@IsEmail()
	email: string;

	@ApiProperty({ example: 'password', description: '비밀번호' })
	@IsString()
	password: string;
}

export class LoginRequestDto {
	@ApiProperty({ example: 'user@example.com', description: '이메일' })
	@IsEmail()
	email: string;

	@ApiProperty({ example: 'password', description: '비밀번호' })
	@IsString()
	password: string;
}
