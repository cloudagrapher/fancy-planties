DROP INDEX "plant_instances_user_active_created_idx";--> statement-breakpoint
DROP INDEX "plant_instances_user_fertilizer_due_idx";--> statement-breakpoint
DROP INDEX "plant_instances_user_location_idx";--> statement-breakpoint
ALTER TABLE "care_guides" ADD COLUMN "s3_image_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "care_history" ADD COLUMN "s3_image_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "plant_instances" ADD COLUMN "s3_image_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "propagations" ADD COLUMN "s3_image_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;