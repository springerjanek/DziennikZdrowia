-- Dane testowe do lokalnego developmentu. Uruchamiane tylko z profilem "local" (application-local.yml),
-- po utworzeniu tabel przez Hibernate. Kazdy INSERT jest idempotentny, bo skrypt leci przy kazdym starcie.
-- Jeden tester ze wszystkimi typami harmonogramu. Przez Google sie nie zaloguje (google_sub jest zmyslony),
-- ale z profilem "local" wchodzi sie na niego przez POST /api/auth/dev-login (DevAuthController).
-- GTIN-y sa z obwieszczenia MZ na 1.10.2026, wiec po imporcie wykazu leki pokazuja refundacje.

-- Profil pasuje do lekow ponizej (metformina + insulina, lewotyroksyna), bo to on decyduje,
-- ktore reguly profilaktyki sie odpala. Bez niego /api/me/screenings oddaje 409.
INSERT INTO users (id, google_sub, email, name, picture_url, birth_year, birth_month, sex) VALUES
    ('00000000-0000-0000-0000-000000000002', 'seed-jan', 'jan@example.com', 'Jan Testowy', NULL, 1965, 4, 'MALE')
-- DO UPDATE, bo bazy z wczesniejszym seedem maja juz tego usera bez profilu.
-- WHERE pilnuje, zeby nie nadpisac profilu zmienionego w aplikacji.
ON CONFLICT (id) DO UPDATE
    SET birth_year = EXCLUDED.birth_year,
        birth_month = EXCLUDED.birth_month,
        sex = EXCLUDED.sex
    WHERE users.birth_year IS NULL;

INSERT INTO user_condition (user_id, condition_id)
SELECT seed.user_id, seed.condition_id
FROM (VALUES
    ('00000000-0000-0000-0000-000000000002'::uuid, 'diabetes_t2'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'hypothyroidism')
) AS seed (user_id, condition_id)
-- Jak przy dawkach: sprawdzamy, czy tester ma juz jakiekolwiek choroby. Inaczej seed
-- przywracalby przy kazdym starcie te, ktore ktos skasowal w aplikacji.
WHERE NOT EXISTS (SELECT 1 FROM user_condition c WHERE c.user_id = seed.user_id);

INSERT INTO user_medications
    (id, user_id, gtin, name, active_substance, schedule_type, interval_days, max_daily_doses, start_date, end_date, notes)
VALUES
    -- Codziennie, rano i wieczorem inna dawka.
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
     '05909990126316', 'Metformax 500', 'Metformini hydrochloridum', 'DAILY', NULL, NULL, '2026-10-01', NULL, NULL),
    -- Codziennie na czczo.
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
     '05909991051228', 'Euthyrox N 50', 'Levothyroxinum natricum', 'DAILY', NULL, NULL, '2026-10-01', NULL,
     'Pol godziny przed sniadaniem'),
    -- W razie potrzeby, lek dodany recznie (bez GTIN = pelna cena).
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
     NULL, 'Ibuprom', 'Ibuprofen', 'AS_NEEDED', NULL, 3, '2026-10-01', NULL, NULL),
    -- Wybrane dni tygodnia.
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
     NULL, 'Metotreksat', 'Methotrexatum', 'WEEKDAYS', NULL, NULL, '2026-10-01', NULL, 'Kwas foliowy dzien pozniej'),
    -- Co 7 dni, z data zakonczenia.
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
     NULL, 'Witamina D3 20 000 j.m.', 'Cholecalciferolum', 'EVERY_N_DAYS', 7, NULL, '2026-10-05', '2027-03-31', NULL),
    -- Insulina, rozne dawki o roznych porach.
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
     '05909990895717', 'Lantus', 'Insulinum glarginum', 'DAILY', NULL, NULL, '2026-10-01', NULL, NULL)
-- DO UPDATE zamiast DO NOTHING: bazy z dawnym seedem mialy te leki rozdzielone miedzy dwoch uzytkownikow.
ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id;

-- Dawny drugi uzytkownik testowy. Jego leki przeszly wyzej do testera, wiec nic go juz nie trzyma.
DELETE FROM users WHERE google_sub = 'seed-ania';

INSERT INTO user_medication_weekdays (user_medication_id, weekday)
SELECT '10000000-0000-0000-0000-000000000004', 'MONDAY'
WHERE NOT EXISTS (SELECT 1 FROM user_medication_weekdays WHERE user_medication_id = '10000000-0000-0000-0000-000000000004');

-- Dawki maja id z IDENTITY, wiec zamiast ON CONFLICT sprawdzamy, czy lek ma juz jakiekolwiek dawki.
INSERT INTO medication_doses (user_medication_id, time_of_day, amount, unit, instruction)
SELECT seed.user_medication_id, seed.time_of_day, seed.amount, seed.unit, seed.instruction
FROM (VALUES
    ('10000000-0000-0000-0000-000000000001'::uuid, '08:00'::time, 1.0, 'TABLET', 'po posilku'),
    ('10000000-0000-0000-0000-000000000001'::uuid, '20:00'::time, 0.5, 'TABLET', 'po posilku'),
    ('10000000-0000-0000-0000-000000000002'::uuid, '06:30'::time, 1.0, 'TABLET', 'na czczo'),
    ('10000000-0000-0000-0000-000000000003'::uuid, NULL::time, 1.0, 'TABLET', 'przy bolu, co najmniej 6 h przerwy'),
    ('10000000-0000-0000-0000-000000000004'::uuid, '09:00'::time, 7.5, 'MG', NULL),
    ('10000000-0000-0000-0000-000000000005'::uuid, '10:00'::time, 1.0, 'CAPSULE', NULL),
    ('10000000-0000-0000-0000-000000000006'::uuid, '07:00'::time, 10.0, 'UNIT', NULL),
    ('10000000-0000-0000-0000-000000000006'::uuid, '22:00'::time, 14.0, 'UNIT', NULL)
) AS seed (user_medication_id, time_of_day, amount, unit, instruction)
WHERE NOT EXISTS (SELECT 1 FROM medication_doses d WHERE d.user_medication_id = seed.user_medication_id);
