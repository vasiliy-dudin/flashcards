CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`definition` text NOT NULL,
	`examples` text NOT NULL,
	`usage_notes` text NOT NULL,
	`audio_url` text,
	`deck_id` text NOT NULL,
	`tags` text NOT NULL,
	`interval` integer NOT NULL,
	`due_date` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL,
	`card_count` integer NOT NULL
);
