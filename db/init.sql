CREATE TABLE IF NOT EXISTS sensor_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(32) NOT NULL,
    device_id VARCHAR(64),
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    modo_resultante VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS state_changes (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modo VARCHAR(64) NOT NULL,
    luz_vehicular VARCHAR(32) NOT NULL,
    luz_peatonal VARCHAR(32) NOT NULL,
    tiempo_restante DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sensor_health (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_heartbeat TIMESTAMPTZ,
    pir INTEGER DEFAULT 0,
    button INTEGER DEFAULT 0,
    bridge_connected BOOLEAN DEFAULT FALSE
);

INSERT INTO sensor_health (id, bridge_connected)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_sensor_events_timestamp ON sensor_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_state_changes_timestamp ON state_changes (timestamp DESC);
