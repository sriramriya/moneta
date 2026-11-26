CREATE TABLE `receipt_purges` (
	`object_key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`requested_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `receipt_purges_owner_idx` ON `receipt_purges` (`owner`);