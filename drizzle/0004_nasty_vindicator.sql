CREATE TABLE "savings_goal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"note" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goal_logs_amount_positive_check" CHECK ("savings_goal_logs"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"target_amount" numeric(15, 2) NOT NULL,
	"current_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"target_date" date,
	"color" varchar(30) DEFAULT '#10b981' NOT NULL,
	"icon" varchar(50) DEFAULT 'PiggyBank' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goals_target_positive_check" CHECK ("savings_goals"."target_amount" > 0),
	CONSTRAINT "savings_goals_current_non_negative_check" CHECK ("savings_goals"."current_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "savings_goal_logs" ADD CONSTRAINT "savings_goal_logs_goal_id_savings_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goal_logs" ADD CONSTRAINT "savings_goal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "savings_goal_logs_goal_created_idx" ON "savings_goal_logs" USING btree ("goal_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "savings_goal_logs_user_id_idx" ON "savings_goal_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_goals_user_completed_idx" ON "savings_goals" USING btree ("user_id","is_completed");