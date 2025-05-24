import React from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  SafeAreaView, 
  TouchableOpacity,
  Text,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useScanStore } from '@/store/scan-store';
import { ScanCard } from '@/components/ScanCard';
import { colors } from '@/constants/colors';
import { EmptyState } from '@/components/EmptyState';
import { Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';

export default function HistoryScreen() {
  const { scans, setCurrentScan, clearAllScans } = useScanStore();

  const handleScanPress = (scanId: string) => {
    const scan = scans.find(s => s.id === scanId);
    if (scan) {
      setCurrentScan(scan);
      router.push(`/scan-details/${scanId}`);
    }
  };

  const confirmClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all scan history? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          onPress: clearAllScans,
          style: "destructive"
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {scans.length > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Scan History</Text>
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={confirmClearHistory}
            >
              <Trash2 size={18} color={colors.error} />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={scans}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ScanCard 
                scan={item} 
                onPress={() => handleScanPress(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <EmptyState
          title="No Scan History"
          description="Your scanned images and extracted text will appear here."
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  clearButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.error,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});