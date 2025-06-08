

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_creator_as_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.space_members (space_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_creator_as_owner"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "media_url" "text",
    "is_ai" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."space_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "space_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."space_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "system_prompt" "text" DEFAULT 'You are a helpful assistant participating in a chat between several users. Respond conversationally, only when addressed by name.'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."spaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_space_id_user_id_key" UNIQUE ("space_id", "user_id");



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "add_creator_as_owner_trigger" AFTER INSERT ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."add_creator_as_owner"();



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can view messages" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "Anyone can view spaces" ON "public"."spaces" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create spaces" ON "public"."spaces" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert messages" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Space owners can add members" ON "public"."space_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."space_members" "space_members_1"
  WHERE (("space_members_1"."space_id" = "space_members_1"."space_id") AND ("space_members_1"."user_id" = "auth"."uid"()) AND ("space_members_1"."role" = 'owner'::"text")))));



CREATE POLICY "Users can create messages in their spaces" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "space_members"."space_id") AND ("space_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create spaces" ON "public"."spaces" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own spaces" ON "public"."spaces" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "spaces"."id") AND ("space_members"."user_id" = "auth"."uid"()) AND ("space_members"."role" = 'owner'::"text")))));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view members of their spaces" ON "public"."space_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."space_members" "sm"
  WHERE (("sm"."space_id" = "space_members"."space_id") AND ("sm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in their spaces" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "messages"."space_id") AND ("space_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view spaces they are members of" ON "public"."spaces" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "spaces"."id") AND ("space_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."space_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_creator_as_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_creator_as_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_creator_as_owner"() TO "service_role";


















GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."space_members" TO "anon";
GRANT ALL ON TABLE "public"."space_members" TO "authenticated";
GRANT ALL ON TABLE "public"."space_members" TO "service_role";



GRANT ALL ON TABLE "public"."spaces" TO "anon";
GRANT ALL ON TABLE "public"."spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."spaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
