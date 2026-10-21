CREATE TABLE "renewal_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"state" text NOT NULL,
	"receipt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewal_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"learner_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"address" text NOT NULL,
	"subscription" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"state" text DEFAULT 'enabled' NOT NULL,
	"revocation_hash" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "renewal_devices_address_unique" UNIQUE("address")
);
--> statement-breakpoint
ALTER TABLE "renewal_deliveries" ADD CONSTRAINT "renewal_deliveries_device_id_renewal_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."renewal_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_deliveries" ADD CONSTRAINT "renewal_deliveries_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_devices" ADD CONSTRAINT "renewal_devices_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;