// src/components/ImagePreviewModal.jsx
import React from 'react';
import { Modal, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';

const ImagePreviewModal = ({ visible, imageUrl, onClose }) => {
  if (!imageUrl) return null;

  const images = [{ url: imageUrl }];

  return (
    <Modal visible={visible} transparent={true} onRequestClose={onClose}>
      <ImageViewer
        imageUrls={images}
        enableSwipeDown
        onSwipeDown={onClose}
        onCancel={onClose}
        backgroundColor="#000"
        renderIndicator={() => null}
        renderHeader={() => (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        )}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  closeText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 24,
  },
});

export default ImagePreviewModal;
