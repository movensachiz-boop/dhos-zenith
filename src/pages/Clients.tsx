import CrudPage from '@/components/common/CrudPage';

export default function Clients() {
  return (
    <CrudPage
      table="clients"
      title="Clients"
      subtitle="Customer accounts, credit limits and balances"
      searchKeys={['name', 'phone', 'email', 'customer_number']}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'customer_number', label: 'Customer No.' },
        { key: 'referral_credits', label: 'Referral Credit', type: 'number', format: v => `$${Number(v ?? 0).toFixed(2)}` },
        { key: 'phone', label: 'Phone', type: 'tel' },

        { key: 'email', label: 'Email', type: 'email' },
        { key: 'address', label: 'Address' },
        { key: 'tin_number', label: 'TIN Number' },
        { key: 'credit_limit', label: 'Credit Limit', type: 'number', format: v => `$${Number(v ?? 0).toFixed(2)}` },
        { key: 'outstanding_balance', label: 'Outstanding', type: 'number', format: v => `$${Number(v ?? 0).toFixed(2)}` },
      ]}
    />
  );
}
