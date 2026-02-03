import ModalDemo from '@/components/shared/ModalDemo';
import { notFound } from 'next/navigation';

export default function TestModalsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="page">
      <ModalDemo />
    </div>
  );
}