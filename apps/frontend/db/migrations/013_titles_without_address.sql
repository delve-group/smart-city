-- Titles never repeat the address: the place has its own field (D083).
-- Server-made titles were "<issue> on|at <public label>"; keep the issue label.
UPDATE incidents
SET title = left(title, length(title) - length(public_label) - 4)
WHERE right(title, length(public_label) + 4) IN (' on ' || public_label, ' at ' || public_label);

-- Initial-data titles written with the street; replace them and their copies in proposals and tickets.
CREATE TEMP TABLE title_rewrites (old_title text PRIMARY KEY, new_title text NOT NULL) ON COMMIT DROP;
INSERT INTO title_rewrites VALUES
  ('Awaria prądu na ul. Józefa Dietla', 'Awaria prądu w kamienicach i sklepach'),
  ('Wyciek wody na ul. Karmelickiej', 'Woda wypływa spod chodnika'),
  ('Dziura w jezdni na ul. Krakowskiej', 'Dziura w jezdni przed przejściem'),
  ('Awaria tablicy odjazdów na Rondzie Mogilskim', 'Awaria tablicy odjazdów'),
  ('Przepełnione kosze na placu Nowym', 'Przepełnione kosze na śmieci'),
  ('Złamany konar na Plantach przy ul. Basztowej', 'Złamany konar nad alejką'),
  ('Niedziałająca winda na perony przy ul. Pawiej', 'Niedziałająca winda na perony'),
  ('Nocny hałas z budowy na ul. Szewskiej', 'Nocny hałas z budowy'),
  ('Niedziałające latarnie na ul. Grodzkiej', 'Niedziałające latarnie'),
  ('Brak wody na ul. Długiej', 'Brak wody w kranach'),
  ('Awaria prądu na ul. Lea', 'Awaria prądu w kilku budynkach');

UPDATE incidents i SET title = r.new_title FROM title_rewrites r WHERE i.title = r.old_title;

UPDATE action_proposals p SET payload = replace(p.payload::text, to_jsonb(r.old_title)::text, to_jsonb(r.new_title)::text)::jsonb
FROM title_rewrites r WHERE p.payload::text LIKE '%' || to_jsonb(r.old_title)::text || '%';

UPDATE service_tickets t SET payload = replace(t.payload::text, to_jsonb(r.old_title)::text, to_jsonb(r.new_title)::text)::jsonb
FROM title_rewrites r WHERE t.payload::text LIKE '%' || to_jsonb(r.old_title)::text || '%';
