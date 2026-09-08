import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

type Section = 'tasks' | 'goals' | 'habits';
type Task = { id: string; title: string; space: string; completed: boolean };
type Goal = { id: string; title: string; completed: boolean };
type Habit = { id: string; title: string; completed: boolean; streak: number };
type AppData = { tasks: Task[]; goals: Goal[]; habits: Habit[] };

const STORAGE_KEY = '@daily-tasks-mobile/data';
const EMPTY_DATA: AppData = { tasks: [], goals: [], habits: [] };
const spaces = ['INV', 'BR', 'Qaff', 'Wootz', 'Self'];

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [section, setSection] = useState<Section>('tasks');
  const [draft, setDraft] = useState('');
  const [space, setSpace] = useState('Self');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setData(JSON.parse(value) as AppData);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: AppData) => {
    setData(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addItem = () => {
    const title = draft.trim();
    if (!title) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (section === 'tasks') persist({ ...data, tasks: [{ id, title, space, completed: false }, ...data.tasks] });
    if (section === 'goals') persist({ ...data, goals: [{ id, title, completed: false }, ...data.goals] });
    if (section === 'habits') persist({ ...data, habits: [{ id, title, completed: false, streak: 0 }, ...data.habits] });
    setDraft('');
  };

  const completedCount = useMemo(() => data.tasks.filter((task) => task.completed).length, [data.tasks]);
  const toggleTask = (id: string) => persist({ ...data, tasks: data.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) });
  const toggleGoal = (id: string) => persist({ ...data, goals: data.goals.map((goal) => goal.id === id ? { ...goal, completed: !goal.completed } : goal) });
  const toggleHabit = (id: string) => persist({ ...data, habits: data.habits.map((habit) => habit.id === id ? { ...habit, completed: !habit.completed, streak: !habit.completed ? habit.streak + 1 : Math.max(0, habit.streak - 1) } : habit) });
  const removeItem = (id: string) => {
    if (section === 'tasks') persist({ ...data, tasks: data.tasks.filter((item) => item.id !== id) });
    if (section === 'goals') persist({ ...data, goals: data.goals.filter((item) => item.id !== id) });
    if (section === 'habits') persist({ ...data, habits: data.habits.filter((item) => item.id !== id) });
  };

  if (!loaded) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}
      bottomOffset={80}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: colors.mutedForeground }]}>الثلاثاء، ٨ سبتمبر</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>ماذا ننجز اليوم؟</Text>
        </View>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}><Feather name="check" size={22} color={colors.primaryForeground} /></View>
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.primaryForeground }]}>إنجاز اليوم</Text>
          <Text style={[styles.progressValue, { color: colors.secondary }]}>{completedCount}/{data.tasks.length}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: 'rgba(245,242,233,0.25)' }]}>
          <View style={[styles.progressFill, { width: `${data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0}%`, backgroundColor: colors.secondary }]} />
        </View>
        <Text style={[styles.progressHint, { color: colors.primaryForeground }]}>خطوة صغيرة تكفي لتبدأ</Text>
      </View>

      <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
        {([['tasks', 'المهام', 'check-square'], ['goals', 'الأهداف', 'target'], ['habits', 'العادات', 'repeat']] as const).map(([key, label, icon]) => (
          <Pressable key={key} testID={`button-section-${key}`} onPress={() => setSection(key)} style={[styles.segment, section === key && { backgroundColor: colors.card, shadowColor: colors.foreground, shadowOpacity: 0.08, shadowRadius: 5 }]}>
            <Feather name={icon} size={15} color={section === key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: section === key ? colors.primary : colors.mutedForeground }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput testID="input-add-item" value={draft} onChangeText={setDraft} onSubmitEditing={addItem} returnKeyType="done" placeholder={section === 'tasks' ? 'أضف مهمة بسيطة...' : section === 'goals' ? 'أضف هدفًا...' : 'أضف عادة...'} placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
        <Pressable testID="button-add-item" onPress={addItem} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}><Feather name="plus" size={22} color={colors.secondaryForeground} /></Pressable>
      </View>

      {section === 'tasks' && <View style={styles.spaceRow}>{spaces.map((item) => <Pressable key={item} onPress={() => setSpace(item)} style={[styles.spaceChip, { borderColor: space === item ? colors.primary : colors.border, backgroundColor: space === item ? colors.primary : colors.card }]}><Text style={[styles.spaceText, { color: space === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>}

      <View style={styles.list}>
        {section === 'tasks' && data.tasks.map((item) => <TaskRow key={item.id} title={item.title} meta={item.space} completed={item.completed} colors={colors} onToggle={() => toggleTask(item.id)} onRemove={() => removeItem(item.id)} />)}
        {section === 'goals' && data.goals.map((item) => <TaskRow key={item.id} title={item.title} meta="هدف" completed={item.completed} colors={colors} onToggle={() => toggleGoal(item.id)} onRemove={() => removeItem(item.id)} />)}
        {section === 'habits' && data.habits.map((item) => <TaskRow key={item.id} title={item.title} meta={`${item.streak} يوم متتابع`} completed={item.completed} colors={colors} onToggle={() => toggleHabit(item.id)} onRemove={() => removeItem(item.id)} />)}
        {((section === 'tasks' && data.tasks.length === 0) || (section === 'goals' && data.goals.length === 0) || (section === 'habits' && data.habits.length === 0)) && <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={section === 'tasks' ? 'inbox' : section === 'goals' ? 'target' : 'repeat'} size={25} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد شيء هنا بعد</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>أضف أول عنصر، وخلي يومك أوضح.</Text></View>}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

function TaskRow({ title, meta, completed, colors, onToggle, onRemove }: { title: string; meta: string; completed: boolean; colors: ReturnType<typeof useColors>; onToggle: () => void; onRemove: () => void }) {
  return <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Pressable testID={`button-toggle-${title}`} onPress={onToggle} style={[styles.check, { borderColor: completed ? colors.secondary : colors.border, backgroundColor: completed ? colors.secondary : 'transparent' }]}><Feather name="check" size={15} color={completed ? colors.secondaryForeground : colors.mutedForeground} /></Pressable>
    <View style={styles.rowText}><Text style={[styles.rowTitle, { color: completed ? colors.mutedForeground : colors.foreground, textDecorationLine: completed ? 'line-through' : 'none' }]}>{title}</Text><Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{meta}</Text></View>
    <Pressable testID={`button-delete-${title}`} onPress={onRemove} hitSlop={8}><Feather name="trash-2" size={16} color={colors.mutedForeground} /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { textAlign: 'right', fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 5 },
  title: { textAlign: 'right', fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  logo: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressCard: { borderRadius: 22, padding: 18, gap: 12 },
  progressHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'right' },
  progressValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'right', opacity: 0.85 },
  segmented: { flexDirection: 'row-reverse', padding: 4, borderRadius: 16, gap: 3 },
  segment: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11 },
  segmentText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  composer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, textAlign: 'right', fontFamily: 'Inter_500Medium', fontSize: 14 },
  addButton: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  spaceRow: { flexDirection: 'row-reverse', gap: 7, flexWrap: 'wrap' },
  spaceChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  spaceText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  list: { gap: 10 },
  row: { minHeight: 70, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  check: { width: 29, height: 29, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, alignItems: 'flex-end', gap: 4 },
  rowTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, textAlign: 'right' },
  rowMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'right' },
  empty: { borderWidth: 1, borderRadius: 20, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
