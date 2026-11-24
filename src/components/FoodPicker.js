import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { foodList, scaleFood } from '../utils/nutrition';
import Segmented from './Segmented';
import Field from './Field';

const ALL_FOODS = foodList();
const EMPTY_MANUAL = { name: '', serving: '', kcal: '', carbs: '', protein: '', fat: '' };
const isNum = (v, lo, hi) => String(v).trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi;
const optNum = (v, lo, hi) => String(v).trim() === '' || isNum(v, lo, hi);

// Search the built-in food list or type a food in manually. Calls onPick(entry, isManual).
export default function FoodPicker({ visible, title = 'Add food', onClose, onPick }) {
  const [mode, setMode] = useState('Search foods');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [servings, setServings] = useState('1');
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [error, setError] = useState('');

  const reset = () => {
    setMode('Search foods'); setQ(''); setSelected(null); setServings('1'); setManual(EMPTY_MANUAL); setError('');
  };
  const close = () => { reset(); onClose(); };
  const finish = (entry, isManual) => { reset(); onPick(entry, isManual); };

  const results = ALL_FOODS.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()));
  const setM = (k) => (v) => setManual((m) => ({ ...m, [k]: v }));

  const addSelected = () => {
    if (!isNum(servings, 0.1, 100)) { setError('Servings must be between 0.1 and 100.'); return; }
    finish(scaleFood(selected, Number(servings)), false);
  };

  const addManual = () => {
    if (!manual.name.trim()) { setError('Food name is required.'); return; }
    if (!isNum(manual.kcal, 0, 5000)) { setError('Calories must be between 0 and 5000.'); return; }
    if (!optNum(manual.carbs, 0, 1000) || !optNum(manual.protein, 0, 1000) || !optNum(manual.fat, 0, 1000)) {
      setError('Carbs, protein and fat must be between 0 and 1000 g.'); return;
    }
    finish(
      {
        name: manual.name.trim().slice(0, 100),
        serving: manual.serving.trim().slice(0, 60) || '1 serving',
        servings: 1,
        kcal: Math.round(Number(manual.kcal)),
        carbs: Number(manual.carbs || 0),
        protein: Number(manual.protein || 0),
        fat: Number(manual.fat || 0),
      },
      true
    );
  };

  const preview = selected && isNum(servings, 0.1, 100) ? scaleFood(selected, Number(servings)) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={close} accessibilityLabel="Close"><Ionicons name="close" size={26} color={colors.dark} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Segmented options={['Search foods', 'Manual entry']} value={mode} onChange={(m) => { setMode(m); setError(''); }} />

          {mode === 'Search foods' && !selected && (
            <>
              <TextInput style={styles.search} placeholder="Search idli, dosa, fish, paneer…" placeholderTextColor={colors.muted}
                value={q} onChangeText={setQ} autoCorrect={false} />
              {results.length === 0 && <Text style={styles.small}>No match. Use Manual entry to add this food yourself.</Text>}
              {results.map((f) => (
                <TouchableOpacity key={f.id} style={styles.item} onPress={() => { setSelected(f); setServings('1'); setError(''); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{f.name}</Text>
                    <Text style={styles.small}>{f.qty} · {f.kcal} kcal · C {f.carbs}g · P {f.protein}g · F {f.fat}g</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {mode === 'Search foods' && selected && (
            <View>
              <Text style={styles.name}>{selected.name}</Text>
              <Text style={[styles.small, { marginBottom: 12 }]}>1 serving = {selected.qty}</Text>
              <Field label="Number of servings" value={servings} onChangeText={setServings} keyboardType="decimal-pad" />
              {preview && (
                <Text style={styles.preview}>
                  {preview.kcal} kcal · Carbs {preview.carbs}g · Protein {preview.protein}g · Fat {preview.fat}g
                </Text>
              )}
              {error ? <Text style={styles.err}>{error}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={addSelected}><Text style={styles.btnText}>Add</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={() => { setSelected(null); setError(''); }}>
                <Text style={styles.btnOutlineText}>Back to list</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'Manual entry' && (
            <View>
              <Text style={[styles.small, { marginBottom: 10 }]}>Use the numbers on the food label or from your dietitian.</Text>
              <Field label="Food name" value={manual.name} onChangeText={setM('name')} maxLength={100} />
              <Field label="Serving size (for example 1 bowl, 100 g)" value={manual.serving} onChangeText={setM('serving')} maxLength={60} />
              <Field label="Calories (kcal)" value={manual.kcal} onChangeText={setM('kcal')} keyboardType="decimal-pad" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field style={{ flex: 1 }} label="Carbs (g)" value={manual.carbs} onChangeText={setM('carbs')} keyboardType="decimal-pad" />
                <Field style={{ flex: 1 }} label="Protein (g)" value={manual.protein} onChangeText={setM('protein')} keyboardType="decimal-pad" />
                <Field style={{ flex: 1 }} label="Fat (g)" value={manual.fat} onChangeText={setM('fat')} keyboardType="decimal-pad" />
              </View>
              {error ? <Text style={styles.err}>{error}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={addManual}><Text style={styles.btnText}>Add</Text></TouchableOpacity>
            </View>
          )}

          <Text style={[styles.small, { marginTop: 16 }]}>Nutrition values are estimates. Check packaged-food labels for exact numbers.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  search: { backgroundColor: colors.white, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  name: { color: colors.text, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 12 },
  preview: { color: colors.dark, fontWeight: '800', marginBottom: 12 },
  err: { color: colors.danger, marginBottom: 10 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 4 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
});
