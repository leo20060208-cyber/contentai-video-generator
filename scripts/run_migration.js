const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Faltan las credenciales de Supabase (URL o Service Role Key) en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('Iniciando migración...');

    const sql = `
    ALTER TABLE videos 
    ADD COLUMN IF NOT EXISTS project_data JSONB DEFAULT '{}'::jsonb;

    -- Update RLS policies to allow updating project_data if not exists
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own videos' AND tablename = 'videos'
        ) THEN
            create policy "Users can update their own videos"
            on videos for update
            to authenticated
            using (auth.uid() = user_id)
            with check (auth.uid() = user_id);
        END IF;
    END
    $$;
  `;

    // Supabase JS client doesn't support raw SQL execution directly on the public interface widely
    // without RPC. However, we can try to use the pg driver if available or specific POSTGREST endpoints
    // But usually, migration scripts run via CLI.

    // Since we are in a node environment, we might not have direct SQL access via supabase-js without an RPC function "exec_sql".
    // A common workaround is to use the Postgres connection string if available, but we only have the storage/API keys usually.

    // IF we can't execute SQL, we have to ask the user.
    // BUT, let's try to check if we can use a clever trick or if we assume the user has a Setup RPC.

    console.log('NOTA: supabase-js no permite ejecutar SQL arbitrario directamente sin una función RPC.');
    console.log('Si esto falla, por favor ejecuta el contenido de project_migration.sql en el Editor SQL de tu dashboard de Supabase.');

    // Attempting to use a specializedrpc if it exists, otherwise we mock success to instruct user
    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('No se pudo ejecutar la migración automáticamente (posiblemente falta la función exec_sql):', error.message);
            console.log('Por favor, ejecuta el archivo project_migration.sql manualmente en Supabase.');
        } else {
            console.log('Migración ejecutada correctamente (vía RPC).');
        }
    } catch (e) {
        console.error('Error intentando migración:', e);
    }
}

runMigration();
