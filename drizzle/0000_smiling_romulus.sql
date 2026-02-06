CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"performed_by" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "care_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"taxonomy_level" text NOT NULL,
	"family" text,
	"genus" text,
	"species" text,
	"cultivar" text,
	"common_name" text,
	"title" text NOT NULL,
	"description" text,
	"watering" jsonb,
	"fertilizing" jsonb,
	"lighting" jsonb,
	"humidity" jsonb,
	"temperature" jsonb,
	"soil" jsonb,
	"repotting" jsonb,
	"pruning" jsonb,
	"propagation" jsonb,
	"common_issues" jsonb,
	"general_tips" text,
	"additional_notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plant_instance_id" integer NOT NULL,
	"care_type" text NOT NULL,
	"care_date" timestamp NOT NULL,
	"notes" text,
	"fertilizer_type" text,
	"pot_size" text,
	"soil_type" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"attempts_used" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plant_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plant_id" integer NOT NULL,
	"nickname" text NOT NULL,
	"location" text NOT NULL,
	"last_fertilized" timestamp,
	"fertilizer_schedule" text NOT NULL,
	"fertilizer_due" timestamp,
	"last_repot" timestamp,
	"notes" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"family" text NOT NULL,
	"genus" text NOT NULL,
	"species" text NOT NULL,
	"cultivar" text,
	"common_name" text NOT NULL,
	"care_instructions" text,
	"default_image" text,
	"created_by" integer,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propagations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plant_id" integer NOT NULL,
	"parent_instance_id" integer,
	"nickname" text NOT NULL,
	"location" text NOT NULL,
	"date_started" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"source_type" text DEFAULT 'internal' NOT NULL,
	"external_source" text,
	"external_source_details" text,
	"notes" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"hashed_password" text NOT NULL,
	"name" text NOT NULL,
	"is_curator" boolean DEFAULT false NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_guides" ADD CONSTRAINT "care_guides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_history" ADD CONSTRAINT "care_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_history" ADD CONSTRAINT "care_history_plant_instance_id_plant_instances_id_fk" FOREIGN KEY ("plant_instance_id") REFERENCES "public"."plant_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_instances" ADD CONSTRAINT "plant_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_instances" ADD CONSTRAINT "plant_instances_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propagations" ADD CONSTRAINT "propagations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propagations" ADD CONSTRAINT "propagations_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propagations" ADD CONSTRAINT "propagations_parent_instance_id_plant_instances_id_fk" FOREIGN KEY ("parent_instance_id") REFERENCES "public"."plant_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_success_idx" ON "audit_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_id_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_performed_by_timestamp_idx" ON "audit_logs" USING btree ("performed_by","timestamp");--> statement-breakpoint
CREATE INDEX "care_guides_user_id_idx" ON "care_guides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "care_guides_taxonomy_level_idx" ON "care_guides" USING btree ("taxonomy_level");--> statement-breakpoint
CREATE INDEX "care_guides_family_idx" ON "care_guides" USING btree ("family");--> statement-breakpoint
CREATE INDEX "care_guides_genus_idx" ON "care_guides" USING btree ("genus");--> statement-breakpoint
CREATE INDEX "care_guides_species_idx" ON "care_guides" USING btree ("species");--> statement-breakpoint
CREATE INDEX "care_guides_cultivar_idx" ON "care_guides" USING btree ("cultivar");--> statement-breakpoint
CREATE INDEX "care_guides_common_name_idx" ON "care_guides" USING btree ("common_name");--> statement-breakpoint
CREATE INDEX "care_guides_is_public_idx" ON "care_guides" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "care_guides_is_verified_idx" ON "care_guides" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "care_guides_family_genus_idx" ON "care_guides" USING btree ("family","genus");--> statement-breakpoint
CREATE INDEX "care_guides_genus_species_idx" ON "care_guides" USING btree ("genus","species");--> statement-breakpoint
CREATE INDEX "care_guides_species_cultivar_idx" ON "care_guides" USING btree ("species","cultivar");--> statement-breakpoint
CREATE UNIQUE INDEX "care_guides_user_taxonomy_unique" ON "care_guides" USING btree ("user_id","taxonomy_level","family","genus","species","cultivar");--> statement-breakpoint
CREATE INDEX "care_history_user_id_idx" ON "care_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "care_history_plant_instance_id_idx" ON "care_history" USING btree ("plant_instance_id");--> statement-breakpoint
CREATE INDEX "care_history_care_type_idx" ON "care_history" USING btree ("care_type");--> statement-breakpoint
CREATE INDEX "care_history_care_date_idx" ON "care_history" USING btree ("care_date");--> statement-breakpoint
CREATE INDEX "care_history_user_plant_idx" ON "care_history" USING btree ("user_id","plant_instance_id");--> statement-breakpoint
CREATE INDEX "care_history_user_care_type_idx" ON "care_history" USING btree ("user_id","care_type");--> statement-breakpoint
CREATE INDEX "email_verification_codes_user_id_idx" ON "email_verification_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_codes_user_active_unique" ON "email_verification_codes" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_user_active_unique" ON "password_reset_tokens" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "plant_instances_user_id_idx" ON "plant_instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plant_instances_plant_id_idx" ON "plant_instances" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "plant_instances_fertilizer_due_idx" ON "plant_instances" USING btree ("fertilizer_due");--> statement-breakpoint
CREATE INDEX "plant_instances_is_active_idx" ON "plant_instances" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "plant_instances_user_active_idx" ON "plant_instances" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "plant_instances_location_idx" ON "plant_instances" USING btree ("location");--> statement-breakpoint
CREATE INDEX "plant_instances_user_active_created_idx" ON "plant_instances" USING btree ("user_id","is_active","created_at");--> statement-breakpoint
CREATE INDEX "plant_instances_user_fertilizer_due_idx" ON "plant_instances" USING btree ("user_id","fertilizer_due");--> statement-breakpoint
CREATE INDEX "plant_instances_user_location_idx" ON "plant_instances" USING btree ("user_id","location");--> statement-breakpoint
CREATE INDEX "plants_family_idx" ON "plants" USING btree ("family");--> statement-breakpoint
CREATE INDEX "plants_genus_idx" ON "plants" USING btree ("genus");--> statement-breakpoint
CREATE INDEX "plants_species_idx" ON "plants" USING btree ("species");--> statement-breakpoint
CREATE INDEX "plants_cultivar_idx" ON "plants" USING btree ("cultivar");--> statement-breakpoint
CREATE INDEX "plants_common_name_idx" ON "plants" USING btree ("common_name");--> statement-breakpoint
CREATE UNIQUE INDEX "plants_taxonomy_unique" ON "plants" USING btree ("family","genus","species","cultivar");--> statement-breakpoint
CREATE INDEX "plants_verified_idx" ON "plants" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "propagations_user_id_idx" ON "propagations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "propagations_plant_id_idx" ON "propagations" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "propagations_parent_instance_id_idx" ON "propagations" USING btree ("parent_instance_id");--> statement-breakpoint
CREATE INDEX "propagations_status_idx" ON "propagations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "propagations_source_type_idx" ON "propagations" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "propagations_external_source_idx" ON "propagations" USING btree ("external_source");--> statement-breakpoint
CREATE INDEX "propagations_date_started_idx" ON "propagations" USING btree ("date_started");--> statement-breakpoint
CREATE INDEX "propagations_user_status_idx" ON "propagations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "propagations_user_source_type_idx" ON "propagations" USING btree ("user_id","source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_identifier_window_unique" ON "rate_limits" USING btree ("identifier","window_start");--> statement-breakpoint
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_email_verified_idx" ON "users" USING btree ("is_email_verified");