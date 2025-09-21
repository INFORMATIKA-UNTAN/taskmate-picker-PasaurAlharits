import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { loadTasks, saveTasks } from '../src/storage/taskStorage';
import { loadCategories, saveCategories } from '../src/storage/categoryStorage';
import { Picker } from '@react-native-picker/picker';
import AddCategoryModal from '../src/components/AddCategoryModal';
import { pickColor } from '../src/constants/categories';
import { PRIORITIES } from '../src/constants/priorities';

export default function Add() {
    const router = useRouter();

    // [UPDATE] state tambahan: kategori & prioritas
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('2025-09-14');

    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState('Umum');
    const [showCatModal, setShowCatModal] = useState(false);

    const [priority, setPriority] = useState('Low');

    // [BARU] Muat kategori dinamis dari storage
    useEffect(() => {
        (async () => setCategories(await loadCategories()))();
    }, []);

    const handleAdd = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Judul wajib diisi!');
            return;
        }

        const tasks = await loadTasks();
        // [UPDATE] simpan category & priority dalam task
        const newTask = {
            id: uuidv4(),
            title,
            description: desc,
            deadline,
            category,
            priority,
            status: 'pending',
        };
        await saveTasks([...tasks, newTask]);

        // [RESET] form
        setTitle('');
        setDesc('');
        setDeadline('2025-09-14');
        setCategory('Umum');
        setPriority('Low');
        router.replace('/');
    };

    // [BARU] terima kategori baru dari modal
    const onSubmitCategory = async ({ key, color }) => {
        if (categories.some(c => c.key.toLowerCase() === key.toLowerCase())) {
            Alert.alert('Info', 'Kategori sudah ada.');
            setShowCatModal(false);
            return;
        }
        const next = [
            ...categories,
            { key, color: color || pickColor(categories.length) },
        ];
        setCategories(next);
        await saveCategories(next);
        setCategory(key); // [UX] pilih otomatis kategori baru
        setShowCatModal(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tambah Tugas</Text>

            <Text style={styles.label}>Judul</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Contoh: Tugas Mobile"
            />

            <Text style={styles.label}>Deskripsi</Text>
            <TextInput
                style={[styles.input, { height: 80 }]}
                value={desc}
                onChangeText={setDesc}
                placeholder="Deskripsi singkat"
                multiline
            />

            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput
                style={styles.input}
                value={deadline}
                onChangeText={setDeadline}
                placeholder="2025-09-14"
            />

            {/* [UPDATE] Picker kategori dinamis + tombol tambah */}
            <Text style={styles.label}>Kategori</Text>
            <View style={styles.pickerWrap}>
                <Picker
                    selectedValue={category}
                    onValueChange={(val) => {
                        if (val === '__ADD__') {
                            setShowCatModal(true);
                            return;
                        }
                        setCategory(val);
                    }}
                >
                    {categories.map(k => (
                        <Picker.Item key={k.key} label={k.key} value={k.key} />
                    ))}
                    {/* [BARU] Shortcut tambah kategori */}
                    <Picker.Item label="＋ Tambah kategori…" value="__ADD__" />
                </Picker>
            </View>

            {/* [UPDATE] Picker prioritas */}
            <Text style={styles.label}>Prioritas</Text>
            <View style={styles.pickerWrap}>
                <Picker selectedValue={priority} onValueChange={setPriority}>
                    {PRIORITIES.map(p => (
                        <Picker.Item key={p} label={p} value={p} />
                    ))}
                </Picker>
            </View>

            {/* [AKSI] Simpan */}
            <Button title="Simpan Tugas" onPress={handleAdd} />

            {/* [BARU] Modal tambah kategori */}
            <AddCategoryModal
                visible={showCatModal}
                onClose={() => setShowCatModal(false)}
                onSubmit={onSubmitCategory}
                suggestedColor={pickColor(categories.length)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    label: { marginTop: 12, fontWeight: '600' },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        padding: 10,
        marginTop: 6,
    },
    pickerWrap: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        marginTop: 6,
        backgroundColor: '#fff',
    },
});
