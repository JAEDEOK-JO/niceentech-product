import { supabase } from '@/lib/supabase'
import { sortShipmentSpecRows } from './sortShipmentSpecRows'

const PRODUCT_LIST_TABLE = 'product_list'
const COLUMNS = 'id,initial,name,company,place,area,shipment_spec_remarks,shipment_spec_landscape'

export const fetchShipmentSpecRows = async (testDate) => {
  const { data, error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select(COLUMNS)
    .eq('test_date', testDate)
    .order('company', { ascending: true })
    .order('place', { ascending: true })
    .order('area', { ascending: true })

  if (error) throw error
  return sortShipmentSpecRows(data)
}

