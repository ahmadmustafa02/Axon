-- Enable pg_cron and pg_net for scheduled pipeline runs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;