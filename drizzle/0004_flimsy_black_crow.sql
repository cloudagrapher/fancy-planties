ALTER TABLE "care_guides" DROP CONSTRAINT "care_guides_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "care_history" DROP CONSTRAINT "care_history_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "care_history" DROP CONSTRAINT "care_history_plant_instance_id_plant_instances_id_fk";
--> statement-breakpoint
ALTER TABLE "plant_instances" DROP CONSTRAINT "plant_instances_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "plant_instances" DROP CONSTRAINT "plant_instances_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "plants" DROP CONSTRAINT "plants_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "propagations" DROP CONSTRAINT "propagations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "propagations" DROP CONSTRAINT "propagations_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "propagations" DROP CONSTRAINT "propagations_parent_instance_id_plant_instances_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "care_guides" ADD CONSTRAINT "care_guides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_history" ADD CONSTRAINT "care_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_history" ADD CONSTRAINT "care_history_plant_instance_id_plant_instances_id_fk" FOREIGN KEY ("plant_instance_id") REFERENCES "public"."plant_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_instances" ADD CONSTRAINT "plant_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_instances" ADD CONSTRAINT "plant_instances_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propagations" ADD CONSTRAINT "propagations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propagations" ADD CONSTRAINT "propagations_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propagations" ADD CONSTRAINT "propagations_parent_instance_id_plant_instances_id_fk" FOREIGN KEY ("parent_instance_id") REFERENCES "public"."plant_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;