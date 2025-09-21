import { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, Text, FlatList, StyleSheet, View, Button } from 'react-native';
import alert from '@/alert';
import TaskItem from '../src/components/TaskItem';
import FilterToolbarFancy from '../src/components/FilterToolbarFancy';
import AddCategoryModal from '../src/components/AddCategoryModal';
import { loadTasks, saveTasks, clearTasks } from '../src/storage/taskStorage';
import { loadCategories, saveCategories } from '../src/storage/categoryStorage';
import { pickColor } from '../src/constants/categories';
import { weightOfPriority } from '../src/constants/priorities';

export default function Home() {
    // [STATE] data
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);

    // [STATE] filter
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'todo' | 'done'
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'Umum' | ...
    const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'Low' | 'Medium' | 'High'

    // [STATE] modal tambah kategori di Home (opsional)
    const [showCatModal, setShowCatModal] = useState(false);

    // [INIT] Muat data tugas & kategori
    useEffect(() => {
        (async () => {
            setTasks(await loadTasks());
            setCategories(await loadCategories());
        })();
    }, []);

    // [AKSI] Toggle status Done/Pending
    const handleToggle = async (task) => {
        const updated = tasks.map(t =>
            t.id === task.id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t
        );
        setTasks(updated);
        await saveTasks(updated);
    };

    // [AKSI] Hapus 1 tugas
    const handleDelete = async (task) => {
        alert('Konfirmasi', 'Hapus tugas ini?', [
            { text: 'Batal' },
            {
                text: 'Ya',
                onPress: async () => {
                    const updated = tasks.filter(t => t.id !== task.id);
                    setTasks(updated);
                    await saveTasks(updated);
                }
            }
        ]);
    };

    // [INFO] Toolbar: Done/Total & Overdue
    const doneCount = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks]);
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const overdueCount = useMemo(
        () => tasks.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length,
        [tasks, today]
    );

    // [AKSI] Clear
    const handleClearDone = () => {
        if (!doneCount) {
            alert('Info', 'Tidak ada tugas Done.');
            return;
        }
        Alert.alert('Hapus Tugas Selesai', `Yakin hapus ${doneCount} tugas selesai?`, [
            { text: 'Batal' },
            {
                text: 'Hapus',
                style: 'destructive',
                onPress: async () => {
                    const kept = tasks.filter(t => t.status !== 'done');
                    setTasks(kept);
                    await saveTasks(kept);
                }
            }
        ]);
    };

    const handleClearAll = () => {
        console.log('Clear All pressed');
        console.log('Isi state tasks saat ini:', tasks);
        console.log('Jumlah tasks:', tasks.length);
        if (!tasks.length) {
            Alert.alert('Info', 'Daftar tugas kosong.');
            return;
        }
        alert('Konfirmasi', 'Hapus semua tugas?', [
            { text: 'Batal' },
            {
                text: 'Ya',
                onPress: async () => {
                    setTasks([]);
                    await clearTasks();
                }
            }
        ]);
    };

    // [FILTER] status + kategori + prioritas
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const byStatus =
                statusFilter === 'all' ||
                (statusFilter === 'todo' ? t.status !== 'done' : t.status === 'done');

            const byCategory = categoryFilter === 'all' || (t.category ?? 'Umum') === categoryFilter;

            const byPriority = priorityFilter === 'all' || (t.priority ?? 'Low') === priorityFilter;

            return byStatus && byCategory && byPriority;
        });
    }, [tasks, statusFilter, categoryFilter, priorityFilter]);

    // [SORT] prioritas High→Low, lalu deadline terdekat
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            const wa = weightOfPriority(a.priority ?? 'Low');
            const wb = weightOfPriority(b.priority ?? 'Low');
            if (wa !== wb) return wb - wa; // prioritas tinggi dulu
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });
    }, [filteredTasks]);

    // [OPSIONAL] Tambah kategori dari Home
    const handleSubmitCategory = async (cat) => {
        if (categories.some(c => c.key.toLowerCase() === cat.key.toLowerCase())) {
            alert('Info', 'Nama kategori sudah ada.');
            setShowCatModal(false);
            return;
        }
        const color = cat.color || pickColor(categories.length);
        const next = [...categories, { key: cat.key, color }];
        setCategories(next);
        await saveCategories(next);
        setCategoryFilter(cat.key);
        setShowCatModal(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>TaskMate – Daftar Tugas</Text>

            {/* [UPDATE] Toolbar filter fancy */}
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
                <FilterToolbarFancy
                    categories={categories}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    priorityFilter={priorityFilter}
                    setPriorityFilter={setPriorityFilter}
                />

                {/* [INFO] Toolbar ringkasan */}
                <View style={styles.toolbar}>
                    <Text style={styles.toolbarText}>Done: {doneCount} / {tasks.length}</Text>
                    <Text style={[styles.toolbarText, { color: overdueCount ? '#dc2626' : '#334155' }]}>
                        Overdue: {overdueCount}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Button title="Clear Done" onPress={handleClearDone} disabled={!doneCount} />
                        <Button title="Clear All" onPress={handleClearAll} />
                    </View>
                </View>
            </View>

            {/* [LIST] Tugas tersortir */}
            <FlatList
                data={sortedTasks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <TaskItem
                        task={item}
                        categories={categories}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                    />
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Tidak ada tugas</Text>}
            />

            {/* [OPSIONAL] Modal tambah kategori dari Home */}
            <AddCategoryModal
                visible={showCatModal}
                onClose={() => setShowCatModal(false)}
                onSubmit={handleSubmitCategory}
                suggestedColor={pickColor(categories.length)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { fontSize: 20, fontWeight: '700', padding: 16 },
    toolbar: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6
    },
    toolbarText: { fontWeight: '600', color: '#334155' },
});
