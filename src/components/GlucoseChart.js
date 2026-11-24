import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

const DOT = { urgent: colors.danger, outside: '#C77700', ok: colors.primary, none: colors.muted };

// Dependency-free scatter chart. points: [{ id, t (ms), value, level }]. band: { min?, max? } is the doctor-set range.
export default function GlucoseChart({ points, band, height = 170 }) {
  const [w, setW] = useState(0);
  if (!points.length) return null;

  const vals = points.map((p) => p.value);
  const lo0 = Math.min(...vals, band && band.min != null ? band.min : Infinity);
  const hi0 = Math.max(...vals, band && band.max != null ? band.max : -Infinity);
  const lo = Math.max(0, Math.floor((lo0 - 10) / 10) * 10);
  const hi = Math.ceil((hi0 + 10) / 10) * 10;
  const span = hi - lo || 1;
  const padX = 14;
  const innerH = height - 20;
  const y = (v) => 10 + innerH - ((v - lo) / span) * innerH;

  const t0 = Math.min(...points.map((p) => p.t));
  const t1 = Math.max(...points.map((p) => p.t));
  const x = (t) => (t1 === t0 ? w / 2 : padX + ((t - t0) / (t1 - t0)) * (w - padX * 2));

  const bandTop = band && band.max != null ? y(Math.min(band.max, hi)) : 10;
  const bandBottom = band && band.min != null ? y(Math.max(band.min, lo)) : 10 + innerH;

  return (
    <View>
      <View style={[styles.area, { height }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {band && (band.min != null || band.max != null) && (
          <View style={[styles.band, { top: bandTop, height: Math.max(2, bandBottom - bandTop) }]} />
        )}
        <Text style={[styles.axis, { top: 0 }]}>{hi}</Text>
        <Text style={[styles.axis, { bottom: 0 }]}>{lo}</Text>
        {w > 0 &&
          points.map((p) => (
            <View key={p.id} style={[styles.dot, { left: x(p.t) - 5, top: y(p.value) - 5, backgroundColor: DOT[p.level] || colors.primary }]} />
          ))}
      </View>
      <Text style={styles.legend}>
        mg/dL · green dot: within your doctor’s range · amber: outside · red: beyond urgent limit · grey: no target set
        {band ? ' · shaded: your doctor’s range' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: colors.bg, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.light },
  axis: { position: 'absolute', left: 4, fontSize: 10, color: colors.muted },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.white },
  legend: { fontSize: 10, color: colors.muted, marginTop: 6 },
});
