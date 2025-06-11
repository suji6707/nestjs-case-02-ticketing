import { Connection } from 'mysql2';

export const createUserQuery = async (client: Connection) => {
	const query = `
	INSERT INTO users 
	(id, email, encrypted_password)
	VALUES
	(1, 'test_1749568066400@example.com', '$2b$10$O87yUcTNINcUSpysaqNcKuEgP/8sBODYV5Ao7o8dYAZPHHAhaiXwW');`;

	return new Promise((resolve, reject) => {
		client.query(query, (err, result) => {
			if (err) {
				console.error(err);
				reject(err);
				return;
			}
			// console.log(result);
			resolve(result);
		});
	});
}
