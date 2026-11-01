CREATE TABLE "gold_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_price" integer NOT NULL,
	"spread" integer NOT NULL,
	"source" varchar(50) DEFAULT 'SJC' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "gold_price_history_recorded_at_idx" ON "gold_price_history" USING btree ("recorded_at" DESC NULLS LAST);