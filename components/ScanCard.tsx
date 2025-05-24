import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Scan } from "../types/scan";
import { colors } from '@/constants/colors';
import { Copy, Trash2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useScanStore } from '../store/scan-store';
import { formatDate } from '@/utils/date-formatter';

interface ScanCardProps {
  scan: Scan;
  onPress?: () => void;
}

export const ScanCard: React.FC<ScanCardProps> = ({ scan, onPress }) => {
  const { deleteScan } = useScanStore();

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(scan.extractedText);
    alert('Text copied to clipboard!');
  };

  const handleDelete = () => {
    deleteScan(scan.id);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: scan.imageUri }} style={styles.image} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.date}>{formatDate(scan.createdAt)}</Text>
        <Text style={styles.text}>{truncateText(scan.extractedText, 100)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
            <Copy size={18} color={colors.primary} />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Trash2 size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    height: 160,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 16,
  },
  date: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 4,
    color: colors.primary,
  },
});