CREATE TABLE `admin_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`revoked_at` datetime,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role_key` varchar(32) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`failed_logins` int NOT NULL DEFAULT 0,
	`locked_until` datetime,
	`last_login_at` datetime,
	`password_changed_at` datetime,
	`must_change_password` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `analytics_configuration` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`provider` varchar(24) NOT NULL,
	`public_id` varchar(120) NOT NULL DEFAULT '',
	`conversion_label` varchar(120) NOT NULL DEFAULT '',
	`is_enabled` boolean NOT NULL DEFAULT false,
	`requires_consent` boolean NOT NULL DEFAULT true,
	`updated_by` bigint unsigned,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_configuration_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_provider_uq` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(48),
	`entity_id` varchar(64),
	`summary` varchar(500) NOT NULL DEFAULT '',
	`ip_hash` char(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_revisions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(48) NOT NULL,
	`entity_id` bigint unsigned NOT NULL,
	`version` int NOT NULL,
	`snapshot` json NOT NULL,
	`change_summary` varchar(300) NOT NULL DEFAULT '',
	`editor_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `destinations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`summary` varchar(500) NOT NULL DEFAULT '',
	`image_id` bigint unsigned,
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `destinations_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `enquiries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`type` varchar(24) NOT NULL DEFAULT 'general',
	`name` varchar(120) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL,
	`email` varchar(191) NOT NULL DEFAULT '',
	`travel_date` varchar(32) NOT NULL DEFAULT '',
	`pickup` varchar(191) NOT NULL DEFAULT '',
	`dropoff` varchar(191) NOT NULL DEFAULT '',
	`travellers` int,
	`subject` varchar(191) NOT NULL DEFAULT '',
	`message` text NOT NULL,
	`landing_page` varchar(500) NOT NULL DEFAULT '',
	`referrer` varchar(500) NOT NULL DEFAULT '',
	`utm_source` varchar(120) NOT NULL DEFAULT '',
	`utm_medium` varchar(120) NOT NULL DEFAULT '',
	`utm_campaign` varchar(120) NOT NULL DEFAULT '',
	`utm_term` varchar(120) NOT NULL DEFAULT '',
	`utm_content` varchar(120) NOT NULL DEFAULT '',
	`consent_at` datetime,
	`status` varchar(16) NOT NULL DEFAULT 'new',
	`is_read` boolean NOT NULL DEFAULT false,
	`assigned_to` bigint unsigned,
	`duplicate_of` bigint unsigned,
	`ip_hash` char(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enquiry_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`enquiry_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`event` varchar(32) NOT NULL,
	`from_value` varchar(120) NOT NULL DEFAULT '',
	`to_value` varchar(120) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enquiry_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enquiry_notes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`enquiry_id` bigint unsigned NOT NULL,
	`author_id` bigint unsigned,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enquiry_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`question` varchar(300) NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(60) NOT NULL DEFAULT 'general',
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hotel_images` (
	`hotel_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `hotel_images_hotel_id_media_id_pk` PRIMARY KEY(`hotel_id`,`media_id`)
);
--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`location` varchar(160) NOT NULL DEFAULT '',
	`category` varchar(60) NOT NULL DEFAULT '',
	`description` text NOT NULL,
	`price_prefix` varchar(40) NOT NULL DEFAULT '',
	`price_amount` decimal(10,2),
	`price_unit` varchar(40) NOT NULL DEFAULT '',
	`amenities` json NOT NULL,
	`whatsapp_message` varchar(300) NOT NULL DEFAULT '',
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hotels_id` PRIMARY KEY(`id`),
	CONSTRAINT `hotels_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`ip_hash` char(64) NOT NULL,
	`success` boolean NOT NULL,
	`reason` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`filename` varchar(191) NOT NULL,
	`storage_key` varchar(191) NOT NULL,
	`mime` varchar(64) NOT NULL,
	`bytes` int NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`alt_text` varchar(300) NOT NULL DEFAULT '',
	`caption` varchar(300) NOT NULL DEFAULT '',
	`credit` varchar(300) NOT NULL DEFAULT '',
	`licence_status` varchar(16) NOT NULL DEFAULT 'pending',
	`source_url` varchar(1000),
	`sha256` char(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_storage_key_uq` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `media_usages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`entity_type` varchar(48) NOT NULL,
	`entity_id` bigint unsigned NOT NULL,
	`field` varchar(64) NOT NULL,
	CONSTRAINT `media_usages_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_usage_uq` UNIQUE(`entity_type`,`entity_id`,`field`,`media_id`)
);
--> statement-breakpoint
CREATE TABLE `migration_map` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`source_url` varchar(500) NOT NULL,
	`source_ref` varchar(300) NOT NULL DEFAULT '',
	`entity_type` varchar(48) NOT NULL,
	`entity_id` bigint unsigned,
	`status` varchar(24) NOT NULL DEFAULT 'migrated',
	`discrepancy` text,
	`approval_required` boolean NOT NULL DEFAULT false,
	`verified_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `migration_map_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `navigation_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`menu` varchar(16) NOT NULL,
	`parent_id` bigint unsigned,
	`label` varchar(80) NOT NULL,
	`href` varchar(500) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`is_visible` boolean NOT NULL DEFAULT true,
	`open_in_new_tab` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `navigation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_images` (
	`package_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_images_package_id_media_id_pk` PRIMARY KEY(`package_id`,`media_id`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`summary` varchar(500) NOT NULL DEFAULT '',
	`description` text NOT NULL,
	`destination` varchar(160) NOT NULL DEFAULT '',
	`duration_label` varchar(60) NOT NULL DEFAULT '',
	`stops_label` varchar(60) NOT NULL DEFAULT '',
	`price_prefix` varchar(40) NOT NULL DEFAULT '',
	`price_amount` decimal(10,2),
	`price_suffix` varchar(40) NOT NULL DEFAULT '',
	`price_text` varchar(80) NOT NULL DEFAULT '',
	`badge` varchar(40) NOT NULL DEFAULT '',
	`highlights` json NOT NULL,
	`itinerary` json NOT NULL,
	`inclusions` json NOT NULL,
	`exclusions` json NOT NULL,
	`cta_label` varchar(60) NOT NULL DEFAULT 'Book',
	`whatsapp_message` varchar(300) NOT NULL DEFAULT '',
	`has_detail_page` boolean NOT NULL DEFAULT false,
	`is_featured` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`notes` text,
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `packages_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `page_sections` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`page_id` bigint unsigned NOT NULL,
	`type` varchar(32) NOT NULL,
	`position` int NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`data` json NOT NULL,
	CONSTRAINT `page_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`path` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`template` varchar(32) NOT NULL DEFAULT 'generic',
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`is_system` boolean NOT NULL DEFAULT false,
	`published_at` datetime,
	`scheduled_at` datetime,
	`published_data` json,
	`has_unpublished_changes` boolean NOT NULL DEFAULT false,
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_path_uq` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`key` varchar(64) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `permissions_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`bucket` varchar(32) NOT NULL,
	`key` char(64) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`window_start` datetime NOT NULL,
	CONSTRAINT `rate_limits_bucket_key_pk` PRIMARY KEY(`bucket`,`key`)
);
--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`source_path` varchar(191) NOT NULL,
	`destination` varchar(500) NOT NULL DEFAULT '',
	`status_code` int NOT NULL DEFAULT 301,
	`is_active` boolean NOT NULL DEFAULT true,
	`hits` int NOT NULL DEFAULT 0,
	`last_hit_at` datetime,
	`note` varchar(300) NOT NULL DEFAULT '',
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `redirects_id` PRIMARY KEY(`id`),
	CONSTRAINT `redirects_source_uq` UNIQUE(`source_path`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_key` varchar(32) NOT NULL,
	`permission_key` varchar(64) NOT NULL,
	CONSTRAINT `role_permissions_role_key_permission_key_pk` PRIMARY KEY(`role_key`,`permission_key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`key` varchar(32) NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `roles_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `seo_metadata` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(48) NOT NULL,
	`entity_id` bigint unsigned NOT NULL,
	`meta_title` varchar(191) NOT NULL DEFAULT '',
	`meta_description` varchar(320) NOT NULL DEFAULT '',
	`canonical_url` varchar(500) NOT NULL DEFAULT '',
	`robots_index` boolean NOT NULL DEFAULT true,
	`robots_follow` boolean NOT NULL DEFAULT true,
	`og_title` varchar(191) NOT NULL DEFAULT '',
	`og_description` varchar(320) NOT NULL DEFAULT '',
	`og_image_id` bigint unsigned,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_metadata_id` PRIMARY KEY(`id`),
	CONSTRAINT `seo_entity_uq` UNIQUE(`entity_type`,`entity_id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`category` varchar(60) NOT NULL DEFAULT '',
	`summary` varchar(500) NOT NULL DEFAULT '',
	`features` json NOT NULL,
	`icon` varchar(40) NOT NULL DEFAULT 'sparkles',
	`image_id` bigint unsigned,
	`cta_label` varchar(60) NOT NULL DEFAULT 'Book Now',
	`whatsapp_message` varchar(300) NOT NULL DEFAULT '',
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`is_public` boolean NOT NULL DEFAULT true,
	`updated_by` bigint unsigned,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`author_name` varchar(120) NOT NULL,
	`author_location` varchar(120) NOT NULL DEFAULT '',
	`quote` text NOT NULL,
	`rating` int,
	`review_date` datetime,
	`source` varchar(60) NOT NULL DEFAULT '',
	`is_verified` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_fares` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`vehicle_id` bigint unsigned NOT NULL,
	`fare_type` varchar(24) NOT NULL,
	`label` varchar(60) NOT NULL DEFAULT '',
	`amount` decimal(10,2) NOT NULL,
	`unit_label` varchar(40) NOT NULL DEFAULT '',
	`notes` varchar(255) NOT NULL DEFAULT '',
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `vehicle_fares_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicle_fare_uq` UNIQUE(`vehicle_id`,`fare_type`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_images` (
	`vehicle_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `vehicle_images_vehicle_id_media_id_pk` PRIMARY KEY(`vehicle_id`,`media_id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`full_name` varchar(120) NOT NULL DEFAULT '',
	`vehicle_class` varchar(60) NOT NULL DEFAULT '',
	`seats_label` varchar(40) NOT NULL DEFAULT '',
	`seats` int,
	`airport_label` varchar(80) NOT NULL DEFAULT '',
	`luggage` varchar(80) NOT NULL DEFAULT '',
	`badge` varchar(40) NOT NULL DEFAULT '',
	`features` json NOT NULL,
	`airport_features` json NOT NULL,
	`whatsapp_message` varchar(300) NOT NULL DEFAULT '',
	`position` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`source_url` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_users` ADD CONSTRAINT `admin_users_role_key_roles_key_fk` FOREIGN KEY (`role_key`) REFERENCES `roles`(`key`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_configuration` ADD CONSTRAINT `analytics_configuration_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_revisions` ADD CONSTRAINT `content_revisions_editor_id_admin_users_id_fk` FOREIGN KEY (`editor_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destinations` ADD CONSTRAINT `destinations_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destinations` ADD CONSTRAINT `destinations_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destinations` ADD CONSTRAINT `destinations_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_assigned_to_admin_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_duplicate_of_enquiries_id_fk` FOREIGN KEY (`duplicate_of`) REFERENCES `enquiries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiry_events` ADD CONSTRAINT `enquiry_events_enquiry_id_enquiries_id_fk` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiry_events` ADD CONSTRAINT `enquiry_events_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiry_notes` ADD CONSTRAINT `enquiry_notes_enquiry_id_enquiries_id_fk` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiry_notes` ADD CONSTRAINT `enquiry_notes_author_id_admin_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hotel_images` ADD CONSTRAINT `hotel_images_hotel_id_hotels_id_fk` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hotel_images` ADD CONSTRAINT `hotel_images_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hotels` ADD CONSTRAINT `hotels_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hotels` ADD CONSTRAINT `hotels_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_usages` ADD CONSTRAINT `media_usages_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_parent_id_navigation_items_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `navigation_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_images` ADD CONSTRAINT `package_images_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_images` ADD CONSTRAINT `package_images_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pages` ADD CONSTRAINT `pages_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pages` ADD CONSTRAINT `pages_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redirects` ADD CONSTRAINT `redirects_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redirects` ADD CONSTRAINT `redirects_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_key_roles_key_fk` FOREIGN KEY (`role_key`) REFERENCES `roles`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_key_permissions_key_fk` FOREIGN KEY (`permission_key`) REFERENCES `permissions`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seo_metadata` ADD CONSTRAINT `seo_metadata_og_image_id_media_id_fk` FOREIGN KEY (`og_image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_fares` ADD CONSTRAINT `vehicle_fares_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_images` ADD CONSTRAINT `vehicle_images_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_images` ADD CONSTRAINT `vehicle_images_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_sessions_user_idx` ON `admin_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `revisions_entity_idx` ON `content_revisions` (`entity_type`,`entity_id`,`version`);--> statement-breakpoint
CREATE INDEX `enquiries_status_idx` ON `enquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `enquiries_phone_idx` ON `enquiries` (`phone`);--> statement-breakpoint
CREATE INDEX `faqs_category_idx` ON `faqs` (`category`,`position`);--> statement-breakpoint
CREATE INDEX `login_attempts_ip_idx` ON `login_attempts` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_attempts_email_idx` ON `login_attempts` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_sha_idx` ON `media` (`sha256`);--> statement-breakpoint
CREATE INDEX `media_usage_media_idx` ON `media_usages` (`media_id`);--> statement-breakpoint
CREATE INDEX `migration_entity_idx` ON `migration_map` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `nav_menu_idx` ON `navigation_items` (`menu`,`parent_id`,`position`);--> statement-breakpoint
CREATE INDEX `packages_status_idx` ON `packages` (`status`,`position`);--> statement-breakpoint
CREATE INDEX `page_sections_page_idx` ON `page_sections` (`page_id`,`position`);--> statement-breakpoint
CREATE INDEX `pages_status_idx` ON `pages` (`status`);