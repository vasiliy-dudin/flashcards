PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`definition` text NOT NULL,
	`examples` text NOT NULL,
	`dictionary` text NOT NULL,
	`ai_example` text NOT NULL,
	`audio_url` text,
	`deck_id` text NOT NULL,
	`tags` text NOT NULL,
	`interval` integer NOT NULL,
	`due_date` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_cards` (`id`, `word`, `definition`, `examples`, `dictionary`, `ai_example`, `audio_url`, `deck_id`, `tags`, `interval`, `due_date`, `created_at`)
  SELECT `id`, `word`, `definition`, `examples`, '{"transcription":"","meanings":[]}', '', `audio_url`, `deck_id`, `tags`, `interval`, `due_date`, `created_at`
  FROM `cards`;
--> statement-breakpoint
DROP TABLE `cards`;
--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
