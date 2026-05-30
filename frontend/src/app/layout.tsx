import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DBT Online — Juego de Cartas',
  description: 'Jugá con amigos en sala, por turnos.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
