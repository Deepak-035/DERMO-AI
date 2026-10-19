CREATE TABLE IF NOT EXISTS predictions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prediction TEXT NOT NULL,
    code TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_number TEXT NOT NULL UNIQUE,
    prediction_id BIGINT REFERENCES predictions(id) ON DELETE CASCADE,
    pdf_storage_path TEXT NOT NULL,
    model_version TEXT NOT NULL,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
