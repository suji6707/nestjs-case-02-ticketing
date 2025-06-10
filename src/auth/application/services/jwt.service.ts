import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
	signJwtAsync(payload: any, expiresIn: any): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			jwt.sign(
				payload,
				process.env.JWT_SECRET_KEY,
				{ expiresIn },
				(err, token) => {
					if (err) {
						reject(err);
					}
					resolve(token);
				},
			);
		});
	}

	verifyJwtAsync(token: string): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
				if (err) {
					reject(err);
				}
				resolve(decoded);
			});
		});
	}
}
