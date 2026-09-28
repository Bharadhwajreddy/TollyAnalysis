CREATE TABLE "user_rankings" (
	"device_id" text PRIMARY KEY NOT NULL,
	"first_slug" text NOT NULL,
	"second_slug" text NOT NULL,
	"third_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_rankings_first_idx" ON "user_rankings" USING btree ("first_slug");