-- Dane testowe do lokalnego developmentu. Uruchamiane tylko przy DB_SEED=always (patrz application.yml),
-- po utworzeniu tabel przez Hibernate. Kazdy INSERT jest idempotentny, bo skrypt leci przy kazdym starcie.
-- Ci uzytkownicy nie zaloguja sie przez Google (google_sub jest zmyslony) - sluza do podgladu danych w bazie.
-- GTIN-y sa z obwieszczenia MZ na 1.10.2026, wiec po imporcie wykazu leki pokazuja refundacje.

INSERT INTO users (id, google_sub, email, name, picture_url) VALUES
    ('00000000-0000-0000-0000-000000000001', 'seed-ania', 'ania@example.com', 'Ania Testowa', NULL),
    ('00000000-0000-0000-0000-000000000002', 'seed-jan', 'jan@example.com', 'Jan Testowy', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_medications
    (id, user_id, gtin, name, active_substance, schedule_type, interval_days, max_daily_doses, start_date, end_date, notes)
VALUES
    -- Codziennie, rano i wieczorem inna dawka.
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
     '05909990126316', 'Metformax 500', 'Metformini hydrochloridum', 'DAILY', NULL, NULL, '2026-10-01', NULL, NULL),
    -- Codziennie na czczo.
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
     '05909991051228', 'Euthyrox N 50', 'Levothyroxinum natricum', 'DAILY', NULL, NULL, '2026-10-01', NULL,
     'Pol godziny przed sniadaniem'),
    -- W razie potrzeby, lek dodany recznie (bez GTIN = pelna cena).
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
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
ON CONFLICT (id) DO NOTHING;

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
