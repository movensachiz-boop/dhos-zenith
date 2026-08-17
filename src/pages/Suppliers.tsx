import CrudPage from '@/components/common/CrudPage';

export default function Suppliers() {
  return (
    <CrudPage
      table="suppliers"
      title="Suppliers"
      subtitle="Vendors supplying your ingredients and stock"
      searchKeys={['name', 'contact_person', 'phone']}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'contact_person', label: 'Contact Person' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'address', label: 'Address' },
      ]}
    />
  );
}
