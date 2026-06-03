import { supabase } from "@/integrations/supabase/client";

/**
 * Generates the next Staff ID in the format GDU001, GDU002, etc.
 */
export async function generateNextStaffId(): Promise<string> {
  const { data, error } = await supabase
    .from('staff_records')
    .select('readable_id')
    .order('readable_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching last staff ID:', error);
    return 'GDU001';
  }

  if (!data || data.length === 0 || !data[0].readable_id) {
    return 'GDU001';
  }

  const lastId = data[0].readable_id;
  const match = lastId.match(/GDU(\d+)/);
  
  if (!match) {
    return 'GDU001';
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;
  
  return `GDU${nextNumber.toString().padStart(3, '0')}`;
}
