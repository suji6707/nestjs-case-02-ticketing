import { ApiProperty } from "@nestjs/swagger";

export class SignUpResponseDto {
	@ApiProperty({ example: 'eyJhbGciOiJIUI6I...HDk', description: 'JWT 토큰' })
	token: string;
}

export class LoginResponseDto {
	@ApiProperty({ example: 'eyJhbGciOiJIUI6I...HDk', description: 'JWT 토큰' })
	token: string;
}
