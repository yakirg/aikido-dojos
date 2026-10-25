UPDATE practitioner SET rank_name = UPPER(TRIM(rank_name)) WHERE rank_name IS NOT NULL;

UPDATE practitioner SET rank_name = NULL
WHERE rank_name NOT IN ('ROKYU', 'GOKYU', 'YONKYU', 'SANKYU', 'NIKYU', 'IKKYU',
                        'SHODAN', 'NIDAN', 'SANDAN', 'YODAN', 'GODAN', 'ROKUDAN', 'SHICHIDAN', 'HACHIDAN');
