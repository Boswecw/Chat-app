// src/components/MessageSearch.js - Advanced Message Search
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import useMessageStore from '../stores/messageStore';
import useParticipantStore from '../stores/participantStore';

// =====================================
// SEARCH UTILITIES
// =====================================

const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return [{ text, highlighted: false }];
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => ({
    text: part,
    highlighted: regex.test(part) && part.toLowerCase() === searchTerm.toLowerCase()
  }));
};

const searchMessages = (messages, searchTerm) => {
  if (!searchTerm.trim()) return [];
  
  const term = searchTerm.toLowerCase().trim();
  
  return messages.filter(message => {
    // Search in message text
    if (message.text?.toLowerCase().includes(term)) return true;
    
    // Search in participant name
    if (message.participant?.name?.toLowerCase().includes(term)) return true;
    
    // Search in attachment names (if any)
    if (message.attachments?.some(att => 
      att.name?.toLowerCase().includes(term) || 
      att.filename?.toLowerCase().includes(term)
    )) return true;
    
    return false;
  });
};

// =====================================
// HIGHLIGHTED TEXT COMPONENT
// =====================================

const HighlightedText = ({ text, searchTerm, style, maxLines = null }) => {
  const parts = useMemo(() => highlightText(text, searchTerm), [text, searchTerm]);
  
  return (
    <Text style={style} numberOfLines={maxLines}>
      {parts.map((part, index) => (
        <Text
          key={index}
          style={part.highlighted ? styles.highlightedText : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
};

// =====================================
// SEARCH RESULT ITEM
// =====================================

const SearchResultItem = ({ message, searchTerm, onPress, index }) => {
  const getParticipantName = useParticipantStore(state => state.getParticipantName);
  
  const participantName = getParticipantName(message.participant?.uuid || message.authorUuid);
  const isOwnMessage = (message.participant?.uuid || message.authorUuid) === 'you';
  
  const messageTime = useMemo(() => {
    const time = message.sentAt || message.createdAt;
    if (!time) return '';
    
    const date = new Date(time);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, [message.sentAt, message.createdAt]);

  return (
    <TouchableOpacity
      style={[styles.searchResultItem, index === 0 && styles.firstSearchResult]}
      onPress={() => onPress(message)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultHeader}>
        <Text style={[
          styles.searchResultAuthor,
          isOwnMessage && styles.searchResultAuthorOwn
        ]}>
          {participantName}
        </Text>
        <Text style={styles.searchResultTime}>{messageTime}</Text>
      </View>
      
      <HighlightedText
        text={message.text || 'No text content'}
        searchTerm={searchTerm}
        style={styles.searchResultText}
        maxLines={3}
      />
      
      {message.attachments?.length > 0 && (
        <View style={styles.attachmentIndicator}>
          <Text style={styles.attachmentText}>
            📎 {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
      
      {message.reactions?.length > 0 && (
        <View style={styles.reactionIndicator}>
          <Text style={styles.reactionText}>
            {message.reactions.slice(0, 3).map(r => r.emoji || r.type).join('')}
            {message.reactions.length > 3 && `+${message.reactions.length - 3}`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// =====================================
// SEARCH FILTERS
// =====================================

const SearchFilters = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All', icon: '💬' },
    { id: 'my-messages', label: 'My Messages', icon: '👤' },
    { id: 'with-attachments', label: 'With Files', icon: '📎' },
    { id: 'with-reactions', label: 'With Reactions', icon: '😊' },
  ];

  return (
    <View style={styles.filtersContainer}>
      <FlatList
        data={filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.filtersContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === item.id && styles.filterChipActive
            ]}
            onPress={() => onFilterChange(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterIcon}>{item.icon}</Text>
            <Text style={[
              styles.filterLabel,
              activeFilter === item.id && styles.filterLabelActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// =====================================
// SEARCH SUGGESTIONS
// =====================================

const SearchSuggestions = ({ onSuggestionPress }) => {
  const participants = useParticipantStore(state => state.getAllParticipants());
  
  const suggestions = useMemo(() => [
    { type: 'participant', label: 'Messages from Alice', query: 'Alice' },
    { type: 'participant', label: 'Messages from Bob', query: 'Bob' },
    { type: 'keyword', label: 'Coffee break', query: 'coffee' },
    { type: 'keyword', label: 'Meeting', query: 'meeting' },
    { type: 'keyword', label: 'Project', query: 'project' },
  ], [participants]);

  return (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>Search suggestions</Text>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestionItem}
          onPress={() => onSuggestionPress(suggestion.query)}
          activeOpacity={0.7}
        >
          <Text style={styles.suggestionIcon}>
            {suggestion.type === 'participant' ? '👤' : '🔍'}
          </Text>
          <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// =====================================
// MAIN SEARCH COMPONENT
// =====================================

export const MessageSearch = ({ 
  visible, 
  onClose, 
  onMessageSelect,
  initialSearchTerm = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);
  
  // Get messages from store
  const messages = useMessageStore(state => state.messages);
  
  // Search and filter messages
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    setIsSearching(true);
    
    let results = searchMessages(messages, searchTerm);
    
    // Apply filters
    switch (activeFilter) {
      case 'my-messages':
        results = results.filter(msg => 
          (msg.participant?.uuid || msg.authorUuid) === 'you'
        );
        break;
      case 'with-attachments':
        results = results.filter(msg => 
          msg.attachments && msg.attachments.length > 0
        );
        break;
      case 'with-reactions':
        results = results.filter(msg => 
          msg.reactions && msg.reactions.length > 0
        );
        break;
      default:
        // 'all' - no additional filtering
        break;
    }
    
    // Sort by relevance (exact matches first, then by recency)
    results.sort((a, b) => {
      const aExact = a.text?.toLowerCase() === searchTerm.toLowerCase();
      const bExact = b.text?.toLowerCase() === searchTerm.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Sort by recency
      const aTime = new Date(a.createdAt || a.sentAt).getTime();
      const bTime = new Date(b.createdAt || b.sentAt).getTime();
      return bTime - aTime;
    });
    
    setIsSearching(false);
    return results;
  }, [messages, searchTerm, activeFilter]);

  // =====================================
  // ANIMATION EFFECTS
  // =====================================

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Focus search input after animation
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      });
    } else {
      Keyboard.dismiss();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // =====================================
  // HANDLERS
  // =====================================

  const handleMessagePress = useCallback((message) => {
    Keyboard.dismiss();
    onMessageSelect?.(message);
    onClose();
  }, [onMessageSelect, onClose]);

  const handleSuggestionPress = useCallback((suggestion) => {
    setSearchTerm(suggestion);
    searchInputRef.current?.focus();
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveFilter('all');
    searchInputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    setSearchTerm('');
    setActiveFilter('all');
    onClose();
  }, [onClose]);

  // =====================================
  // RENDER
  // =====================================

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.container,
          {
            opacity,
            transform: [{ translateY }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.searchInputContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search messages..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSearch}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        {searchTerm.length > 0 && (
          <SearchFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}

        {/* Content */}
        <View style={styles.content}>
          {searchTerm.length === 0 ? (
            // Search suggestions
            <SearchSuggestions onSuggestionPress={handleSuggestionPress} />
          ) : (
            // Search results
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {isSearching ? 'Searching...' : `${filteredMessages.length} result${filteredMessages.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              
              <FlatList
                data={filteredMessages}
                keyExtractor={(item) => item.uuid}
                renderItem={({ item, index }) => (
                  <SearchResultItem
                    message={item}
                    searchTerm={searchTerm}
                    onPress={handleMessagePress}
                    index={index}
                  />
                )}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  !isSearching ? (
                    <View style={styles.emptyResults}>
                      <Text style={styles.emptyResultsText}>
                        No messages found for "{searchTerm}"
                      </Text>
                      <Text style={styles.emptyResultsSubtext}>
                        Try different keywords or check your spelling
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333333',
  },
  clearButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#999999',
  },

  // Filters
  filtersContainer: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666666',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },

  // Content
  content: {
    flex: 1,
  },

  // Suggestions
  suggestionsContainer: {
    padding: 20,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  suggestionLabel: {
    fontSize: 16,
    color: '#666666',
  },

  // Results
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },

  // Search Result Item
  searchResultItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  firstSearchResult: {
    borderTopWidth: 0,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchResultAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  searchResultAuthorOwn: {
    color: '#007AFF',
  },
  searchResultTime: {
    fontSize: 12,
    color: '#999999',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  highlightedText: {
    backgroundColor: '#FFE066',
    fontWeight: '600',
  },
  attachmentIndicator: {
    marginTop: 8,
  },
  attachmentText: {
    fontSize: 12,
    color: '#666666',
  },
  reactionIndicator: {
    marginTop: 8,
  },
  reactionText: {
    fontSize: 14,
  },

  // Empty Results
  emptyResults: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyResultsText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyResultsSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MessageSearch;