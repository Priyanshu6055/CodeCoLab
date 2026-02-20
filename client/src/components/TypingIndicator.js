const TypingIndicator = ({ typingUsers, currentUser }) => {
  const othersTyping = typingUsers.filter((name) => name !== currentUser);
  if (othersTyping.length === 0) return null;

  return (
    <div style={{ color: '#ffc107', padding: '6px 16px', fontWeight: 'bold' }}>
      {othersTyping.join(', ')} {othersTyping.length > 1 ? 'are' : 'is'} typing...
    </div>
  );
};

export default TypingIndicator;
