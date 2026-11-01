CREATE TABLE `posts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`excerpt` varchar(500) NOT NULL DEFAULT '',
	`body` text,
	`image_id` bigint unsigned,
	`category` varchar(60) NOT NULL DEFAULT '',
	`author_name` varchar(120) NOT NULL DEFAULT '',
	`published_at` datetime,
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `description` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `has_detail_page` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts` (`status`,`published_at`);