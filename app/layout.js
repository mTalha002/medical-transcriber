import './globals.css'; // Next.js standard tailwind injection

export const metadata = {
  title: 'MediScribe AI - Medical Transcription MVP',
  description: 'Cloud deployment proof of concept for medical transcription',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen">{children}</body>
    </html>
  );
}