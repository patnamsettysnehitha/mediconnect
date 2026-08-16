-- roles
CREATE TYPE public.app_role AS ENUM ('patient','doctor','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  preferred_language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  specialization text NOT NULL,
  qualification text NOT NULL DEFAULT 'MBBS',
  experience_years int NOT NULL DEFAULT 0,
  bio text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 500,
  photo_url text,
  languages text[] NOT NULL DEFAULT ARRAY['English'],
  available_days int[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctors public read" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "doctor manages own row" ON public.doctors FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "doctor creates own row" ON public.doctors FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time text NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'booked',
  doctor_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, slot_date, slot_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient reads own appointments" ON public.appointments FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR doctor_id = public.current_doctor_id());
CREATE POLICY "patient books" ON public.appointments FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "patient or doctor updates" ON public.appointments FOR UPDATE TO authenticated
  USING (patient_id = auth.uid() OR doctor_id = public.current_doctor_id())
  WITH CHECK (patient_id = auth.uid() OR doctor_id = public.current_doctor_id());
CREATE POLICY "patient cancels" ON public.appointments FOR DELETE TO authenticated USING (patient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_my_patient(_patient uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = _patient AND a.doctor_id = public.current_doctor_id()
  );
$$;

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_my_patient(id));
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  record_type text NOT NULL DEFAULT 'report',
  record_date date NOT NULL DEFAULT current_date,
  notes text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records read" ON public.medical_records FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.is_my_patient(patient_id));
CREATE POLICY "records insert" ON public.medical_records FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "records update" ON public.medical_records FOR UPDATE TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "records delete" ON public.medical_records FOR DELETE TO authenticated USING (patient_id = auth.uid());

CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL DEFAULT '',
  times text[] NOT NULL DEFAULT ARRAY['09:00'],
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicines read" ON public.medicines FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.is_my_patient(patient_id));
CREATE POLICY "medicines insert" ON public.medicines FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "medicines update" ON public.medicines FOR UPDATE TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "medicines delete" ON public.medicines FOR DELETE TO authenticated USING (patient_id = auth.uid());

-- new user -> profile + role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  ) ON CONFLICT (id) DO NOTHING;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'patient');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'doctor' THEN
    INSERT INTO public.doctors (user_id, full_name, specialization, qualification, bio)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Doctor'),
      COALESCE(NEW.raw_user_meta_data->>'specialization', 'General Physician'),
      COALESCE(NEW.raw_user_meta_data->>'qualification', 'MBBS'),
      ''
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.doctors (full_name, specialization, qualification, experience_years, bio, fee, languages) VALUES
('Dr. Anitha Rao','General Physician','MBBS, MD',12,'Treats fever, infections, diabetes and everyday health problems.',400,ARRAY['English','Hindi','Telugu']),
('Dr. Rajesh Kumar','Cardiologist','MBBS, MD, DM Cardiology',18,'Heart care, chest pain, blood pressure and cholesterol management.',900,ARRAY['English','Hindi']),
('Dr. Meera Nair','Dermatologist','MBBS, MD Dermatology',9,'Skin, hair and nail conditions including acne and allergies.',600,ARRAY['English','Hindi']),
('Dr. Sandeep Verma','Orthopedic Surgeon','MBBS, MS Ortho',15,'Bone, joint, back pain, fractures and sports injuries.',800,ARRAY['English','Hindi']),
('Dr. Kavya Reddy','Pediatrician','MBBS, MD Pediatrics',10,'Child health, vaccinations, growth and childhood illnesses.',500,ARRAY['English','Telugu']),
('Dr. Imran Sheikh','Neurologist','MBBS, DM Neurology',14,'Headache, migraine, seizures, stroke and nerve disorders.',1000,ARRAY['English','Hindi']),
('Dr. Sunita Joshi','Gynecologist','MBBS, MS OBG',16,'Womens health, pregnancy care and menstrual problems.',700,ARRAY['English','Hindi']),
('Dr. Arun Prasad','ENT Specialist','MBBS, MS ENT',11,'Ear, nose, throat, sinus and hearing problems.',550,ARRAY['English','Telugu']),
('Dr. Neha Gupta','Psychiatrist','MBBS, MD Psychiatry',8,'Stress, anxiety, sleep problems and mental wellbeing.',850,ARRAY['English','Hindi']),
('Dr. Vikram Singh','Gastroenterologist','MBBS, DM Gastro',13,'Stomach pain, acidity, liver and digestion related problems.',900,ARRAY['English','Hindi']);