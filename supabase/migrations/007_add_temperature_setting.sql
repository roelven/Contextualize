-- Add temperature setting to spaces for LLM creativity control

ALTER TABLE public.spaces 
ADD COLUMN temperature DECIMAL(2,1) DEFAULT 0.7 CHECK (temperature >= 0.0 AND temperature <= 2.0);

COMMENT ON COLUMN public.spaces.temperature IS 'LLM temperature setting (0.0-2.0) - controls creativity/randomness of responses';