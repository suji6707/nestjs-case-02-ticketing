import { Connection } from 'mysql2';

export const createUserQuery = async (client: Connection): Promise<any> => {
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
};

/**
 * 
INSERT INTO `concerts` (`id`, `title`, `description`)
VALUES
	(1, 'Dualipa', 'dualipa!!');

INSERT INTO `concert_schedules` (`id`, `concert_id`, `base_price`, `start_at`, `end_at`, `total_seats`, `is_sold_out`)
VALUES
	(1, 1, 10000, '2025-06-25 13:00:00.000', '2025-06-25 16:00:00.000', 50, 0);

INSERT INTO `seats` (`id`, `schedule_id`, `number`, `class_name`, `price`, `status`)
VALUES
	(1, 1, 1, 'A', 10000, 0);

 */
