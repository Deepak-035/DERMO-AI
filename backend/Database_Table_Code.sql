CREATE TABLE predictions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prediction TEXT NOT NULL,
    code TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
