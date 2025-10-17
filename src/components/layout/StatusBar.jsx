export default function StatusBar({ message, isError, visible }) {
  if (!visible) return null;

  return (
    <div className={`status-bar ${isError ? 'error' : 'success'} ${visible ? 'visible' : ''}`}>
      {message}
    </div>
  );
}