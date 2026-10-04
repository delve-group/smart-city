-- Server-generated labels are stored in their English source form and translated in the interface (D081).
-- Undoes Polish copies of that wording written by the fixture seed of 2026-10-04; resident-written text is untouched.
UPDATE incident_evidence SET source = 'Utility feed' WHERE source = 'Odczyt sieci';
UPDATE incident_evidence SET source = 'Resident report (unverified identity)' WHERE source = 'Zgłoszenie mieszkańca (niezweryfikowana tożsamość)';
UPDATE incident_evidence SET label = replace(replace(label, ' · zgłoszenie głosowe', ' · Voice report'), ' · zgłoszenie z formularza', ' · Form report')
WHERE label LIKE '% · zgłoszenie %';
UPDATE incident_evidence SET label = 'Supply interrupted on the local feeder' WHERE label = 'Przerwa w zasilaniu na lokalnej linii';
UPDATE incident_evidence SET label = 'No supply reading available' WHERE label = 'Brak odczytu zasilania';
UPDATE incident_evidence SET note = 'No feed is configured for this area and category.' WHERE note = 'Dla tego obszaru i kategorii nie skonfigurowano źródła odczytów.';
UPDATE incidents SET review_note = 'A ticket proposal is ready for your decision.' WHERE review_note = 'Propozycja zlecenia czeka na Twoją decyzję.';
UPDATE reports SET review_note = 'One flat or unit only. Kept private until the scope is reviewed.'
WHERE review_note = 'Dotyczy tylko jednego mieszkania. Zostaje prywatne do czasu przeglądu zakresu.';
