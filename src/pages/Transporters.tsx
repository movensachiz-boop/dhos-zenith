import CrudPage from '@/components/common/CrudPage';

export default function Transporters() {
  return (
    <CrudPage
      table="transporters"
      title="Transporters"
      subtitle="Delivery vehicles, drivers and availability"
      searchKeys={['name', 'driver_name', 'vehicle_number']}
      fields={[
        { key: 'name', label: 'Transporter', required: true },
        { key: 'driver_name', label: 'Driver' },
        { key: 'vehicle_number', label: 'Vehicle Number' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'status', label: 'Status', placeholder: 'available / in_transit / offline' },
      ]}
    />
  );
}
