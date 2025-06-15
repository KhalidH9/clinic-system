

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



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_doctor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.doctors (user_id, name, email, specialization, license_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'اسم غير محدد'),
    NEW.email,
    'عام',
    'يرجى تحديث رقم الترخيص'
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_doctor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if new.raw_user_meta_data ->> 'role' = 'doctor' then
    insert into doctors (user_id, name, email, specialization, license_number)
    values ( new.id,
             coalesce(new.raw_user_meta_data->>'full_name','Doctor'),
             new.email,
             coalesce(new.raw_user_meta_data->>'specialization','General'),
             coalesce(new.raw_user_meta_data->>'license_number','TBD') );

  elsif new.raw_user_meta_data ->> 'role' = 'admin' then
    insert into admins (user_id, name, email)
    values ( new.id,
             coalesce(new.raw_user_meta_data->>'full_name','Admin'),
             new.email );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_twilio_sms"("_appt_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  -- secrets read from Supabase Secrets Manager
  acc     text := current_setting('TWILIO_ACCOUNT_SID', true);
  tok     text := current_setting('TWILIO_AUTH_TOKEN',  true);
  fromNum text := current_setting('TWILIO_FROM',        true);

  appt         record;
  sms_body     text;
  http_resp    jsonb;
begin
  /* 1️⃣ sanity ---------------------------------------------------------- */
  if acc is null or tok is null or fromNum is null then
    raise exception 'Twilio secrets are missing';
  end if;

  select a.*, d.name as doctor_name
    into appt
    from appointments a
    join doctors      d on d.id = a.doctor_id
   where a.id = _appt_id;

  if not found then
    raise exception 'Appointment % not found', _appt_id;
  end if;

  /* 2️⃣ craft message --------------------------------------------------- */
  sms_body :=
    format(
      'Hello %s,%sDr. %s has scheduled your appointment at %s on %s in %s. See you soon!',
      appt.patient_name,
      chr(10),
      appt.doctor_name,
      to_char(appt.time, 'HH12:MI AM'),
      to_char(appt.date, 'YYYY-MM-DD'),
      coalesce(appt.organization_name, 'our clinic')
    );

  /* 3️⃣ call Twilio ----------------------------------------------------- */
  http_resp := (
    select status, body
      from http_post(
        url     => format(
                    'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json',
                    acc),
        headers => jsonb_build_object(
                    'Content-Type', 'application/x-www-form-urlencoded'),
        body    => url_encode(
                    jsonb_build_object(
                      'From', fromNum,
                      'To',   appt.patient_id   ::uuid
                              -> (select phone_number from patients where id = appt.patient_id),
                      'Body', sms_body
                    )::text),
        username => acc,
        password => tok,
        timeout  => interval '15 seconds'
      )
  );

  if http_resp->>'status' != '200' then
    raise exception 'Twilio error: %', http_resp->>'body';
  end if;

  /* 4️⃣ log ------------------------------------------------------------- */
  insert into message_log(appointment_id, message_sid, to_number, body)
  values (_appt_id,
          (http_resp->>'body')::jsonb->>'sid',
          (http_resp->>'body')::jsonb->>'to',
          sms_body);

exception
  when others then
    -- record failure
    insert into message_log(appointment_id, status, detail)
    values (_appt_id, 'failed', sqlerrm);
    raise;
end;
$$;


ALTER FUNCTION "public"."send_twilio_sms"("_appt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare current_updater text;
begin
  new.updated_at := now();

  select coalesce(
    (select name from doctors where user_id = auth.uid() limit 1),
    (select name from admins  where user_id = auth.uid() limit 1),
    'system'
  ) into current_updater;

  new.updated_by := current_updater;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_appointment_org_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.appointments
    SET organization_name = NEW.organization_name,
        updated_at = NOW()
  WHERE doctor_id = NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_appointment_org_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_appt_org_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update appointments
     set organization_name = new.organization_name,
         updated_at        = now()
   where doctor_id = new.id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_appt_org_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_msglog_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_msglog_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_appt_sms"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'scheduled' then
    perform send_twilio_sms(new.id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_appt_sms"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_and_by_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_updater TEXT;
BEGIN
  NEW.updated_at := NOW();

  SELECT COALESCE(
    (SELECT name FROM public.doctors WHERE user_id = auth.uid() LIMIT 1),
    (SELECT name FROM public.admins  WHERE user_id = auth.uid() LIMIT 1)
  )
  INTO current_updater;

  IF current_updater IS NULL THEN
    current_updater := 'unknown';
  END IF;

  NEW.updated_by := current_updater;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_and_by_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "text",
    "organization_name" "text",
    "national_id" character(10),
    "nationality" "text",
    "phone_number" "text"
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "patient_name" "text" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "text",
    "organization_name" "text",
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'cancelled'::"text", 'completed'::"text", 'attended'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "specialization" "text" NOT NULL,
    "license_number" "text" NOT NULL,
    "phone" "text",
    "email" "text" NOT NULL,
    "bio" "text",
    "appointment_duration" integer DEFAULT 30,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "text",
    "organization_name" "text"
);


ALTER TABLE "public"."doctors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_log" (
    "id" bigint NOT NULL,
    "appointment_id" "uuid",
    "message_sid" "text",
    "to_number" "text",
    "body" "text",
    "status" "text" DEFAULT 'queued'::"text",
    "detail" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."message_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."message_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."message_log_id_seq" OWNED BY "public"."message_log"."id";



CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "gender" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "national_id" "text" NOT NULL,
    "medical_history" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "text",
    "nationality" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    CONSTRAINT "patients_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text"])))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


ALTER TABLE ONLY "public"."message_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."message_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_national_id_key" UNIQUE ("national_id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_license_number_key" UNIQUE ("license_number");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_log"
    ADD CONSTRAINT "message_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_national_id_key" UNIQUE ("national_id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admins_user_id" ON "public"."admins" USING "btree" ("user_id");



CREATE INDEX "idx_appt_doctor_date" ON "public"."appointments" USING "btree" ("doctor_id", "date");



CREATE INDEX "idx_appt_patient" ON "public"."appointments" USING "btree" ("patient_id");



CREATE INDEX "idx_doctors_user_id" ON "public"."doctors" USING "btree" ("user_id");



CREATE INDEX "idx_patients_user_id" ON "public"."patients" USING "btree" ("user_id");



CREATE INDEX "msglog_appt_idx" ON "public"."message_log" USING "btree" ("appointment_id");



CREATE OR REPLACE TRIGGER "tg_admins_upd" BEFORE UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_fields"();



CREATE OR REPLACE TRIGGER "tg_appt_sms" AFTER INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_appt_sms"();



CREATE OR REPLACE TRIGGER "tg_appt_upd" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_fields"();



CREATE OR REPLACE TRIGGER "tg_doctors_upd" BEFORE UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_fields"();



CREATE OR REPLACE TRIGGER "tg_patients_upd" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_fields"();



CREATE OR REPLACE TRIGGER "tg_sync_org" AFTER UPDATE OF "organization_name" ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."sync_appt_org_name"();



CREATE OR REPLACE TRIGGER "tg_touch_msglog" BEFORE UPDATE ON "public"."message_log" FOR EACH ROW EXECUTE FUNCTION "public"."touch_msglog_updated"();



CREATE OR REPLACE TRIGGER "trg_admins_set_updated" BEFORE UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "trg_appointments_set_updated" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "trg_doctors_set_updated" BEFORE UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "trg_patients_set_updated" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "trg_sync_org_name" AFTER UPDATE OF "organization_name" ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."sync_appointment_org_name"();



CREATE OR REPLACE TRIGGER "update_admins_updated_at" BEFORE UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "update_doctors_updated_at" BEFORE UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



CREATE OR REPLACE TRIGGER "update_patients_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_and_by_column"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_log"
    ADD CONSTRAINT "message_log_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_delete_own" ON "public"."admins" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admins_insert_own" ON "public"."admins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "admins_select_own" ON "public"."admins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admins_update_own" ON "public"."admins" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_delete_related" ON "public"."appointments" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "appointments_insert_related" ON "public"."appointments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "appointments_select_related" ON "public"."appointments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "appointments_update_related" ON "public"."appointments" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."doctors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doctors_delete_own" ON "public"."doctors" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "doctors_insert_own" ON "public"."doctors" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "doctors_select_own_or_admin" ON "public"."doctors" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "doctors_update_own" ON "public"."doctors" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."message_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "msglog_read" ON "public"."message_log" USING ((EXISTS ( SELECT 1
   FROM ("public"."appointments" "a"
     JOIN "public"."doctors" "d" ON (("d"."id" = "a"."doctor_id")))
  WHERE (("a"."id" = "message_log"."appointment_id") AND (("d"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."admins"
          WHERE ("admins"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "p_admins_rw" ON "public"."admins" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "p_appt_rw" ON "public"."appointments" USING (((EXISTS ( SELECT 1
   FROM "public"."doctors" "d"
  WHERE (("d"."id" = "appointments"."doctor_id") AND ("d"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "appointments"."patient_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins" "a"
  WHERE ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."doctors" "d"
  WHERE (("d"."id" = "appointments"."doctor_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "p_doctors_rw" ON "public"."doctors" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"()))))) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "p_patients_rw" ON "public"."patients" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"()))))) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patients_delete_own" ON "public"."patients" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "patients_insert_own" ON "public"."patients" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "patients_select_own_or_admin" ON "public"."patients" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "patients_update_own" ON "public"."patients" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "الأطباء يمكنهم إنشاء سجلاتهم الخا" ON "public"."doctors" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "الأطباء يمكنهم تحديث سجلاتهم الخا" ON "public"."doctors" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "الأطباء يمكنهم حذف سجلاتهم الخاصة " ON "public"."doctors" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون المصرح لهم يمكنهم إنشا" ON "public"."appointments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "المستخدمون المصرح لهم يمكنهم قراء" ON "public"."doctors" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "المستخدمون يمكنهم إنشاء سجل الأدم" ON "public"."admins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم إنشاء سجلات الم" ON "public"."patients" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم تحديث المواعيد " ON "public"."appointments" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "المستخدمون يمكنهم تحديث سجل الأدم" ON "public"."admins" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم تحديث سجلات الم" ON "public"."patients" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم حذف المواعيد ال" ON "public"."appointments" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "المستخدمون يمكنهم حذف سجل الأدمن ا" ON "public"."admins" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم حذف سجلات المرض" ON "public"."patients" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم قراءة المواعيد " ON "public"."appointments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "appointments"."doctor_id") AND ("doctors"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "appointments"."patient_id") AND ("patients"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "المستخدمون يمكنهم قراءة بيانات ال" ON "public"."admins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "المستخدمون يمكنهم قراءة بيانات ال" ON "public"."patients" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."handle_new_doctor"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_doctor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_doctor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_twilio_sms"("_appt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_twilio_sms"("_appt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_twilio_sms"("_appt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_appointment_org_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_appointment_org_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_appointment_org_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_appt_org_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_appt_org_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_appt_org_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_msglog_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_msglog_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_msglog_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_appt_sms"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_appt_sms"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_appt_sms"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_and_by_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_and_by_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_and_by_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."doctors" TO "anon";
GRANT ALL ON TABLE "public"."doctors" TO "authenticated";
GRANT ALL ON TABLE "public"."doctors" TO "service_role";



GRANT ALL ON TABLE "public"."message_log" TO "anon";
GRANT ALL ON TABLE "public"."message_log" TO "authenticated";
GRANT ALL ON TABLE "public"."message_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."message_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."message_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."message_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";









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
