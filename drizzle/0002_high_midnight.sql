CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`transaction_id` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
