-- Rule-based proposals no longer carry an explanation sentence, and the residents count is a plain number (D079).
UPDATE action_proposals
SET explanation = btrim(regexp_replace(explanation,
      '\s*(Prepared from the configured (demo )?responsibility rule[^.]*, without a language model\.|Przygotowano na podstawie skonfigurowanej reguły odpowiedzialności[^.]*\.)', '', 'g'))
WHERE explanation ~ '(without a language model\.|Przygotowano na podstawie skonfigurowanej reguły)';

UPDATE action_proposals
SET payload = regexp_replace(payload::text, ' \((unverified identities|demo identities, unverified|unverified|niezweryfikowane tożsamości|niezweryfikowan[yi])\)', '', 'g')::jsonb
WHERE payload::text ~ ' \((unverified|demo identities|niezweryfikowan)';

UPDATE service_tickets
SET payload = regexp_replace(payload::text, ' \((unverified identities|demo identities, unverified|unverified|niezweryfikowane tożsamości|niezweryfikowan[yi])\)', '', 'g')::jsonb
WHERE payload::text ~ ' \((unverified|demo identities|niezweryfikowan)';
