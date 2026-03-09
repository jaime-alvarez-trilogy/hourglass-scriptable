// FR5: RejectionSheet — bottom sheet modal for rejection reason input

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'

interface Props {
  visible: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
  initialReason?: string
}

export function RejectionSheet({ visible, onConfirm, onCancel, initialReason = 'Not approved' }: Props) {
  const [reason, setReason] = useState(initialReason)
  const inputRef = useRef<TextInput>(null)

  // Pre-fill and auto-focus when sheet opens
  useEffect(() => {
    if (visible) {
      setReason(initialReason)
      // Focus after a brief delay to ensure Modal is fully presented
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [visible, initialReason])

  const isDisabled = reason.trim().length === 0

  function handleConfirm() {
    if (!isDisabled) {
      onConfirm(reason)
    }
  }

  if (!visible) return null

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onCancel} activeOpacity={1} />
      <View style={styles.sheet}>
          <Text style={styles.title}>Rejection Reason</Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter rejection reason"
            multiline
            autoFocus
            returnKeyType="done"
            accessibilityLabel="Rejection reason input"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityLabel="Cancel rejection"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isDisabled && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={isDisabled}
              accessibilityLabel="Confirm rejection"
            >
              <Text style={[styles.confirmText, isDisabled && styles.confirmTextDisabled]}>
                Confirm Reject
              </Text>
            </TouchableOpacity>
          </View>
        </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#111',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#fecaca',
  },
  confirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  confirmTextDisabled: {
    color: '#fff',
    opacity: 0.5,
  },
})
