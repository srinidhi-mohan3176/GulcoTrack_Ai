import { useState } from 'react';
import Screen from '../../components/Screen';
import Segmented from '../../components/Segmented';
import GlucoseReadings from '../../components/GlucoseReadings';
import LabReports from '../../components/LabReports';

export default function Glucose() {
  const [tab, setTab] = useState('Readings');
  return (
    <Screen title="Glucose" subtitle="Readings and laboratory reports">
      <Segmented options={['Readings', 'Reports']} value={tab} onChange={setTab} />
      {tab === 'Readings' ? <GlucoseReadings /> : <LabReports />}
    </Screen>
  );
}
