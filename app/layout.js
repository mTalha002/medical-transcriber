export const metadata = {
  title: 'MediScribe AI - Medical Transcription MVP',
  description: 'Cloud deployment proof of concept for medical transcription',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* We inject Tailwind CSS directly to completely bypass webpack compiler checks */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
