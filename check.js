const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ypkmtmmmsjcdmnarkmhf.supabase.co';
const supabaseKey = 'sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const { data, error } = await supabase.from('user_data').select('*').limit(1);
    console.log('user_data table:', {data, error});
}
checkTables();
