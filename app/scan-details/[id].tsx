import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useScanStore } from '../../store/scan-store';
import { colors } from '@/constants/colors';
import { ArrowLeft, Copy, Trash2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { formatDate } from '../../utils/date-formatter';

export default function ScanDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scans, deleteScan } = useScanStore();
  
  const scan = scans.find(s => s.id === id);
  
  if (!scan) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Scan not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(scan.extractedText);
    alert('Text copied to clipboard!');
  };
  
  const handleDelete = () => {
    deleteScan(scan.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Scan Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: scan.imageUri }} style={styles.image} />
        </View>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.dateText}>{formatDate(scan.createdAt)}</Text>
          
          <View style={styles.textContainer}>
            <Text style={styles.textTitle}>Extracted Text</Text>
            <Text style={styles.extractedText}>{scan.extractedText}</Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.copyButton]} 
              onPress={copyToClipboard}
            >
              <Copy size={20} color="white" />
              <Text style={styles.actionButtonText}>Copy Text</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={handleDelete}
            >
              <Trash2 size={20} color="white" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 12,
  },
  textContainer: {
    marginBottom: 24,
  },
  textTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  extractedText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  copyButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});