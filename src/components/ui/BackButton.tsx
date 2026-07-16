import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from './IconButton';

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <IconButton label="Go back" onClick={() => (to ? navigate(to) : navigate(-1))}>
      <ChevronLeft size={24} />
    </IconButton>
  );
}
