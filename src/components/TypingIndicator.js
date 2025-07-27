const TypingIndicator = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  return (
    <div style={{ color: '#ffc107', padding: '5px', fontWeight: 'bold' }}>
      {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
    </div>
  );
};

export default TypingIndicator;
