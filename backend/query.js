const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_I1RDumSbp2Cw@ep-green-tree-azkhm93h.c-3.ap-southeast-1.aws.neon.tech/neondb?uselibpqcompat=true&sslmode=verify-full' });

async function run() {
  await client.connect();
  let res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'venue_bookings' AND column_name = 'host_club'
  `);
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
