import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold text-content-faint">404</p>
      <p className="text-content-muted">This screen doesn’t exist.</p>
      <Button onClick={() => navigate('/')}>Back to home</Button>
    </div>
  );
}
