ALTER ROLE authenticator SET pgrst.db_max_rows = '10000';
NOTIFY pgrst, 'reload config';
