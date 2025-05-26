import { IsEmail, IsString } from 'class-validator';

export class SignUpRequestDto {
	@IsEmail()
	email: string;

	@IsString()
	password: string;
}

export class LoginRequestDto {
	@IsEmail()
	email: string;

	@IsString()
	password: string;
}
