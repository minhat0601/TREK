const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.eivcorxtazvodbrixpoo:Mr5PunD67zWWth2U@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to DB');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260701000003_profile_email.sql'), 'utf8');
    await client.query(sql);
    console.log('Successfully executed migration on remote DB');
  } catch (err) {
    console.error('Error executing script:', err);
  } finally {
    await client.end();
  }
}

run();
